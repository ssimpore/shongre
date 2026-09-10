import { createHmac } from "node:crypto";
import { config } from "../../app/config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import {
  createGeoConfig,
  publicMapConfig,
  type GeoConfig,
} from "./geo.config.js";
import { NominatimGeocodingProvider } from "./providers/nominatim.geocoding-provider.js";
import { OpenFreeMapTileProvider } from "./providers/openfreemap.tile-provider.js";
import {
  GeocodingService,
  InMemoryGeocodingCache,
  InProcessGeocodingRateLimiter,
} from "./geocoding.service.js";
import { RedisGeocodingRateLimiter } from "./geocoding-rate-limiter.js";
import type { ListingLocationPolicy } from "../../shared/public-projections.js";

/**
 * The geospatial module, assembled once.
 *
 * Assembly lives here rather than in each caller so that "which provider is
 * active" is decided in one place from configuration. A caller asks the module
 * for a capability; it never names OpenFreeMap or Nominatim.
 */

export const geoConfig: GeoConfig = createGeoConfig({
  env: process.env,
  appEnvironment: config.environment.environment,
});

export const mapTileProvider = new OpenFreeMapTileProvider(geoConfig.map);

const geocodingProvider =
  geoConfig.geocoding.provider === "nominatim"
    ? new NominatimGeocodingProvider(geoConfig.geocoding)
    : null;

export const geocodingService = new GeocodingService({
  config: geoConfig.geocoding,
  forwardProvider: geocodingProvider,
  reverseProvider: geocodingProvider,
  cache: new InMemoryGeocodingCache(),
  /*
   * The budget is the provider's, so it is held where every instance can see
   * it. Counting per process enforces the configured rate per instance, which
   * means the number chosen to stay inside someone else's usage policy stops
   * describing reality as soon as the deployment scales.
   *
   * The unit and contract suites run deliberately without infrastructure — the
   * same reason `RedisHealthService` short-circuits there — so the test profile
   * keeps the in-process counter. It is a test double, not a fallback: nothing
   * outside that profile may use it.
   */
  rateLimiter:
    config.environment.environment === "test"
      ? new InProcessGeocodingRateLimiter(
          geoConfig.geocoding.rateLimitPerMinute,
        )
      : new RedisGeocodingRateLimiter({
          limitPerMinute: geoConfig.geocoding.rateLimitPerMinute,
        }),
  telemetry: {
    record(event) {
      // The query is never part of this: an address a person typed is personal
      // data, and an observability pipeline is not a lawful place to keep it.
      logger.info("geocoding_request", {
        operation: event.operation,
        outcome: event.outcome,
        provider: event.provider,
        durationMs: event.durationMs,
        ...(event.resultCount === undefined
          ? {}
          : { resultCount: event.resultCount }),
      });
    },
  },
});

/**
 * The key that decides where an approximate public point lands.
 *
 * Derived from an existing server secret with a purpose label rather than
 * introduced as a new required environment value: the derivation is one-way,
 * the label keeps this key separate from the one it came from, and an operator
 * has one fewer secret to provision before a location can be published safely.
 * Rotating the parent moves every approximate point, which is why it is not
 * something to do casually.
 */
const displacementSecret = createHmac("sha256", config.jwtSecret)
  .update("shongre:location-displacement:v1")
  .digest("hex");

export const listingLocationPolicy: ListingLocationPolicy = {
  displacementSecret,
  displacementRadiusMeters: geoConfig.privacy.displacementRadiusMeters,
};

export const publicGeoConfiguration = () => publicMapConfig(geoConfig);
