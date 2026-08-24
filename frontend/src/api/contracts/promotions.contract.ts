import { ListingBoostOption, ProPlan } from "../../configuration/plans.config";

export interface PromotionActivationResult {
  success: boolean;
  expiresAt?: string;
  providerCheckoutUrl?: string;
}

export interface PromotionsServiceContract {
  getAvailableBoosts(listingId?: string): Promise<ListingBoostOption[]>;
  getProSubscriptionPlans(): Promise<ProPlan[]>;
  applyBoost(
    listingId: string,
    productId: string,
    input: { paymentMethod: string; idempotencyKey: string },
  ): Promise<PromotionActivationResult>;
  subscribeToProPlan(
    sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }>;
}
