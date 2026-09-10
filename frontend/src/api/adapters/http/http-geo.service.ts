import type {
  GeoCoordinate,
  GeocodingResult,
  PublicMapConfig,
} from "@shongre/contracts/geospatial";
import type { MarketContext } from "@shongre/contracts/market-country";
import type { GeoServiceContract } from "../../contracts/geo.contract";
import { apiOperation } from "./generated-api-operation";

/**
 * The client half of the geospatial boundary.
 *
 * Every call here reaches the platform's own API, never a geocoding provider.
 * That is what makes the cache, the rate limit and the market restriction
 * enforceable at all: a per-visitor request straight from a browser is
 * unmetered by construction, and would carry the operator's contact identity
 * into every network tab.
 *
 * Note what this cannot do: the generated transport has no `AbortSignal`, so an
 * obsolete request is not cancelled on the wire — it is debounced before it is
 * sent, and its response is discarded by sequence if a newer one has started.
 * Upstream cost is absorbed by the server-side cache and in-flight
 * deduplication rather than by cancellation.
 */
export class HttpGeoService implements GeoServiceContract {
  async getMapConfig(marketContext: MarketContext): Promise<PublicMapConfig> {
    return apiOperation<PublicMapConfig, "getGeoMapConfig">("getGeoMapConfig", {
      headers: this.marketHeaders(marketContext),
    });
  }

  async suggestAddresses(input: {
    marketContext: MarketContext;
    query: string;
    locale?: string;
    limit?: number;
  }): Promise<GeocodingResult[]> {
    const response = await apiOperation<
      { results: GeocodingResult[] },
      "getGeoAddressSuggestions"
    >("getGeoAddressSuggestions", {
      query: {
        q: input.query,
        locale: input.locale,
        limit: input.limit,
      },
      headers: this.marketHeaders(input.marketContext),
    });
    return response.results ?? [];
  }

  async reverseGeocode(input: {
    marketContext: MarketContext;
    coordinate: GeoCoordinate;
    locale?: string;
  }): Promise<GeocodingResult | null> {
    const response = await apiOperation<
      { result: GeocodingResult | null },
      "getGeoReverseGeocoding"
    >("getGeoReverseGeocoding", {
      query: {
        latitude: input.coordinate.latitude,
        longitude: input.coordinate.longitude,
        locale: input.locale,
      },
      headers: this.marketHeaders(input.marketContext),
    });
    return response.result ?? null;
  }

  private marketHeaders(marketContext: Pick<MarketContext, "countryCode">) {
    return { "X-Shongre-Market": marketContext.countryCode ?? "" };
  }
}

export const geoService = new HttpGeoService();
