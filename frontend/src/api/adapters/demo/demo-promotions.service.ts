import { PromotionsServiceContract } from "../../contracts/promotions.contract";
import {
  ListingBoostOption,
  ProPlan,
  resolveListingBoosts,
  resolveProPlans,
} from "../../../configuration/plans.config";
import type { MarketContext } from "@shongre/contracts";
import { listingRepository } from "../../../repositories/listing.repository";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { requireDemoCapability } from "./demo-authorization";
import { demoBusinessRulesService } from "./demo-business-rules.service";
import { storageService } from "../../../services/storage.service";

export class DemoPromotionsService implements PromotionsServiceContract {
  private readonly activations = new Map<
    string,
    { success: boolean; expiresAt: string }
  >();

  async getAvailableBoosts(
    marketContext: MarketContext,
    listingId?: string,
  ): Promise<ListingBoostOption[]> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.promote");
    if (!listingId) return [];
    return resolveListingBoosts(
      await demoBusinessRulesService.getCatalog(marketContext),
    );
  }

  async getProSubscriptionPlans(
    marketContext: MarketContext,
  ): Promise<ProPlan[]> {
    await simulateNetworkDelay();
    return resolveProPlans(
      await demoBusinessRulesService.getCatalog(marketContext),
    );
  }

  async applyBoost(
    marketContext: MarketContext,
    listingId: string,
    productId: string,
    input: { paymentMethod: string; idempotencyKey: string },
  ): Promise<{ success: boolean; expiresAt: string }> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.promote");
    if (!marketContext.countryCode) throw new Error("Marché requis");
    const activationKey = `${storageService.getCurrentUser()?.id || "guest"}:${marketContext.countryCode}:${input.idempotencyKey}`;
    const replay = this.activations.get(activationKey);
    if (replay) return replay;
    if (!input.paymentMethod) throw new Error("Mode de paiement requis.");
    const catalog = await demoBusinessRulesService.getCatalog(marketContext);
    const boost = resolveListingBoosts(catalog).find(
      (candidate) => candidate.productId === productId,
    );
    if (!boost) throw new Error("Option de visibilité introuvable.");
    const quote = await demoBusinessRulesService.createQuote(marketContext, {
      productIds: [productId],
      listingId,
      marketCode: marketContext.countryCode,
      idempotencyKey: `promotion-quote:${input.idempotencyKey}`,
    });
    const order = await demoBusinessRulesService.createCheckout(
      marketContext,
      quote.id,
      `promotion-checkout:${input.idempotencyKey}`,
    );
    if (order.status !== "paid")
      return { success: false, expiresAt: quote.expiresAt };
    const startsAt = quote.createdAt;
    const expiresAt = new Date(
      Date.parse(startsAt) + boost.durationDays * 86_400_000,
    ).toISOString();
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
    this.activations.set(activationKey, result);
    return result;
  }

  async subscribeToProPlan(
    marketContext: MarketContext,
    _sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }> {
    await simulateNetworkDelay();
    requireDemoCapability("subscription.manage.own");
    const normalizedPlanId = ["pro_starter", "pro_enterprise"].includes(planId)
      ? "pro_business"
      : planId;
    const plans = await this.getProSubscriptionPlans(marketContext);
    const plan =
      plans.find(
        (candidate) =>
          candidate.id === normalizedPlanId || candidate.productId === planId,
      ) || plans[0];
    if (!plan?.productId || !marketContext.countryCode) {
      throw new Error("Forfait indisponible sur ce marché.");
    }
    const idempotencyKey = `subscription:${plan.productId}:${storageService.getCurrentUser()?.id || "guest"}`;
    const quote = await demoBusinessRulesService.createQuote(marketContext, {
      productIds: [plan.productId],
      marketCode: marketContext.countryCode,
      idempotencyKey: `quote:${idempotencyKey}`,
    });
    const order = await demoBusinessRulesService.createCheckout(
      marketContext,
      quote.id,
      `checkout:${idempotencyKey}`,
    );
    return {
      success: order.status === "paid",
      plan,
    };
  }
}

export const demoPromotionsService = new DemoPromotionsService();
