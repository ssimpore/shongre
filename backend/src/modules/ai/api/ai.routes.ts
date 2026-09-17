import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { aiService } from "../ai.service.js";
import {
  requireApiMarketContext,
  requireOpenApiRequestMarket,
} from "../../markets/request-market-context.js";

export function registerAiRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/ai/listing-assistance",
    permission("listing.create"),
    async ({ body }) => aiService.generateListingAssistance(body || {}),
  );
  routes.addRoute(
    "POST",
    "/ai/listing-from-photos",
    permission("listing.create"),
    async ({ body, marketCode }) => {
      const marketContext = requireApiMarketContext(
        requireOpenApiRequestMarket(marketCode),
      );
      return aiService.suggestListingFromPhotos({
        marketContext,
        locale:
          typeof body?.locale === "string" && body.locale.length >= 2
            ? body.locale.slice(0, 35)
            : marketContext.locale,
        imageUrls: body?.imageUrls,
      });
    },
  );
  routes.addRoute(
    "POST",
    "/ai/listing-safety",
    permission("listing.create"),
    async ({ body }) => aiService.analyzeListingSafety(body || {}),
  );
}
