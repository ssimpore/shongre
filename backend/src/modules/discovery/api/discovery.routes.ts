import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import {
  requireApiRequestMarket,
  requireOpenMarketplace,
} from "../../markets/request-market-context.js";
import { listingsService } from "../../listings/listings.service.js";

export function registerDiscoveryRoutes(routes: RouteRegistrar): void {
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
