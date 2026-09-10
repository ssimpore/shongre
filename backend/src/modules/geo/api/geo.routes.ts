import { z } from "zod";
import {
  GEO_LIMITS,
  latitudeSchema,
  longitudeSchema,
} from "@shongre/contracts/geospatial";
import { AppError } from "../../../shared/errors/app-error.js";
import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import { requireApiMarketContext } from "../../markets/request-market-context.js";
import { geocodingService, publicGeoConfiguration } from "../geo.runtime.js";
import { GeocodingUnavailableError } from "../geocoding.service.js";

/**
 * The geospatial surface a client is allowed to reach.
 *
 * Three routes and no more. A browser never talks to the geocoder: it talks to
 * this, which owns the cache, the rate limit, the market restriction and the
 * provider identity. That is not defence in depth, it is the only way the
 * platform can honour a provider's usage policy at all — a per-visitor request
 * from a browser is unmetered by construction.
 */

const addressQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(GEO_LIMITS.addressQuery.minLength)
    .max(GEO_LIMITS.addressQuery.maxLength),
  locale: z.string().trim().min(2).max(35).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const reverseQuerySchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  locale: z.string().trim().min(2).max(35).optional(),
});

/**
 * Upstream failures become one of two answers, and never a stack trace.
 *
 * A geocoder being rate-limited or down is an operational fact about a
 * third party; surfacing it as a 503 with a stable code lets a client degrade
 * to typing a town by hand instead of showing an error it cannot act on.
 */
function toApiError(error: unknown): never {
  if (error instanceof GeocodingUnavailableError) {
    throw new AppError({
      code: "GEOCODING_UNAVAILABLE",
      statusCode: 503,
      message:
        "La recherche d’adresse est momentanément indisponible. Saisissez votre ville.",
    });
  }
  throw error;
}

export function registerGeoRoutes(routes: RouteRegistrar): void {
  /*
   * Everything a renderer needs and nothing it does not: a style URL, the
   * attribution the licence requires, an opening view and the limits the
   * client should not exceed. No provider endpoint, no contact identity.
   */
  routes.addRoute("GET", "/geo/map-config", PUBLIC, async () =>
    publicGeoConfiguration(),
  );

  routes.addRoute(
    "GET",
    "/geo/address-suggestions",
    PUBLIC,
    async ({ query, marketCode }) => {
      const market = requireApiMarketContext(marketCode);
      const input = addressQuerySchema.parse({
        q: query.get("q") ?? "",
        locale: query.get("locale") || undefined,
        limit: query.get("limit") || undefined,
      });
      try {
        const results = await geocodingService.forward({
          query: input.q,
          // The market decides the country; a client cannot widen its own
          // search to another country by asking.
          countryCode: market.countryCode!,
          locale: input.locale ?? market.locale ?? undefined,
        });
        return {
          results: results.slice(0, input.limit ?? results.length),
        };
      } catch (error) {
        return toApiError(error);
      }
    },
  );

  routes.addRoute(
    "GET",
    "/geo/reverse",
    PUBLIC,
    async ({ query, marketCode }) => {
      const market = requireApiMarketContext(marketCode);
      const input = reverseQuerySchema.parse({
        latitude: Number(query.get("latitude")),
        longitude: Number(query.get("longitude")),
        locale: query.get("locale") || undefined,
      });
      try {
        const result = await geocodingService.reverse({
          coordinate: {
            latitude: input.latitude,
            longitude: input.longitude,
          },
          countryCode: market.countryCode!,
          locale: input.locale ?? market.locale ?? undefined,
        });
        return { result };
      } catch (error) {
        return toApiError(error);
      }
    },
  );
}
