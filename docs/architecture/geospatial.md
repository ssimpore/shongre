# Geospatial: maps, geocoding and location privacy

## Outcome

One geospatial architecture, one authoritative location per listing, and one
place where a provider is chosen.

| Concern                    | Owner                                                         |
| -------------------------- | ------------------------------------------------------------- |
| Rendering                  | MapLibre GL JS (Web), MapLibre React Native (planned, mobile) |
| Basemap style and tiles    | OpenFreeMap, named by `MAP_STYLE_URL`                         |
| Geographic data            | OpenStreetMap, through OpenFreeMap and the geocoder           |
| Address resolution         | A Nominatim-compatible endpoint, server-side only             |
| Stored location and search | PostgreSQL with PostGIS                                       |

A map renderer and an OSM data source do **not** come with unrestricted
production geocoding. MapLibre draws; OpenFreeMap serves tiles; neither resolves
an address. Geocoding is a separate, rate-limited, revocable dependency and is
configured, cached and metered as one.

## Module boundaries

```text
packages/contracts/src/schemas/geospatial.ts    one vocabulary, all platforms
        |
        v
backend/src/modules/geo/
  geo.config.ts        typed configuration, public/server split, SSRF guard
  geo.contracts.ts     MapTileProvider, GeocodingProvider, LocationRepository,
                       GeospatialSearchService
  geo.privacy.ts       deterministic displacement, public projection
  geo.address.ts       normalization and cache keys
  geocoding.service.ts cache, in-flight dedup, rate limit, bounded retry
  providers/           OpenFreeMap tiles, Nominatim geocoding
  api/geo.routes.ts    GET /geo/map-config, /geo/address-suggestions, /geo/reverse
        |
        v
frontend/src/design-system/primitives/map/       MapContainer, map-layers,
                                                 AddressAutocomplete
```

Nothing above the provider interfaces names OpenFreeMap or Nominatim. Replacing
either is an adapter plus an environment value.

## Environment

All three clients read the **same** variable names. There is deliberately no
`NEXT_PUBLIC_` or `EXPO_PUBLIC_` copy: one set of names is what stops the Web
client, the native client and the API drifting onto different providers, which
is the state this configuration replaced.

| Variable                                                                 | Purpose                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `MAP_PROVIDER`                                                           | `openfreemap`                                                  |
| `MAP_STYLE_URL`                                                          | MapLibre style document. Defaults to OpenFreeMap's Liberty.    |
| `MAP_ATTRIBUTION`                                                        | Licence condition, not a caption. Defaults with the style.     |
| `MAP_TILE_ORIGINS`                                                       | Extra origins for the CSP when a style splits its sources.     |
| `MAP_DEFAULT_LATITUDE/LONGITUDE`                                         | Opening view before a market narrows it.                       |
| `MAP_DEFAULT_ZOOM`, `MAP_MIN_ZOOM`, `MAP_MAX_ZOOM`                       | Zoom envelope.                                                 |
| `GEOCODING_PROVIDER`                                                     | `nominatim` or `disabled`. Hosted profiles default to off.     |
| `GEOCODING_BASE_URL`                                                     | Nominatim-compatible origin. Validated: https, no credentials. |
| `GEOCODING_USER_AGENT`, `GEOCODING_CONTACT_EMAIL`                        | Operator identity the provider's policy requires.              |
| `GEOCODING_RATE_LIMIT`                                                   | Upstream requests per minute, platform-wide.                   |
| `GEOCODING_CACHE_TTL`                                                    | Seconds. An address does not move, so this is long.            |
| `GEOCODING_TIMEOUT_MS`, `GEOCODING_MAX_RETRIES`, `GEOCODING_MAX_RESULTS` | Request bounds.                                                |
| `LOCATION_PRIVACY_RADIUS_METERS`                                         | How far a public approximate point may sit from the real one.  |
| `LOCATION_DEFAULT_PUBLIC_PRECISION`                                      | Never `exact`; `env-check.sh` refuses it.                      |
| `LOCATION_SEARCH_MAX_RADIUS_KM`                                          | Largest radius a "near me" search may request.                 |

`scripts/env-check.sh` enforces three rules in staging and production:

1. `MAP_STYLE_URL` must not point at OpenStreetMap's donated tile servers.
2. `GEOCODING_BASE_URL` must not point at the public Nominatim instance.
3. An enabled geocoder must carry `GEOCODING_CONTACT_EMAIL`.

It does **not** require a style to be named. OpenFreeMap serves vector tiles
from a CDN without a key and its terms permit a shipped product, so a hosted
environment that has not overridden the default is correctly configured — which
is the difference from the raster endpoint this replaced.

## Database

`public.listings` carries the canonical location. Migration
`00132_listing_geospatial_location.sql`:

- `geographic_point extensions.geography(POINT, 4326)` — **authoritative** for
  every spatial filter, distance and sort.
- `latitude` / `longitude` remain because the public API and both clients read
  them; a trigger keeps the two representations in step in both directions, so
  no caller can leave them disagreeing.
- `administrative_area`, `normalized_address`, `location_precision`,
  `location_source`, `geocoding_provider`, `geocoded_at`, `location_updated_at`.
- Constraints: coordinate ranges, ISO country format, precision and source
  enums, and a check that the point agrees with the pair to within ~55 m.
- Indexes: GiST on the point, a partial GiST for published rows, `(country,
city)`, `postal_code`, and a partial index on rows still missing a point.
- `search_listing_ids_spatial(...)` filters with `ST_DWithin` and
  `ST_MakeEnvelope` and returns identifiers plus distances. `ST_DWithin` is the
  index-using form; `ST_Distance(...) < x` is not and degrades to a scan.

`real_estate_properties` already had this shape and is unchanged; the generic
table now matches it.

### Verified plan

```sql
EXPLAIN SELECT id FROM public.listings
 WHERE market_code = 'FR' AND status = 'published' AND geographic_point IS NOT NULL
   AND extensions.ST_DWithin(geographic_point, …, 25000);

Index Scan using listings_market_published_point_idx on listings
  Index Cond: (geographic_point && _st_expand(…, 25000))
```

## Privacy

`location_precision` decides what a public reader receives, and it defaults to
`approximate` in the database.

| Precision     | Published                           |
| ------------- | ----------------------------------- |
| `exact`       | the stored point, verbatim          |
| `approximate` | a deterministically displaced point |
| `city`        | an administrative centroid          |
| `postal_code` | an administrative centroid          |
| `hidden`      | no coordinate at all                |

The displacement is derived by HMAC from the listing's identity and a
server-held key. This is the load-bearing detail: a _randomly_ displaced point
leaks the true one anyway, because two requests give two samples around the same
centre and a few hundred give the centre to within metres. A deterministic
offset means repeated reads return one point, and the true coordinate never
leaves the row.

`toPublicListing` destructures the private location columns out of its rest
spread explicitly. Without that, any column added to `listings` becomes a public
field by default — which is how the seller's real coordinate would have shipped
the moment geocoding started writing one.

## Backfill

`make geo-backfill` resolves a coordinate for listings that have none, so
spatial search can find them. Its purpose is narrower than it looks: the public
projection already resolves a town to a coordinate at render time, so a listing
without a stored point still _shows_ on a map. What it cannot do is be _found_ —
`ST_DWithin` filters on a column, and a null one is invisible to every radius
and viewport search.

```bash
make geo-backfill ARGS="--limit=500 --dry-run"        # report without writing
make geo-backfill ARGS="--limit=2000 --market=FR"     # a bounded real pass
make geo-backfill ARGS="--retry-after-days=0"         # retry earlier refusals now
```

| Property   | How                                                                         |
| ---------- | --------------------------------------------------------------------------- |
| Resumable  | Selects only rows that still have no point; there is no cursor to lose      |
| Idempotent | A resolved row is not in the next selection; a re-run reports `attempted=0` |
| Bounded    | Every run takes a `--limit`, and a batch yielding no new work ends the loop |
| Paced      | `--interval-ms` defaults to 1000, independent of the interactive rate limit |
| Honest     | Never invents a coordinate; every refusal is counted by reason and reported |

It **refuses the public Nominatim instance in every environment**, not only
hosted ones. The interactive path may use it on a laptop; bulk use is the thing
that endpoint's policy names and forbids.

It asks a town-level question — postcode and city, never a private address — so
it records `city` or `postal_code` precision and never anything finer, whatever
the provider claims. `geocoded_at` marks the _attempt_, so a row the provider
declined is not asked about again until `--retry-after-days` has passed.

Only this command sets `city`/`postal_code` precision, and only for a centroid
it received. That is what lets the public projection publish those points
unchanged instead of displacing them: a path that wrote a seller's real position
leaves the row at its `approximate` default and is displaced.

## Geocoding

Server-side only. A browser that could reach the provider directly would bypass
the cache, the rate limit and the market restriction in one step, and would put
the operator's contact identity in every visitor's network tab.

Between a keystroke and an upstream request: a minimum length, a debounce, a
sequence guard that discards a reply that arrived after a newer one, an
in-flight deduplication so concurrent identical queries are one request, a
platform-wide rate limit, a long-lived cache, and a bounded retry.

Results outside the resolved market country are **discarded**, not ranked down:
a postcode is only unique inside a country, so a provider that ignores the
country hint must not be able to widen the market.

### The budget is shared, not per process

The rate limit belongs to the _provider_, so it is held in Redis as a token
bucket that every instance and the backfill draw from. An in-process counter
enforces the configured rate per instance, which means the number chosen to stay
inside someone else's usage policy stops describing reality the moment the
deployment scales — that is not a throughput problem, it is how a free geocoder
revokes access.

A bucket rather than a fixed window, because a window admits twice the rate
across its boundary: a full allowance at the end of one minute and another at
the start of the next, back to back.

If Redis is unreachable the limiter **refuses**, it does not fall back to
counting alone — that fallback is the unmetered state the class exists to
remove, and it would arrive exactly when nothing is watching. Address search
degrades to typing a town by hand, which the client already handles.

`make geo-rate-limit-test` proves the property a stand-in cannot: forty
concurrent acquires across eight instances sharing a five-token budget grant
exactly five. The test profile keeps an in-process counter because the unit and
contract suites run without infrastructure; it is a test double, not a fallback.

Known limitation: the generated transport has no `AbortSignal`, so an obsolete
autocomplete request is not cancelled on the wire — it is debounced before it is
sent and its response is discarded by sequence. Upstream cost is absorbed by the
cache and the deduplication rather than by cancellation.

## Web rendering

`MapContainer` owns the MapLibre lifecycle once. Five surfaces previously
carried their own copy and had drifted: two disabled the attribution control,
removing a credit that is a condition of the licence.

Three integration details that are not obvious and are load-bearing:

1. **CSP.** MapLibre fetches its style, glyphs and vector tiles with `fetch`,
   which `connect-src` governs — not `img-src`. Without the tile origin there,
   the map still _appears_: interactive, with raster fallback tiles painted,
   and not one vector tile. `proxy.ts` derives the origin from `MAP_STYLE_URL`.
2. **The worker.** MapLibre resolves its own worker from `import.meta.url`,
   which webpack replaces at build time with a path on the build machine — a
   `file:` URL the browser cannot fetch. `frontend/scripts/sync-map-worker.mjs`
   copies the worker _and its shared runtime_ into `public/vendor/` on every
   build, and `MapContainer` points `setWorkerUrl` at that same-origin path.
3. **Readiness.** `load` waits for the first visually complete render, which
   never arrives if the container spends a frame at zero height — which is what
   a map inside a lazily mounted panel does. `isStyleLoaded()` is stricter
   still. Readiness is the first `styledata`, which is what `addSource` and
   `addLayer` actually require.

Every map surface is reached through `React.lazy`, so MapLibre stays out of the
initial bundle: 139 KiB gzip in its own chunk, initial client JavaScript
unchanged at 244 KiB gzip.

## Replacing a provider

- **Basemap**: set `MAP_STYLE_URL` (and `MAP_TILE_ORIGINS` if the style's
  sources live elsewhere) and `MAP_ATTRIBUTION`. No code change.
- **Geocoder**: point `GEOCODING_BASE_URL` at any Nominatim-compatible service.
  For a different API shape, add an adapter beside
  `providers/nominatim.geocoding-provider.ts` implementing `GeocodingProvider`
  and `ReverseGeocodingProvider`, and extend `GEOCODING_PROVIDERS`.

## Attribution

OpenStreetMap's licence requires the credit to stay visible and readable.
`MapContainer` never passes `attributionControl: false`, and
`MapContainer.test.ts` fails the build if any file in the tree does.
