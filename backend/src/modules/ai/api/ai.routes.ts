import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { aiService } from "../ai.service.js";

export function registerAiRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/ai/listing-assistance",
    permission("listing.create"),
    async ({ body }) => aiService.generateListingAssistance(body || {}),
  );
  routes.addRoute(
    "POST",
    "/ai/listing-safety",
    permission("listing.create"),
    async ({ body }) => aiService.analyzeListingSafety(body || {}),
  );
}
