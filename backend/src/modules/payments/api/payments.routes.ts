import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { businessRulesService } from "../../business-rules/business-rules.service.js";
import {
  requireApiMarketContext,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { getCountryConfig } from "@shongre/contracts";
import { AppError } from "../../../shared/errors/app-error.js";
import { complianceService } from "../../compliance/compliance.service.js";
import { paymentsService } from "../payments.service.js";
import { resolveOwnerId } from "../../../shared/auth/principal.js";

export function registerPaymentsRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/payments/intent",
    permission("payment.initiate"),
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
    "/payments/payout",
    permission("order.manage.seller"),
    async ({ principal, body, marketCode }) => {
      const resolvedMarketCode = requireApiRequestMarket(marketCode);
      const marketContext = requireApiMarketContext(resolvedMarketCode);
      await businessRulesService.getPaidCatalogForContext(marketContext);
      const country = getCountryConfig(resolvedMarketCode)!;
      const currency = String(body?.currency || "").toUpperCase();
      if (currency !== country.currency)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "La devise ne correspond pas au marché sélectionné.",
        });
      await complianceService.requireForUser(principal.userId, {
        requestedAction: "receive_payout",
        jurisdiction: resolvedMarketCode,
        marketCode: resolvedMarketCode,
        transactionContext: {
          transactionType: "direct_purchase",
          contractConclusionMode: "platform",
          paymentFlow: "psp_marketplace",
          amountMinor: body?.amountMinor,
          currency,
        },
      });
      return paymentsService.requestSellerPayout(
        marketContext,
        principal.userId,
        body?.amountMinor,
        currency,
        body?.idempotencyKey,
      );
    },
  );
  routes.addRoute(
    "GET",
    "/payments/balance/:sellerId",
    permission("order.manage.seller"),
    async ({ principal, params, marketCode }) =>
      paymentsService.getSellerBalance(
        requireApiMarketContext(marketCode),
        resolveOwnerId(principal, params.sellerId, "payment.refund"),
      ),
  );
}
