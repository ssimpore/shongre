import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import {
  requireOpenApiRequestMarket,
  requireOpenMarketplace,
} from "../../markets/request-market-context.js";
import { homepageService } from "../homepage.service.js";
import { trendingService } from "../../trending/trending.service.js";

export function registerHomepageRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/home", PUBLIC, async ({ query, marketCode }) => {
    const resolvedMarket = requireOpenApiRequestMarket(marketCode);
    requireOpenMarketplace(resolvedMarket);
    return homepageService.getPublished({
      marketCode: resolvedMarket,
      locale: query.get("locale") || "fr-FR",
      country: query.get("country") || undefined,
      region: query.get("region") || undefined,
      city: query.get("city") || undefined,
    });
  });
  routes.addRoute(
    "GET",
    "/home/trending",
    PUBLIC,
    async ({ query, marketCode }) =>
      trendingService.getSection({
        marketCode: requireOpenApiRequestMarket(marketCode),
        locale: query.get("locale") || undefined,
        region: query.get("region") || undefined,
        city: query.get("city") || undefined,
        limit: query.get("limit") ? Number(query.get("limit")) : undefined,
      }),
  );
}
