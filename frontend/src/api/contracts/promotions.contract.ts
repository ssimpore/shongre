import { ListingBoostOption, ProPlan } from "../../configuration/plans.config";

export interface PromotionsServiceContract {
  getAvailableBoosts(listingId?: string): Promise<ListingBoostOption[]>;
  getProSubscriptionPlans(): Promise<ProPlan[]>;
  applyBoost(
    listingId: string,
    boostId: string,
    paymentMethod: string,
  ): Promise<{ success: boolean; expiresAt: string }>;
  subscribeToProPlan(
    sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }>;
}
