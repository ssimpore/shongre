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
import type { MarketContext } from "@shongre/contracts";

export class HttpPromotionsService implements PromotionsServiceContract {
  private headers(marketContext: MarketContext) {
    if (!marketContext.countryCode) throw new Error("Marché requis");
    return { "X-Shongre-Market": marketContext.countryCode };
  }

  async getAvailableBoosts(
    marketContext: MarketContext,
    listingId?: string,
  ): Promise<ListingBoostOption[]> {
    if (!listingId) return [];
    const catalog = await httpClient.get<MonetizationCatalog>(
      "/business-rules/catalog",
      { headers: this.headers(marketContext) },
    );
    return resolveListingBoosts(catalog);
  }

  async getProSubscriptionPlans(
    marketContext: MarketContext,
  ): Promise<ProPlan[]> {
    const catalog = await httpClient.get<MonetizationCatalog>(
      "/business-rules/catalog",
      { headers: this.headers(marketContext) },
    );
    return resolveProPlans(catalog);
  }

  async applyBoost(
    marketContext: MarketContext,
    listingId: string,
    productId: string,
    input: { paymentMethod: string; idempotencyKey: string },
  ): Promise<PromotionActivationResult> {
    const quote = await httpClient.post<MonetizationQuote>(
      "/monetization/quotes",
      {
        productIds: [productId],
        listingId,
        marketCode: marketContext.countryCode!,
        idempotencyKey: `promotion-quote:${input.idempotencyKey}`,
      },
      { headers: this.headers(marketContext) },
    );
    const order = await httpClient.post<MonetizationOrder>(
      "/monetization/checkouts",
      {
        quoteId: quote.id,
        idempotencyKey: `promotion-checkout:${input.idempotencyKey}`,
      },
      { headers: this.headers(marketContext) },
    );
    return {
      success: order.status === "paid",
      providerCheckoutUrl: order.providerCheckoutUrl,
    };
  }

  async subscribeToProPlan(
    marketContext: MarketContext,
    _sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }> {
    const idempotencyKey = `subscription:${planId}:${crypto.randomUUID()}`;
    const quote = await httpClient.post<MonetizationQuote>(
      "/monetization/quotes",
      {
        productIds: [planId],
        marketCode: marketContext.countryCode!,
        idempotencyKey: `quote:${idempotencyKey}`,
      },
      { headers: this.headers(marketContext) },
    );
    const [order, plans] = await Promise.all([
      httpClient.post<MonetizationOrder>(
        "/monetization/checkouts",
        {
          quoteId: quote.id,
          idempotencyKey: `checkout:${idempotencyKey}`,
        },
        { headers: this.headers(marketContext) },
      ),
      this.getProSubscriptionPlans(marketContext),
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
