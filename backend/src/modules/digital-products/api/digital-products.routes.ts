import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { digitalProductsService } from "../digital-products.service.js";
import { requireOpenApiRequestMarket } from "../../markets/request-market-context.js";
import { requireRecentAuthentication } from "../../../shared/auth/principal.js";

export function registerDigitalProductsRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/digital/policy",
    permission("marketplace.customer.access"),
    async ({ marketCode }) =>
      digitalProductsService.getPolicyProjection(
        requireOpenApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/digital/seller-profile",
    permission("listing.create"),
    async ({ principal, marketCode }) =>
      digitalProductsService.getOwnSellerProfile(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "PUT",
    "/digital/seller-profile",
    permission("listing.create"),
    async ({ principal, marketCode, body }) =>
      digitalProductsService.acceptSellerResponsibilities({
        sellerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        fulfillmentTypes: body?.fulfillmentTypes,
        acceptedPolicyVersion: body?.acceptedPolicyVersion,
      }),
  );
  routes.addRoute(
    "GET",
    "/digital/seller/provisioning-tasks",
    permission("order.manage.seller"),
    async ({ principal, marketCode }) => ({
      items: await digitalProductsService.listSellerProvisioningTasks(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
      ),
    }),
  );
  routes.addRoute(
    "POST",
    "/digital/assets/uploads",
    permission("listing.create"),
    async ({ principal, marketCode, body }) =>
      digitalProductsService.initializePrivateUpload(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        body,
      ),
  );
  routes.addRoute(
    "POST",
    "/digital/assets/uploads/:id/complete",
    permission("listing.create"),
    async ({ principal, marketCode, params }) =>
      digitalProductsService.completePrivateUpload(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
      ),
  );
  routes.addRoute(
    "GET",
    "/digital/assets/:id",
    permission("listing.create"),
    async ({ principal, marketCode, params }) =>
      digitalProductsService.getOwnAsset(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
      ),
  );
  routes.addRoute(
    "DELETE",
    "/digital/assets/:id",
    permission("listing.create"),
    async ({ principal, marketCode, params }) =>
      digitalProductsService.removeOwnAsset(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
      ),
  );
  routes.addRoute(
    "POST",
    "/digital/access-secrets",
    permission("listing.create"),
    async ({ principal, marketCode, body }) =>
      digitalProductsService.createProtectedAccess({
        ...body,
        sellerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
      }),
  );
  routes.addRoute(
    "POST",
    "/digital/credential-batches",
    permission("listing.create"),
    async ({ principal, marketCode, body }) => {
      const { productAccessClass, ...batch } = body ?? {};
      return digitalProductsService.createCredentialBatch(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        productAccessClass,
        batch,
      );
    },
  );
  routes.addRoute(
    "POST",
    "/digital/credential-batches/:id/credentials",
    permission("listing.create"),
    async ({ principal, marketCode, params, body }) =>
      digitalProductsService.importCredentialInventory({
        sellerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        batchId: params.id,
        productAccessClass: body?.productAccessClass,
        credentials: body?.credentials,
      }),
  );
  routes.addRoute(
    "GET",
    "/digital/credential-batches/:id/inventory",
    permission("listing.create"),
    async ({ principal, marketCode, params }) =>
      digitalProductsService.getOwnInventory(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
      ),
  );
  routes.addRoute(
    "POST",
    "/digital/listings/:id/fulfillment-versions",
    permission("listing.publish"),
    async ({ principal, marketCode, params, body }) =>
      digitalProductsService.createFulfillmentVersion({
        sellerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        listingId: params.id,
        fulfillment: body,
      }),
  );
  routes.addRoute(
    "GET",
    "/digital/entitlements",
    permission("order.read.own"),
    async ({ principal, marketCode }) =>
      digitalProductsService.listBuyerEntitlements(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/digital/entitlements/:id",
    permission("order.read.own"),
    async ({ principal, marketCode, params }) =>
      digitalProductsService.getBuyerEntitlement(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
      ),
  );
  routes.addRoute(
    "POST",
    "/digital/entitlements/:id/download-grants",
    permission("order.read.own"),
    async ({ principal, marketCode, params, body, requestId }) =>
      digitalProductsService.createDownloadGrant({
        buyerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        entitlementId: params.id,
        assetId: body?.assetId,
        requestId,
      }),
  );
  routes.addRoute(
    "POST",
    "/digital/entitlements/:id/reveal-grants",
    permission("order.read.own"),
    async ({ principal, marketCode, params, requestId }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.createRevealGrant({
        buyerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        entitlementId: params.id,
        requestId,
      });
    },
  );
  routes.addRoute(
    "POST",
    "/digital/access-grants/:id/consume",
    permission("order.read.own"),
    async ({ principal, params, res }) => {
      requireRecentAuthentication(principal);
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return digitalProductsService.consumeAccessGrant(
        principal.userId,
        params.id,
      );
    },
  );
  routes.addRoute(
    "POST",
    "/digital/entitlements/:id/provision",
    permission("order.manage.seller"),
    async ({ principal, marketCode, params, body, requestId }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.submitSellerProvisionedAccess({
        ...body,
        sellerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        entitlementId: params.id,
        requestId,
      });
    },
  );
  routes.addRoute(
    "POST",
    "/digital/entitlements/:id/reports",
    permission("order.read.own"),
    async ({ principal, marketCode, params, body }) =>
      digitalProductsService.reportInvalidAccess({
        buyerId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        entitlementId: params.id,
        reportType: body?.reportType,
        description: body?.description,
      }),
  );
  routes.addRoute(
    "GET",
    "/digital/admin/overview",
    permission("moderation.review"),
    async ({ principal, marketCode }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.getAdminOverview(
        requireOpenApiRequestMarket(marketCode),
      );
    },
  );
  routes.addRoute(
    "GET",
    "/digital/admin/policy",
    permission("market.manage"),
    async ({ principal, marketCode }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.getAdminPolicy(
        requireOpenApiRequestMarket(marketCode),
      );
    },
  );
  routes.addRoute(
    "POST",
    "/digital/admin/policy",
    permission("market.manage"),
    async ({ principal, marketCode, body }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.createPolicyDraft({
        staffId: principal.userId,
        marketCode: requireOpenApiRequestMarket(marketCode),
        policy: body?.policy,
        reason: body?.reason,
      });
    },
  );
  routes.addRoute(
    "POST",
    "/digital/admin/policies/:id/activate",
    permission("market.manage"),
    async ({ principal, marketCode, params, body }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.activatePolicy({
        staffId: principal.userId,
        policyId: params.id,
        marketCode: requireOpenApiRequestMarket(marketCode),
        reason: body?.reason,
      });
    },
  );
  routes.addRoute(
    "POST",
    "/digital/admin/assets/:id/moderation",
    permission("moderation.action"),
    async ({ principal, marketCode, params, body }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.moderateAsset(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
        body?.decision,
      );
    },
  );
  routes.addRoute(
    "POST",
    "/digital/admin/fulfillment-versions/:id/moderation",
    permission("moderation.action"),
    async ({ principal, marketCode, params, body }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.moderateFulfillmentVersion(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
        body?.decision,
      );
    },
  );
  routes.addRoute(
    "POST",
    "/digital/admin/reports/:id/resolve",
    permission("support.case.manage"),
    async ({ principal, marketCode, params, body }) => {
      requireRecentAuthentication(principal);
      return digitalProductsService.resolveAccessReport(
        principal.userId,
        requireOpenApiRequestMarket(marketCode),
        params.id,
        body,
      );
    },
  );
}
