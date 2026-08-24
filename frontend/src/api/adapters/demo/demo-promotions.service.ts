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
  private readonly activations = new Map<
    string,
    { success: boolean; expiresAt: string }
  >();

  async getAvailableBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    await simulateNetworkDelay();
    return listingId ? LISTING_BOOSTS : [];
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    await simulateNetworkDelay();
    return PRO_PLANS;
  }

  async applyBoost(
    listingId: string,
    productId: string,
    input: { paymentMethod: string; idempotencyKey: string },
  ): Promise<{ success: boolean; expiresAt: string }> {
    await simulateNetworkDelay();
    const replay = this.activations.get(input.idempotencyKey);
    if (replay) return replay;
    if (!input.paymentMethod) throw new Error("Mode de paiement requis.");
    const boost = LISTING_BOOSTS.find((b) => b.productId === productId);
    if (!boost) throw new Error("Option de visibilité introuvable.");

    const expiresAt = new Date(
      Date.now() + boost.durationDays * 86400000,
    ).toISOString();
    const startsAt = new Date().toISOString();
    const promotionType = {
      urgent: "urgent_badge",
      top_of_list: "search_bump",
      highlight: "featured",
      gallery_boost: "featured",
      spotlight: "featured",
    }[boost.id] as "urgent_badge" | "search_bump" | "featured";
    await listingRepository.updateListing(listingId, {
      isBoosted: true,
      boostType: boost.id,
      boostExpiresAt: expiresAt,
      promotionState: "active",
      promotionType,
      promotionSource: "purchase",
      promotionSourceId: `demo-order:${listingId}:${boost.productId}:${startsAt}`,
      promotionLabel: boost.badgeLabel,
      promotionStartAt: startsAt,
      promotionEndAt: expiresAt,
      promotedAt: startsAt,
    });

    const result = {
      success: true,
      expiresAt,
    };
    this.activations.set(input.idempotencyKey, result);
    return result;
  }

  async subscribeToProPlan(
    _sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }> {
    await simulateNetworkDelay();
    const normalizedPlanId = ["pro_starter", "pro_enterprise"].includes(planId)
      ? "pro_business"
      : planId;
    const plan =
      PRO_PLANS.find((candidate) => candidate.id === normalizedPlanId) ||
      PRO_PLANS[0];
    return {
      success: true,
      plan,
    };
  }
}

export const demoPromotionsService = new DemoPromotionsService();
