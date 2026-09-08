import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { autoService } from "../auto.service.js";
import {
  requireOpenApiRequestMarket,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerAutoRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/auto/catalog", PUBLIC, async ({ marketCode }) =>
    autoService.getCatalog(requireOpenApiRequestMarket(marketCode)),
  );
  routes.addRoute(
    "POST",
    "/auto/search",
    PUBLIC,
    async ({ body, marketCode }) =>
      autoService.search({
        ...(body || {}),
        marketCode: requireOpenApiRequestMarket(marketCode),
      }),
  );
  routes.addRoute(
    "GET",
    "/auto/vehicles/:id",
    PUBLIC,
    async ({ params, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      const vehicle = await autoService.getPublicVehicle(
        params.id,
        resolvedMarketCode,
      );
      if (!vehicle.marketCodes.includes(resolvedMarketCode))
        throw new AppError({
          code: "NOT_FOUND",
          message: "Véhicule introuvable sur ce marché.",
        });
      return vehicle;
    },
  );
  routes.addRoute(
    "GET",
    "/auto/favorites",
    permission("favorite.manage.own"),
    async ({ principal, marketCode }) => ({
      vehicleIds: await autoService.getFavoriteVehicleIds(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
    }),
  );
  routes.addRoute(
    "PUT",
    "/auto/vehicles/:id/favorite",
    permission("favorite.manage.own"),
    async ({ principal, params, marketCode, body }) => {
      if (typeof body?.isFavorite !== "boolean")
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "L’état favori demandé est invalide.",
        });
      return {
        isFavorite: await autoService.setFavoriteVehicle(
          principal.userId,
          params.id,
          requireApiRequestMarket(marketCode),
          body.isFavorite,
        ),
      };
    },
  );
  routes.addRoute(
    "POST",
    "/auto/drafts",
    permission("auto.vehicle.manage.own"),
    async ({ principal, marketCode }) =>
      autoService.getOrCreateOwnDraft(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/auto/drafts/:id",
    permission("auto.vehicle.manage.own"),
    async ({ principal, params }) =>
      autoService.getOwnDraft(principal.userId, params.id),
  );
  routes.addRoute(
    "PUT",
    "/auto/drafts/:id",
    permission("auto.vehicle.manage.own"),
    async ({ principal, params, body }) =>
      autoService.saveOwnDraft(principal.userId, params.id, body),
  );
  routes.addRoute(
    "POST",
    "/auto/drafts/:id/duplicate-check",
    permission("auto.vehicle.manage.own"),
    async ({ principal, params, body }) =>
      autoService.checkDuplicateIdentity(
        principal.userId,
        params.id,
        body?.vin,
        body?.registration,
      ),
  );
  routes.addRoute(
    "POST",
    "/auto/drafts/:id/submit",
    permission("auto.vehicle.manage.own"),
    async ({ principal, params }) =>
      autoService.submitOwnDraft(principal.userId, params.id),
  );
  routes.addRoute(
    "POST",
    "/auto/vehicles",
    permission("auto.vehicle.manage.own"),
    async ({ principal, body }) =>
      autoService.saveOwnVehicle(principal.userId, body),
  );
  routes.addRoute("POST", "/auto/leads", PUBLIC, async ({ principal, body }) =>
    autoService.submitLead(
      principal.role === "guest" ? undefined : principal.userId,
      body,
    ),
  );
  routes.addRoute(
    "GET",
    "/auto/dealers/:organizationId/workspace",
    permission("auto.dealer.manage.own"),
    async ({ principal, params }) =>
      autoService.getOwnDealerWorkspace(
        principal.userId,
        params.organizationId,
      ),
  );
  routes.addRoute(
    "PATCH",
    "/auto/dealers/:organizationId/leads/:leadId",
    permission("auto.lead.manage.own"),
    async ({ principal, params, body }) =>
      autoService.updateOwnLead(
        principal.userId,
        params.organizationId,
        params.leadId,
        body,
      ),
  );
  routes.addRoute(
    "POST",
    "/auto/dealers/:organizationId/imports",
    permission("auto.inventory.import.own"),
    async ({ principal, params, body }) =>
      autoService.requestInventoryImport(
        principal.userId,
        params.organizationId,
        body?.type,
        body?.fileName,
        body?.idempotencyKey,
      ),
  );
  routes.addRoute(
    "GET",
    "/auto/admin/overview",
    permission("auto.admin.manage"),
    async ({ marketCode }) =>
      autoService.getAdminOverview(requireApiRequestMarket(marketCode)),
  );
  routes.addRoute(
    "PUT",
    "/auto/admin/markets/:marketCode",
    permission("auto.admin.manage"),
    async ({ params, body }) =>
      autoService.updateMarketConfig(params.marketCode, body),
  );
  routes.addRoute(
    "PATCH",
    "/auto/admin/markets/:marketCode/plans/:planId",
    permission("auto.admin.manage"),
    async ({ params, body }) =>
      autoService.updatePlan(params.marketCode, params.planId, body),
  );
  routes.addRoute(
    "PATCH",
    "/auto/admin/markets/:marketCode/add-ons/:addOnId",
    permission("auto.admin.manage"),
    async ({ params, body }) =>
      autoService.updateAddOn(params.marketCode, params.addOnId, body),
  );
}
