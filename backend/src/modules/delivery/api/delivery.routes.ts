import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { deliveryService } from "../delivery.service.js";
import {
  requireApiMarketContext,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerDeliveryRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/delivery/availability",
    PUBLIC,
    async ({ principal, marketCode }) =>
      deliveryService.availability(
        principal,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/delivery/requests",
    PUBLIC,
    async ({ principal, query, marketCode }) =>
      deliveryService.search(principal, requireApiMarketContext(marketCode), {
        marketCode: requireApiRequestMarket(marketCode),
        pickupPostalCode: query.get("pickupPostalCode") || undefined,
        vehicleType: query.get("vehicleType") || undefined,
        cursor: query.get("cursor") || undefined,
        limit: query.get("limit") ? Number(query.get("limit")) : undefined,
      }),
  );
  routes.addRoute(
    "GET",
    "/delivery/requests/:requestId",
    PUBLIC,
    async ({ principal, params, marketCode }) =>
      deliveryService.getPublicRequest(
        principal,
        requireApiMarketContext(marketCode),
        params.requestId,
      ),
  );
  routes.addRoute(
    "GET",
    "/delivery/favorites",
    permission("favorite.manage.own"),
    async ({ principal, marketCode }) => ({
      requestIds: await deliveryService.getFavoriteRequestIds(
        principal,
        requireApiMarketContext(marketCode),
      ),
    }),
  );
  routes.addRoute(
    "PUT",
    "/delivery/requests/:requestId/favorite",
    permission("favorite.manage.own"),
    async ({ principal, params, marketCode, body }) => {
      if (typeof body?.isFavorite !== "boolean")
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "L’état favori demandé est invalide.",
        });
      return {
        isFavorite: await deliveryService.setFavoriteRequest(
          principal,
          requireApiMarketContext(marketCode),
          params.requestId,
          body.isFavorite,
        ),
      };
    },
  );
  routes.addRoute(
    "POST",
    "/delivery/requests",
    permission("delivery.request.manage.own"),
    async ({ principal, body, marketCode }) =>
      deliveryService.createDraft(
        principal,
        requireApiMarketContext(marketCode),
        body,
      ),
  );
  routes.addRoute(
    "POST",
    "/delivery/requests/:requestId/publish",
    permission("delivery.request.manage.own"),
    async ({ principal, params, marketCode }) =>
      deliveryService.publish(
        principal,
        requireApiMarketContext(marketCode),
        params.requestId,
      ),
  );
  routes.addRoute(
    "GET",
    "/delivery/courier/profile",
    permission("delivery.courier.manage.own"),
    async ({ principal, marketCode }) =>
      deliveryService.getCourierProfile(
        principal,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "PUT",
    "/delivery/courier/profile",
    permission("delivery.courier.manage.own"),
    async ({ principal, body, marketCode }) =>
      deliveryService.saveCourierProfile(
        principal,
        requireApiMarketContext(marketCode),
        body,
      ),
  );
  routes.addRoute(
    "GET",
    "/delivery/me/requests",
    permission("delivery.request.manage.own"),
    async ({ principal, marketCode }) =>
      deliveryService.listOwnRequests(
        principal,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/delivery/me/requests/:requestId",
    permission("delivery.read"),
    async ({ principal, params, marketCode }) =>
      deliveryService.getPrivateRequest(
        principal,
        requireApiMarketContext(marketCode),
        params.requestId,
      ),
  );
  routes.addRoute(
    "POST",
    "/delivery/requests/:requestId/applications",
    permission("delivery.application.manage.own"),
    async ({ principal, params, body, marketCode }) =>
      deliveryService.submitApplication(
        principal,
        requireApiMarketContext(marketCode),
        params.requestId,
        body,
      ),
  );
  routes.addRoute(
    "GET",
    "/delivery/me/applications",
    permission("delivery.application.manage.own"),
    async ({ principal, marketCode }) =>
      deliveryService.listOwnApplications(
        principal,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/delivery/applications/:applicationId/withdraw",
    permission("delivery.application.manage.own"),
    async ({ principal, params, marketCode }) =>
      deliveryService.withdrawApplication(
        principal,
        requireApiMarketContext(marketCode),
        params.applicationId,
      ),
  );
  routes.addRoute(
    "POST",
    "/delivery/requests/:requestId/applications/:applicationId/accept",
    permission("delivery.request.manage.own"),
    async ({ principal, params, body, marketCode }) =>
      deliveryService.acceptApplication(
        principal,
        requireApiMarketContext(marketCode),
        params.requestId,
        params.applicationId,
        body,
      ),
  );
  routes.addRoute(
    "POST",
    "/delivery/requests/:requestId/transition",
    permission("delivery.read"),
    async ({ principal, params, body, marketCode }) =>
      deliveryService.transition(
        principal,
        requireApiMarketContext(marketCode),
        params.requestId,
        body,
      ),
  );
}
