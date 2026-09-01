import { useMemo } from "react";
import { services } from "../../api";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";

export function useMarketPromotions() {
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
      getAvailableBoosts: (listingId?: string) =>
        services.promotions.getAvailableBoosts(context(), listingId),
      getProSubscriptionPlans: () =>
        services.promotions.getProSubscriptionPlans(context()),
      applyBoost: (
        listingId: string,
        productId: string,
        input: { paymentMethod: string; idempotencyKey: string },
      ) =>
        services.promotions.applyBoost(context(), listingId, productId, input),
      subscribeToProPlan: (sellerId: string, planId: string) =>
        services.promotions.subscribeToProPlan(context(), sellerId, planId),
    };
  }, [marketContext, t]);
}
