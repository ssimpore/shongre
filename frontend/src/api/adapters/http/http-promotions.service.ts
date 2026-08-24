import { PromotionsServiceContract } from "../../contracts/promotions.contract";
import { httpClient } from "./http-client";
import {
  ListingBoostOption,
  ProPlan,
} from "../../../configuration/plans.config";
import type { MonetizationOrder } from "@shongre/contracts/monetization";
import type { PromotionActivationResult } from "../../contracts/promotions.contract";

export class HttpPromotionsService implements PromotionsServiceContract {
  async getAvailableBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    return httpClient.get<ListingBoostOption[]>("/promotions/boosts", {
      params: { listingId },
    });
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    return httpClient.get<ProPlan[]>("/promotions/pro-plans");
  }

  async applyBoost(
    listingId: string,
    productId: string,
    input: { paymentMethod: string; idempotencyKey: string },
  ): Promise<PromotionActivationResult> {
    const order = await httpClient.post<MonetizationOrder>(
      "/promotions/apply-boost",
      {
        listingId,
        boostId: productId,
        paymentMethod: input.paymentMethod,
        idempotencyKey: input.idempotencyKey,
      },
    );
    return {
      success: order.status === "paid",
      providerCheckoutUrl: order.providerCheckoutUrl,
    };
  }

  async subscribeToProPlan(
    sellerId: string,
    planId: string,
  ): Promise<{ success: boolean; plan: ProPlan }> {
    return httpClient.post<{ success: boolean; plan: ProPlan }>(
      "/promotions/subscribe-pro",
      { sellerId, planId },
    );
  }
}

export const httpPromotionsService = new HttpPromotionsService();
