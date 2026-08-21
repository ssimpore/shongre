import { PromotionsServiceContract } from "../../contracts/promotions.contract";
import {
  LISTING_BOOSTS,
  PRO_PLANS,
  ListingBoostOption,
  ProPlan,
} from "../../../configuration/plans.config";
import { listingRepository } from "../../../repositories/listing.repository";
import { simulateNetworkDelay } from "../../client/api-client.config";

export class DemoPromotionsService implements PromotionsServiceContract {
  async getAvailableBoosts(_listingId?: string): Promise<ListingBoostOption[]> {
    await simulateNetworkDelay();
    return LISTING_BOOSTS;
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    await simulateNetworkDelay();
    return PRO_PLANS;
  }

  async applyBoost(
    listingId: string,
    boostId: string,
    _paymentMethod: string,
  ): Promise<{ success: boolean; expiresAt: string }> {
    await simulateNetworkDelay();
    const boost = LISTING_BOOSTS.find((b) => b.id === boostId);
    if (!boost) throw new Error("Option de visibilité introuvable.");

    const expiresAt = new Date(
      Date.now() + boost.durationDays * 86400000,
    ).toISOString();
    await listingRepository.updateListing(listingId, {
      isBoosted: true,
      boostType: boost.id as any,
      boostExpiresAt: expiresAt,
    });

    return {
      success: true,
      expiresAt,
    };
  }

  async subscribeToProPlan(
    _sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }> {
    await simulateNetworkDelay();
    const plan = PRO_PLANS.find((p) => p.id === planId) || PRO_PLANS[0];
    return {
      success: true,
      plan,
    };
  }
}

export const demoPromotionsService = new DemoPromotionsService();
