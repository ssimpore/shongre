# Performance, caching, and scalability

## Scope and source of truth

`packages/contracts/src/operational-performance.ts` is the typed source for
launch SLOs, performance budgets, cache defaults, request timeouts, retry
timing, and bounded discovery/load-test defaults. Backend environment overrides
are parsed once by `backend/src/app/config/index.ts`; Web consumers import the
same contract. A timeout, TTL, pool threshold, or bundle budget must not be
redeclared in a component, repository, adapter, workflow, or deployment file.

The values are launch objectives, not claims about production capacity. They
must be recalibrated after 30 days of representative production traffic without
weakening the error budget to hide a regression.

## Service objectives and budgets

| Signal                         |                                   Launch objective |
| ------------------------------ | -------------------------------------------------: |
| Successful API availability    |           99.9% monthly, excluding intentional 4xx |
| API latency                    | p95 < 750 ms; p99 < 2,000 ms for non-upload routes |
| Database interactive query     |          p95 < 100 ms; slow-query threshold 250 ms |
| LCP / INP / CLS / TTFB         |                 ≤ 2,500 ms / 200 ms / 0.1 / 800 ms |
| Anonymous CDN cache hit ratio  |    discovery ≥ 40%; catalog ≥ 70%; reference ≥ 80% |
| Cache invalidation propagation |                                    p95 < 5 seconds |
| Payment webhook acceptance     | 99.9% within 30 seconds; none older than 5 minutes |
| Database recovery              |                     RPO ≤ 5 minutes; RTO < 2 hours |
| Object recovery                |                                      RTO < 4 hours |

`frontend/scripts/check-client-bundle-budget.mjs` enforces executable and
generated-taxonomy budgets independently. `scripts/load-smoke.mjs` enforces
hosted success/latency and conditional-cache behavior. Browser Web Vitals are
recorded only through the consent-gated analytics boundary.

## Request and cache flow

```text
browser
  -> immutable Next build assets / bounded public brand assets
  -> Cloudflare cache (Host + URL + market + locale variation)
  -> Next server or backend API
  -> anonymous public-response registry
       -> ETag + versioned Cache-Tag + SWR/SIE
       -> public projection service
       -> repository (explicit projection + bounded page)
       -> PostgreSQL/Supabase
```

The backend registry in
`backend/src/infrastructure/http/public-response-policy.ts` is deny-by-default.
Only explicitly listed public GET projections may be shared. Any request with a
Cookie or Authorization header, all principal/permission-dependent reads, all
writes, all errors, and all unregistered routes return `private, no-store`.
Public cache variation includes origin, market, locale, and content encoding.
No identity, organization, role, subscription, balance, verification, message,
payment, or moderation response is eligible for shared caching.

Profiles are deliberately bounded:

- discovery: 15 seconds shared, 30 seconds SWR, 120 seconds stale-if-error;
- catalog: 5 minutes shared, 10 minutes SWR, 1 hour stale-if-error;
- reference: 1 hour shared, 24 hours SWR/stale-if-error.

All may be overridden through the validated `PUBLIC_CACHE_*` variables. Bump
`PUBLIC_CACHE_KEY_VERSION` for an emergency logical flush. Anonymous responses
emit `Cache-Tag`; cache-affecting writes emit the same tag namespace through the
`public_cache_invalidation_requested` structured event and the
`X-Shongre-Cache-Invalidate` response header. The deployed edge must consume
that event with its protected purge credential and meet the five-second
invalidation SLO. Until that adapter is evidenced, the short discovery TTL is
the consistency bound; do not add an API token to application source or a
public environment variable.

Public taxonomy projections (`/taxonomy/v1/*`: root, nodes, search filters,
header navigation, tree, options, resolve) form a second, revalidate-only
class. They are the largest anonymous reads and change only on an editorial
publish, but no shared cache may hold them until the purge adapter exists, so
anonymous responses carry `Cache-Control: private, no-cache`,
`CDN-Cache-Control: no-store`, an `ETag` and the market/locale `Vary`. Every
request still reaches the origin; a reader whose browser holds the current
revision receives 304 and downloads nothing, and the first request after a
publish is answered with the new revision because the validator no longer
matches (`make taxonomy-db-test` proves this against the local database).
Discovery, listings and the home composition stay `private, no-store`.

The Web relay (`frontend/src/platform/api/web-api-proxy.ts`) is one reader's
hop, never a shared cache: it narrows whatever the backend declared to that
reader's own cache. A validator-only policy passes through unchanged, a shared
profile keeps only its browser lifetime (`private, max-age=N`, or
`private, no-cache` when the browser lifetime is zero), `Vary` is forwarded
with it, and everything else stays `private, no-store`. `scripts/load-smoke.mjs`
verifies both classes on the deployed edge — a registered reference projection
must answer with the shared profile and 304, and header navigation with
`private, no-cache` and 304.

The commercial catalogue cache is a separate market-only resilience cache. It
coalesces concurrent misses, applies deterministic ±10% TTL jitter, invalidates
after publication/activation, and serves a same-market last valid value only
inside the configured five-minute stale-if-error window. It never caches
quotes, entitlements, eligibility, subscriptions, permissions, or balances.

Redis is the canonical BullMQ transport and cross-replica realtime fan-out. It
is not an authoritative business store and is not yet a general response cache.
Introduce shared response/catalog caching only after at least two API replicas
show repeated origin/database work that the CDN and request coalescing cannot
absorb, or measured invalidation cannot meet the SLO. Cache keys must begin with
the configured cache-key version and include every applicable market, locale,
tenant, organization, principal/role, and permission version. Use single-flight
locking with a bounded lease; losing Redis may pause queue wakeups/realtime and
readiness, but must not erase an accepted domain mutation.

Server-rendered listing, category, search, employment, automotive, education,
and real-estate data resolve through the same lazy service registry as their
clients. In API mode, generic listing discovery uses the canonical GET search
contract and listing detail consumes the public seller projection already
embedded in `PublicListing`; it neither imports a demo seller nor performs an
N+1 seller fetch. Seller-profile, collection, and sitemap inventory still have
frontend-repository dependencies because the public API does not yet expose a
slug-safe seller projection or cursor-based sitemap feed. That remaining gap is
a production indexing release blocker: add those contracts, migrate every
consumer, then remove the repository imports before enabling large-scale
indexing. Do not substitute unbounded per-record API calls.

## Database path and query evidence

The hot search path starts from active, approved market publications, selects a
narrow indexed candidate projection, applies bounded ranking and diversity,
then hydrates only the final page with public seller/media/publication data. It
orders by stable publication/ranking fields and uses an opaque filter-bound
keyset cursor with a fixed snapshot timestamp, so new publications cannot
duplicate or skip rows within an active traversal. The response reports
`totalRelation: lower_bound` when the bounded candidate window cannot establish
an exact total; it never runs an unbounded exact count for high-cardinality
searches. Filters, snapshot, cursor, page size, and stable tiebreakers are part
of one canonical query contract.

Anonymous searches prefer cacheable `GET /api/v1/listings/search`; normalized
query parameters make equivalent filters share a cache key. POST remains a
private, no-store compatibility fallback for requests whose encoded attributes
would exceed the bounded GET URL. Conditional GETs use stable entity tags that
exclude request IDs and cursor issuance timestamps while retaining the actual
result/page state. Any Cookie or Authorization header continues to force
private, no-store behavior.

`make performance-db-plan PERFORMANCE_DATABASE_URL=postgres` creates 250,000
deterministic rows in transaction-local temporary tables, runs `ANALYZE` and
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, verifies index use and rolls back.
It refuses credentials, non-loopback targets, production, and datasets outside
100,000–2,000,000 rows. On the 2026-09-07 development workstation, the current
250,000-row candidate plan returned 50 rows in 0.168 ms after 2.460 ms planning
and used the market-discovery index with bounded incremental sort/nested-loop
index scans. These figures prove the local query shape and 100 ms gate, not
hosted capacity. A production release still requires a plan captured on staging
with production-like statistics, RLS, pool pressure, and storage latency.

Existing migrations already provide full-text/GIN, organic freshness,
market-publication discovery/price, publisher, foreign-key, and partial indexes.
No new index was added because the measured query now uses the existing one.
Add indexes only from a captured slow query and validate write amplification,
size, selectivity, and the before/after plan. Large-table indexes must use the
protected online-migration procedure, lock/statement timeouts, and an
expand-first release; application rollback never reverses schema.

The repository-wide audit also found legacy broad selections in non-hot domain
repositories. They are intentionally retained until each owning transport or
domain projection is specified and a representative trace shows the columns
actually consumed; a mechanical removal would risk silently dropping fields
from payments, moderation, reporting, or internal operations. No new broad
selection is permitted on a public or high-volume path. Migrate each measured
path contract-first, prove all consumers against the narrower projection, and
then remove the broad selection in the same change.

Supabase REST is the application database boundary, so the deployment's
Supavisor pool owns PostgreSQL connection limits. Use transaction mode for
stateless API/worker traffic, reserve direct/session connections for migrations
and operations, cap each workload so API + worker + migration + observability
remain below 80% of the database connection limit, and alert before saturation.

## Asynchronous work and backpressure

Email, notifications, provider webhooks, media scanning/cleanup, analytics,
search indexing, CRM/marketing work, and lifecycle expiry use BullMQ for
scheduled execution and prompt domain wakeups while durable PostgreSQL
queues/outboxes, worker leases, attempts, and dead letters remain authoritative.
Search requests append privacy-safe discovery events to
`discovery_search_event_outbox`; a BullMQ-scheduled processor leases bounded
batches with `SKIP LOCKED`, writes the analytics projection idempotently,
retries with backoff, and dead-letters after the configured attempt limit.
Request latency does not depend on analytics persistence. Do not move these
paths back to request timers or process memory. Scale independent worker
replicas by BullMQ age/depth, database backlog age, and provider quotas—not CPU
alone.

## Latest connected local evidence

The 2026-09-07 comparison used a production Next build connected to the local
database-mode backend and repository-owned Supabase through the API-only Web
client. It is regression evidence only:

- executable JavaScript fell from 437.3 KiB to 345.8 KiB gzip and from 1,656.8
  KiB to 1,263.1 KiB raw; the largest gzip chunk fell from 100.1 KiB to 84.3
  KiB and generated taxonomy remained absent from the initial bundle;
- cold desktop LCP across home, search, listing detail, Auto, Immo, Emploi, and
  Education ranged from 792–1,448 ms; cold mobile LCP ranged from 732–1,752 ms;
- cold CLS after reserving shell, gallery, card, and filter-rail geometry ranged
  from 0–0.003; cold TTFB ranged from 11–120 ms on desktop and 8–154 ms on
  mobile;
- connected GET search load at concurrency six measured p50 81.66 ms, p95
  287.08 ms, and p99 319.00 ms; the POST compatibility path measured p50
  78.60 ms, p95 100.97 ms, and p99 104.60 ms;
- repository search timings from the same connected run measured p50 14 ms,
  p95 27 ms, and p99 75 ms. Anonymous GET search returned the discovery cache
  policy/tags and a conditional request returned 304; credentialed GET and POST
  remained private/no-store.

Local Supabase Storage serves the original fixture images, so local image egress
remains intentionally visible: for example, desktop search transferred about
3.54 MB of images. That is not a CDN/image-optimization pass. Exact staging must
verify the configured responsive image transformer, content negotiation,
immutable media caching, CDN hit ratio, origin bytes, and visual quality before
release. Lab total blocking time is not field INP; the INP objective requires
staging or production RUM.

The 2026-09-17 pass measured the same production build on an emulated iPhone
13 with 4× CPU slowdown and a 4G network profile, which is where the earlier
desktop-only numbers had hidden three structural costs:

- listing detail mounted its MapLibre location map on page load: 4.4 MB of
  JavaScript, 1.4 s of main-thread blocking and a 0.26 layout shift per view.
  Map slots now mount through `DeferUntilVisible`, so the renderer, its worker
  and the first tiles load only when the slot is on screen (1.8 MB, 131 ms,
  0.00); the property results page below `xl` no longer fetches its hidden
  map either;
- the homepage document was a loading shell with no H1 and ten client fetches.
  It now server-renders the market-wide composition and the hero rail's eight
  cards (49.6 KiB gzip against a former 16 KiB shell plus 38.5 KiB of client
  fetches), so the headline paints at first contentful paint;
- server-rendered pages lost their HTML after hydration: page chunks were
  discovered by `React.lazy` only during hydration, and the first provider
  restoration that reached the still-dehydrated boundary made React paint the
  route fallback until the chunk arrived (0.96 CLS on the seller profile,
  0.26–0.52 on listing detail). Route and section chunks now load through
  `next/dynamic`, which preloads them from the document, and restoration
  updates run as transitions; both pages measure 0.00 across repeated runs.

The MapLibre worker pair is served immutable under a version-named path, and
the hero artwork is served only from the `sm` breakpoint, where it is visible.
The remaining phone-side cost is image weight: `/recherche` still downloads
about 1.3 MB of card originals and the homepage about 3.7 MB, because the
storage image transformer is not provisioned locally; that is the
`PUBLIC_MEDIA_IMAGE_TRANSFORM=supabase_render` prerequisite above, not a code
change. `make image-transform-check` proves a project's transformer before the
flag is set (see the release runbook), and the production gate refuses the flag
without that evidence. Lab LCP on the throttled phone is otherwise bounded by
hydration of the 955 KiB raw shell, after which the consent region paints.

## Observability and scaling triggers

HTTP completion logs include request ID, operation ID, a route template (never
a token-bearing path or query string), status, duration, cache policy, cache-tag count, encoding, and response
bytes. The listing repository emits privacy-safe query duration, result/count,
market, page, limit, and sort dimensions. Catalogue access emits fresh-hit,
miss, refresh, coalesced, and bounded-stale outcomes. Dashboards must show API
p50/p95/p99, 5xx/error-budget burn, database/query latency, connection
saturation, cache hit/age/invalidation, queue depth/oldest age/retries/dead
letters, Web Vitals, bundle bytes, CPU, memory, and object-storage egress.

Investigate and scale when any of these persist for 15 minutes (or page sooner
for the existing critical alerts): database p95 > 100 ms, connections > 80%,
API p95 > 750 ms, catalog/reference hit ratios below target, payment work older
than five minutes, or worker oldest-age growth across two intervals. Read
replicas are justified only for measured read saturation after query/index and
cache work; dedicated search is justified only when Postgres full-text/geo
plans breach SLO at representative scale; materialized views require an owned
refresh/invalidation contract.

## Verification and rollout

Run:

```bash
make performance-check
APP_ENV=local PERFORMANCE_DATABASE_URL=postgres make performance-db-plan
make performance-smoke # against the exact staging release, with required env
make observability-evidence
make check
make check-all
```

Roll out cache policy first in staging, compare uncached, fresh, revalidated,
and stale-if-error paths, then canary one API replica. A rollback restores the
previous immutable application digest. Cache rollback is a
`PUBLIC_CACHE_KEY_VERSION` bump plus a tag purge; it never requires deleting
customer data. Preserve old and new schema compatibility throughout deployment.
Run backup/object restore evidence before production and retain the exact
release SHA, query plans, load evidence, dashboard links, and alert receipt.

The repository cannot certify production capacity without hosted production-
like data, Supabase pool metrics, CDN purge credentials, and a staging traffic
run. Those are release evidence, not values to fabricate in source control.
