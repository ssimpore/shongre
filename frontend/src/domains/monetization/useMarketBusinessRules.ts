import { useMemo } from "react";
import type {
  PromotionValidationRequest,
  QuoteRequest,
  RuleEvaluationContext,
  SubscriptionCancellationRequest,
  SubscriptionChangeRequest,
} from "@shongre/contracts/monetization";
import { services } from "../../api";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";

/** Binds monetization calls to the canonical host/path market resolution. */
export function useMarketBusinessRules() {
  const { marketContext } = useMarketLocation();
  const { t } = useTranslation();

  return useMemo(() => {
    const context = () => {
      if (!marketContext?.countryCode) {
        throw new Error(t("monetization.marketRequired"));
      }
      return marketContext;
    };

    return {
      marketContext,
      getCatalog: () => services.businessRules.getCatalog(context()),
      getProfessionalCatalogPresentation: () =>
        services.businessRules.getProfessionalCatalogPresentation(context()),
      evaluate: (input: RuleEvaluationContext) =>
        services.businessRules.evaluate(context(), input),
      createQuote: (input: QuoteRequest) =>
        services.businessRules.createQuote(context(), input),
      createCheckout: (quoteId: string, idempotencyKey: string) =>
        services.businessRules.createCheckout(
          context(),
          quoteId,
          idempotencyKey,
        ),
      validatePromotion: (input: PromotionValidationRequest) =>
        services.businessRules.validatePromotion(context(), input),
      getActiveEntitlements: () =>
        services.businessRules.getActiveEntitlements(context()),
      getSubscriptions: () =>
        services.businessRules.getSubscriptions(context()),
      getBillingOverview: () =>
        services.businessRules.getBillingOverview(context()),
      getInvoiceDocument: (invoiceId: string) =>
        services.businessRules.getInvoiceDocument(context(), invoiceId),
      previewSubscriptionChange: (input: SubscriptionChangeRequest) =>
        services.businessRules.previewSubscriptionChange(context(), input),
      applySubscriptionChange: (input: SubscriptionChangeRequest) =>
        services.businessRules.applySubscriptionChange(context(), input),
      updateSubscriptionCancellation: (
        input: SubscriptionCancellationRequest,
      ) =>
        services.businessRules.updateSubscriptionCancellation(context(), input),
      getAdminOverview: () =>
        services.businessRules.getAdminOverview(context()),
    };
  }, [marketContext, t]);
}
