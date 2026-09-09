import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import {
  requireApiMarketContext,
  requireApiRequestMarket,
  requireOpenMarketplace,
} from "../../markets/request-market-context.js";
import { listingsService } from "../../listings/listings.service.js";
import { discoveryCollectionsService } from "../discovery-collections.service.js";

export function registerDiscoveryRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/discovery/collections",
    PUBLIC,
    async ({ query, marketCode }) => {
      const marketContext = requireApiMarketContext(marketCode);
      requireOpenMarketplace(marketContext.countryCode!);
      return discoveryCollectionsService.getCollections(
        marketContext,
        query.get("locale") || marketContext.locale || "fr-FR",
      );
    },
  );
  routes.addRoute(
    "GET",
    "/discovery/sitemap-listings",
    PUBLIC,
    async ({ query, marketCode }) => {
      const resolved = requireApiRequestMarket(marketCode);
      requireOpenMarketplace(resolved);
      return listingsService.getSitemapListings(
        resolved,
        query.get("cursor") || undefined,
        Number(query.get("limit") || 500),
      );
    },
  );
}
