import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { businessRulesService } from "../business-rules.service.js";
import {
  requireApiMarketContext,
  requireOpenApiRequestMarket,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerMonetizationRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/monetization/professional-plans",
    PUBLIC,
    async ({ marketCode }) =>
      businessRulesService.getProfessionalPlanCatalogForContext(
        requireApiMarketContext(requireOpenApiRequestMarket(marketCode)),
      ),
  );
  routes.addRoute(
    "POST",
    "/monetization/quotes",
    permission("marketplace.customer.access"),
    async ({ principal, body, marketCode }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      if (body?.marketCode !== activeMarket)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Le marché du devis ne correspond pas au contexte actif.",
        });
      return businessRulesService.createQuoteForContext(
        principal.userId,
        body,
        requireApiMarketContext(activeMarket),
      );
    },
  );
  routes.addRoute(
    "POST",
    "/monetization/trials",
    permission("subscription.manage.own"),
    async ({ principal, body, marketCode }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      if (body?.marketCode !== activeMarket)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Le marché de l’essai ne correspond pas au contexte actif.",
        });
      return businessRulesService.createTrialQuoteForContext(
        principal.userId,
        body,
        requireApiMarketContext(activeMarket),
      );
    },
  );
  routes.addRoute(
    "POST",
    "/monetization/checkouts",
    permission("marketplace.customer.access"),
    async ({ principal, body, marketCode }) =>
      businessRulesService.createCheckoutForContext(
        principal.userId,
        body?.quoteId,
        body?.idempotencyKey,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/monetization/promotions/validate",
    permission("marketplace.customer.access"),
    async ({ principal, body, marketCode }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      if (body?.marketCode !== activeMarket)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Le marché de la promotion ne correspond pas au contexte actif.",
        });
      return businessRulesService.validatePromotionForContext(
        principal.userId,
        body,
        requireApiMarketContext(activeMarket),
      );
    },
  );
  routes.addRoute(
    "GET",
    "/monetization/entitlements",
    permission("marketplace.customer.access"),
    async ({ principal, marketCode }) =>
      businessRulesService.getActiveEntitlementsForContext(
        principal.userId,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/monetization/subscriptions",
    permission("marketplace.customer.access"),
    async ({ principal, marketCode }) =>
      businessRulesService.getSubscriptionsForContext(
        principal.userId,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/monetization/billing",
    permission("marketplace.customer.access"),
    async ({ principal, marketCode }) =>
      businessRulesService.getBillingOverviewForContext(
        principal.userId,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/monetization/invoices/:id/document",
    permission("marketplace.customer.access"),
    async ({ principal, params, marketCode }) =>
      businessRulesService.getInvoiceDocumentForContext(
        principal.userId,
        params.id,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/monetization/subscriptions/:id/change-preview",
    permission("subscription.manage.own"),
    async ({ principal, params, body, marketCode }) =>
      businessRulesService.previewSubscriptionChangeForContext(
        principal.userId,
        {
          ...body,
          subscriptionId: params.id,
        },
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/monetization/subscriptions/:id/change",
    permission("subscription.manage.own"),
    async ({ principal, params, body, marketCode }) =>
      businessRulesService.applySubscriptionChangeForContext(
        principal.userId,
        {
          ...body,
          subscriptionId: params.id,
        },
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "PATCH",
    "/monetization/subscriptions/:id",
    permission("subscription.manage.own"),
    async ({ principal, params, body, marketCode }) =>
      businessRulesService.updateSubscriptionCancellationForContext(
        principal.userId,
        {
          subscriptionId: params.id,
          cancelAtPeriodEnd: body?.cancelAtPeriodEnd,
        },
        requireApiMarketContext(marketCode),
      ),
  );
}
