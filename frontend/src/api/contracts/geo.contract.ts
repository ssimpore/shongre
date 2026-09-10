import type {
  GeoCoordinate,
  GeocodingResult,
  PublicMapConfig,
} from "@shongre/contracts/geospatial";
import type { MarketContext } from "@shongre/contracts";

/**
 * Everything a client may ask about places.
 *
 * Notably absent: any way to reach a geocoding provider. A browser that could
 * do that would bypass the cache, the rate limit and the market restriction in
 * one step, and would put the operator's contact identity in every visitor's
 * network tab. The provider is reached from the server, and this is the shape
 * of what comes back.
 */
export interface GeoServiceContract {
  /**
   * Style URL, attribution and the opening view for the configured provider.
   *
   * The Web client also receives this through its server-injected runtime
   * config, which is why the map draws before any request resolves; this is the
   * same values over HTTP, for clients that have no such injection.
   */
  getMapConfig(marketContext: MarketContext): Promise<PublicMapConfig>;

  /**
   * Places matching what someone typed, restricted to the market's country.
   *
   * `signal` is not optional politeness: an autocomplete that does not cancel
   * its obsolete requests spends a shared rate limit on answers nobody will
   * read, and can render an older result over a newer one.
   */
  suggestAddresses(input: {
    marketContext: MarketContext;
    query: string;
    locale?: string;
    limit?: number;
    signal?: AbortSignal;
  }): Promise<GeocodingResult[]>;

  /** The place at a coordinate, or null when the provider knows none. */
  reverseGeocode(input: {
    marketContext: MarketContext;
    coordinate: GeoCoordinate;
    locale?: string;
    signal?: AbortSignal;
  }): Promise<GeocodingResult | null>;
}
