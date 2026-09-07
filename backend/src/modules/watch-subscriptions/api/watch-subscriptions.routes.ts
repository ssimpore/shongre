import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { watchSubscriptionsService } from "../watch-subscriptions.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";

export function registerWatchSubscriptionsRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/watch-subscriptions",
    permission("saved_search.manage.own"),
    async ({ principal, marketCode }) =>
      watchSubscriptionsService.list(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/watch-subscriptions",
    permission("saved_search.manage.own"),
    async ({ principal, marketCode, body }) =>
      watchSubscriptionsService.createOrReplace(
        principal.userId,
        requireApiRequestMarket(marketCode),
        body,
      ),
  );
  routes.addRoute(
    "PATCH",
    "/watch-subscriptions/:id",
    permission("saved_search.manage.own"),
    async ({ principal, marketCode, params, body }) =>
      watchSubscriptionsService.update(
        params.id,
        principal.userId,
        requireApiRequestMarket(marketCode),
        body,
      ),
  );
  routes.addRoute(
    "DELETE",
    "/watch-subscriptions/:id",
    permission("saved_search.manage.own"),
    async ({ principal, marketCode, params }) => {
      await watchSubscriptionsService.remove(
        params.id,
        principal.userId,
        requireApiRequestMarket(marketCode),
      );
      return { success: true };
    },
  );
}
