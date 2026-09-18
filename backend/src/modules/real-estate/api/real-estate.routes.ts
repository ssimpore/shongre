import {
  type RouteRegistrar,
  permission,
  PUBLIC,
} from "../../../api/v1/route-contract.js";
import { realEstateService } from "../real-estate.service.js";
import {
  requireOpenApiRequestMarket,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerRealEstateRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/real-estate/agencies/:organizationId/leads/:leadId/notes",
    permission("immo.lead.manage.own"),
    async ({ principal, params, body }) =>
      realEstateService.addOwnLeadNote(
        principal.userId,
        params.organizationId,
        params.leadId,
        body?.body,
      ),
  );
  routes.addRoute(
    "GET",
    "/real-estate/agencies/:organizationId/leads/export",
    permission("immo.lead.manage.own"),
    async ({ principal, params }) =>
      realEstateService.exportOwnAgencyLeads(
        principal.userId,
        params.organizationId,
      ),
  );
  routes.addRoute(
    "GET",
    "/real-estate/catalog",
    PUBLIC,
    async ({ marketCode }) =>
      realEstateService.getCatalog(requireOpenApiRequestMarket(marketCode)),
  );
  routes.addRoute(
    "POST",
    "/real-estate/search",
    PUBLIC,
    async ({ body, marketCode }) =>
      realEstateService.search({
        ...(body || {}),
        marketCode: requireOpenApiRequestMarket(marketCode),
        sort: body?.sort || "relevance",
      }),
  );
  routes.addRoute(
    "GET",
    "/real-estate/properties/:id",
    PUBLIC,
    async ({ params, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      const property = await realEstateService.getPublicProperty(
        params.id,
        resolvedMarketCode,
      );
      if (!property.marketCodes.includes(resolvedMarketCode))
        throw new AppError({
          code: "NOT_FOUND",
          message: "Bien immobilier introuvable sur ce marché.",
        });
      return property;
    },
  );
  routes.addRoute(
    "GET",
    "/real-estate/properties/:id/comparables",
    PUBLIC,
    async ({ params, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      const property = await realEstateService.getPublicProperty(
        params.id,
        resolvedMarketCode,
      );
      if (!property.marketCodes.includes(resolvedMarketCode))
        throw new AppError({
          code: "NOT_FOUND",
          message: "Bien immobilier introuvable sur ce marché.",
        });
      return realEstateService.getComparableProperties(property.id);
    },
  );
  routes.addRoute(
    "GET",
    "/real-estate/recently-viewed",
    permission("marketplace.customer.access"),
    async ({ principal, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      return (
        await realEstateService.getRecentlyViewed(principal.userId)
      ).filter((property) => property.marketCodes.includes(resolvedMarketCode));
    },
  );
  routes.addRoute(
    "POST",
    "/real-estate/recently-viewed",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      realEstateService.markRecentlyViewed(principal.userId, body?.propertyId),
  );
  routes.addRoute(
    "POST",
    "/real-estate/drafts",
    permission("immo.property.manage.own"),
    async ({ principal, marketCode }) =>
      realEstateService.getOrCreateOwnDraft(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/real-estate/drafts/:id",
    permission("immo.property.manage.own"),
    async ({ principal, params }) =>
      realEstateService.getOwnDraft(principal.userId, params.id),
  );
  routes.addRoute(
    "PUT",
    "/real-estate/drafts/:id",
    permission("immo.property.manage.own"),
    async ({ principal, params, body }) =>
      realEstateService.saveOwnDraft(principal.userId, params.id, body),
  );
  routes.addRoute(
    "POST",
    "/real-estate/drafts/:id/submit",
    permission("immo.property.manage.own"),
    async ({ principal, params }) =>
      realEstateService.submitOwnDraft(principal.userId, params.id),
  );
  routes.addRoute(
    "GET",
    "/real-estate/properties/:id/documents/:documentId/access",
    permission("immo.property.manage.own"),
    async ({ principal, params }) =>
      realEstateService.getOwnPrivateDocumentAccess(
        principal.userId,
        params.id,
        params.documentId,
      ),
  );
  routes.addRoute(
    "POST",
    "/real-estate/leads",
    PUBLIC,
    async ({ principal, body }) =>
      realEstateService.submitLead(
        principal.role === "guest" ? undefined : principal.userId,
        body,
      ),
  );
  routes.addRoute(
    "POST",
    "/real-estate/leads/:leadId/appointments",
    permission("marketplace.customer.access"),
    async ({ principal, params, body }) =>
      realEstateService.requestAppointment(
        principal.userId,
        params.leadId,
        body?.startsAt,
      ),
  );
  routes.addRoute(
    "GET",
    "/real-estate/agencies/workspace",
    permission("immo.agency.manage.own"),
    async ({ principal }) =>
      realEstateService.getCurrentAgencyWorkspace(principal.userId),
  );
  routes.addRoute(
    "GET",
    "/real-estate/agencies/:organizationId/workspace",
    permission("immo.agency.manage.own"),
    async ({ principal, params }) =>
      realEstateService.getOwnAgencyWorkspace(
        principal.userId,
        params.organizationId,
      ),
  );
  routes.addRoute(
    "PATCH",
    "/real-estate/agencies/:organizationId/leads/:leadId",
    permission("immo.lead.manage.own"),
    async ({ principal, params, body }) =>
      realEstateService.updateOwnLead(
        principal.userId,
        params.organizationId,
        params.leadId,
        body,
      ),
  );
  routes.addRoute(
    "POST",
    "/real-estate/agencies/:organizationId/imports",
    permission("immo.inventory.import.own"),
    async ({ principal, params, body }) =>
      realEstateService.requestImport(
        principal.userId,
        params.organizationId,
        body?.type,
        body?.fileName,
        body?.idempotencyKey,
      ),
  );
  routes.addRoute(
    "POST",
    "/real-estate/checkouts",
    permission("payment.initiate"),
    async ({ principal, body }) =>
      realEstateService.createCheckout(principal.userId, body),
  );
  routes.addRoute(
    "POST",
    "/real-estate/checkouts/:checkoutId/refunds",
    permission("payment.refund"),
    async ({ params, body }) =>
      realEstateService.refundCheckout(params.checkoutId, body || {}),
  );
  routes.addRoute(
    "GET",
    "/real-estate/admin/overview",
    permission("immo.admin.manage"),
    async ({ marketCode }) =>
      realEstateService.getAdminOverview(requireApiRequestMarket(marketCode)),
  );
  routes.addRoute(
    "PUT",
    "/real-estate/admin/markets/:marketCode",
    permission("immo.admin.manage"),
    async ({ params, body }) =>
      realEstateService.updateMarketConfig(params.marketCode, body),
  );
  routes.addRoute(
    "PATCH",
    "/real-estate/admin/markets/:marketCode/offers/:offerId",
    permission("immo.admin.manage"),
    async ({ params, body }) =>
      realEstateService.updateOffer(params.marketCode, params.offerId, body),
  );
  routes.addRoute(
    "PATCH",
    "/real-estate/admin/markets/:marketCode/add-ons/:addOnId",
    permission("immo.admin.manage"),
    async ({ params, body }) =>
      realEstateService.updateAddOn(params.marketCode, params.addOnId, body),
  );
}
