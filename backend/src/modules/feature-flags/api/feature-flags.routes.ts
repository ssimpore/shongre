import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import { featureFlagService } from "../feature-flag.service.js";

export function registerFeatureFlagsRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/feature-flags/:key",
    PUBLIC,
    async ({ principal, params, query }) =>
      featureFlagService.evaluatePublic(principal, params.key, {
        marketCode: query.get("marketCode") || undefined,
        anonymousId: query.get("anonymousId") || undefined,
      }),
  );
}
