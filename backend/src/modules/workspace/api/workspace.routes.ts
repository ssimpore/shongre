import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { workspaceService } from "../workspace.service.js";
import { resolveOwnerId } from "../../../shared/auth/principal.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";

export function registerWorkspaceRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/workspace/summary/:userId",
    permission("marketplace.customer.access"),
    async ({ principal, params, marketCode }) =>
      workspaceService.getUserWorkspaceSummary(
        resolveOwnerId(principal, params.userId),
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/workspace/pro-analytics/:sellerId",
    permission("store.manage.own"),
    async ({ principal, params }) =>
      workspaceService.getProAnalytics(
        resolveOwnerId(principal, params.sellerId, "user.read"),
      ),
  );
}
