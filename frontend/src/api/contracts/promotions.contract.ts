import { ListingBoostOption, ProPlan } from "../../configuration/plans.config";
import type { MarketContext } from "@shongre/contracts";

export interface PromotionActivationResult {
  success: boolean;
  expiresAt?: string;
  providerCheckoutUrl?: string;
}

export interface PromotionsServiceContract {
  getAvailableBoosts(
    marketContext: MarketContext,
    listingId?: string,
  ): Promise<ListingBoostOption[]>;
  getProSubscriptionPlans(marketContext: MarketContext): Promise<ProPlan[]>;
  applyBoost(
    marketContext: MarketContext,
    listingId: string,
    productId: string,
    input: { paymentMethod: string; idempotencyKey: string },
  ): Promise<PromotionActivationResult>;
  subscribeToProPlan(
    marketContext: MarketContext,
    sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }>;
}
