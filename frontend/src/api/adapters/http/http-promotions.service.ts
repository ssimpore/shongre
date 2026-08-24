import { PromotionsServiceContract } from "../../contracts/promotions.contract";
import { httpClient } from "./http-client";
import {
  ListingBoostOption,
  ProPlan,
  resolveListingBoosts,
  resolveProPlans,
} from "../../../configuration/plans.config";
import type {
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationQuote,
} from "@shongre/contracts/monetization";
import type { PromotionActivationResult } from "../../contracts/promotions.contract";

export class HttpPromotionsService implements PromotionsServiceContract {
  async getAvailableBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    if (!listingId) return [];
    const catalog = await httpClient.get<MonetizationCatalog>(
      "/business-rules/catalog",
      { params: { marketCode: "FR" } },
    );
    return resolveListingBoosts(catalog);
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    const catalog = await httpClient.get<MonetizationCatalog>(
      "/business-rules/catalog",
      { params: { marketCode: "FR" } },
    );
    return resolveProPlans(catalog);
  }

  async applyBoost(
    listingId: string,
    productId: string,
    input: { paymentMethod: string; idempotencyKey: string },
  ): Promise<PromotionActivationResult> {
    const quote = await httpClient.post<MonetizationQuote>(
      "/monetization/quotes",
      {
        productIds: [productId],
        listingId,
        marketCode: "FR",
        idempotencyKey: `promotion-quote:${input.idempotencyKey}`,
      },
    );
    const order = await httpClient.post<MonetizationOrder>(
      "/monetization/checkouts",
      {
        quoteId: quote.id,
        idempotencyKey: `promotion-checkout:${input.idempotencyKey}`,
      },
    );
    return {
      success: order.status === "paid",
      providerCheckoutUrl: order.providerCheckoutUrl,
    };
  }

  async subscribeToProPlan(
    _sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }> {
    const idempotencyKey = `subscription:${planId}:${crypto.randomUUID()}`;
    const quote = await httpClient.post<MonetizationQuote>(
      "/monetization/quotes",
      {
        productIds: [planId],
        marketCode: "FR",
        idempotencyKey: `quote:${idempotencyKey}`,
      },
    );
    const [order, plans] = await Promise.all([
      httpClient.post<MonetizationOrder>("/monetization/checkouts", {
        quoteId: quote.id,
        idempotencyKey: `checkout:${idempotencyKey}`,
      }),
      this.getProSubscriptionPlans(),
    ]);
    const plan =
      plans.find(
        (candidate) =>
          candidate.productId === planId || candidate.id === planId,
      ) || plans[0];
    return {
      success: order.status === "paid",
      plan,
    };
  }
}

export const httpPromotionsService = new HttpPromotionsService();
