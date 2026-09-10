import {
  type GeocodingConfidence,
  type GeocodingResult,
  type LocationPrecision,
} from "@shongre/contracts/geospatial";
import type { GeoGeocodingConfig } from "../geo.config.js";
import type {
  GeocodingProvider,
  GeocodingQuery,
  ReverseGeocodingProvider,
  ReverseGeocodingQuery,
} from "../geo.contracts.js";
import { normalizeAddressLine } from "../geo.address.js";

/**
 * A Nominatim-compatible OpenStreetMap geocoder.
 *
 * "Compatible" is the operative word. The public `nominatim.openstreetmap.org`
 * is fine for a developer's machine and explicitly not fine for a product: its
 * usage policy caps an application at one request per second, forbids bulk use,
 * and requires an identifying User-Agent with a contact. The endpoint is
 * therefore configuration — the same adapter talks to a self-hosted or managed
 * Nominatim without a code change — and the identifying headers are sent on
 * every request rather than left to the operator to remember.
 *
 * Attribution is copied onto each result for the same reason it is returned by
 * the tile provider: it is a licence condition on the data, and data outlives
 * the component that fetched it.
 */

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
  importance?: number;
  addresstype?: string;
  type?: string;
  class?: string;
  address?: {
    country_code?: string;
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
  };
}

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

/**
 * What kind of place a hit is, in the platform's own vocabulary.
 *
 * Nominatim's `addresstype` is an OSM tag, not a precision, so the mapping is
 * deliberately conservative: anything that is not clearly a building or a
 * street is treated as no finer than the town it sits in. Over-claiming
 * precision here would put a village centroid on a listing as a doorstep.
 */
function precisionFor(place: NominatimPlace): LocationPrecision {
  const kind = place.addresstype ?? place.type ?? "";
  if (["building", "house", "residential", "address"].includes(kind)) {
    return "exact";
  }
  if (["road", "street", "pedestrian", "footway"].includes(kind)) {
    return "approximate";
  }
  if (["postcode"].includes(kind)) return "postal_code";
  return "city";
}

function confidenceFor(place: NominatimPlace): GeocodingConfidence {
  const importance =
    typeof place.importance === "number" ? place.importance : 0;
  if (importance >= 0.5) return "high";
  if (importance >= 0.25) return "medium";
  return "low";
}

function toResult(
  place: NominatimPlace,
  provider: string,
): GeocodingResult | null {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  const countryCode = place.address?.country_code?.toUpperCase();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  // Without a country the result cannot be market-restricted, and an
  // unrestricted result is one this platform is not allowed to use.
  if (!countryCode || countryCode.length !== 2) return null;

  const address = place.address ?? {};
  return {
    coordinate: { latitude, longitude },
    countryCode,
    administrativeArea: address.state,
    departmentOrRegion: address.county,
    city:
      address.city ?? address.town ?? address.village ?? address.municipality,
    postalCode: address.postcode,
    normalizedAddress: place.display_name
      ? normalizeAddressLine(place.display_name)
      : undefined,
    precision: precisionFor(place),
    confidence: confidenceFor(place),
    attribution: OSM_ATTRIBUTION,
    provider,
  };
}

export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export class NominatimGeocodingProvider
  implements GeocodingProvider, ReverseGeocodingProvider
{
  readonly id = "nominatim";

  constructor(
    private readonly config: GeoGeocodingConfig,
    private readonly fetchImpl: FetchLike = globalThis.fetch as FetchLike,
  ) {}

  async forward(query: GeocodingQuery): Promise<GeocodingResult[]> {
    const url = new URL("/search", this.config.baseUrl);
    url.searchParams.set("q", query.query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set(
      "limit",
      String(Math.min(query.limit ?? this.config.maxResults, 20)),
    );
    // Asking the provider to restrict is a courtesy that saves it work; the
    // service still discards out-of-country results, because a provider that
    // ignores the hint must not be able to widen the market.
    url.searchParams.set("countrycodes", query.countryCode.toLowerCase());
    if (query.locale) url.searchParams.set("accept-language", query.locale);

    const payload = await this.request(url, query.signal);
    if (!Array.isArray(payload)) return [];
    return payload
      .map((place) => toResult(place as NominatimPlace, this.id))
      .filter((result): result is GeocodingResult => result !== null);
  }

  async reverse(query: ReverseGeocodingQuery): Promise<GeocodingResult | null> {
    const url = new URL("/reverse", this.config.baseUrl);
    url.searchParams.set("lat", String(query.coordinate.latitude));
    url.searchParams.set("lon", String(query.coordinate.longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    if (query.locale) url.searchParams.set("accept-language", query.locale);

    const payload = await this.request(url, query.signal);
    if (!payload || typeof payload !== "object") return null;
    const result = toResult(payload as NominatimPlace, this.id);
    if (!result) return null;
    if (
      query.countryCode &&
      result.countryCode !== query.countryCode.toUpperCase()
    ) {
      return null;
    }
    return result;
  }

  /**
   * One request, with a deadline and the identity the policy requires.
   *
   * The timeout is enforced here rather than left to the platform default:
   * a geocoder that has stopped answering must not hold a publication request
   * open, and an `AbortSignal` the caller supplied has to keep working, so the
   * two are combined rather than one replacing the other.
   */
  private async request(url: URL, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );
    const onCallerAbort = () => controller.abort();
    signal?.addEventListener("abort", onCallerAbort, { once: true });

    try {
      const response = await this.fetchImpl(url.toString(), {
        headers: {
          // Nominatim blocks an unidentified automated client, and is entitled to.
          "User-Agent": this.config.contactEmail
            ? `${this.config.userAgent} (${this.config.contactEmail})`
            : this.config.userAgent,
          Accept: "application/json",
          ...(this.config.contactEmail
            ? { From: this.config.contactEmail }
            : {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        // The upstream body may quote the query, which is personal data, so the
        // status travels and the body does not.
        throw new Error(`Geocoding provider responded ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onCallerAbort);
    }
  }
}
