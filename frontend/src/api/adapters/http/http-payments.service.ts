import type { MonetizationOrder } from "@shongre/contracts/monetization";
import { apiOperation } from "./generated-api-operation";
import type { MarketContext } from "@shongre/contracts";
import { PaymentsServiceContract } from "../../contracts/payments.contract";

export class HttpPaymentsService implements PaymentsServiceContract {
  private headers(marketContext: MarketContext) {
    if (!marketContext.countryCode) throw new Error("Marché requis");
    return { "X-Shongre-Market": marketContext.countryCode };
  }

  async createCheckout(
    marketContext: MarketContext,
    quoteId: string,
    idempotencyKey: string,
  ) {
    return apiOperation<MonetizationOrder, "postPaymentsIntent">(
      "postPaymentsIntent",
      {
        body: { quoteId, idempotencyKey },
        headers: this.headers(marketContext),
      },
    );
  }

  async requestSellerPayout(
    marketContext: MarketContext,
    input: {
      amountMinor: number;
      currency: string;
      idempotencyKey: string;
    },
  ) {
    return apiOperation<
      {
        payoutId: string;
        status: "completed" | "processing";
      },
      "postPaymentsPayout"
    >("postPaymentsPayout", {
      body: input,
      headers: this.headers(marketContext),
    });
  }

  async getSellerBalance(marketContext: MarketContext, sellerId: string) {
    return apiOperation<
      {
        availableMinor: number;
        pendingMinor: number;
        currency: string;
      },
      "getPaymentsBalanceBySellerId"
    >("getPaymentsBalanceBySellerId", {
      path: { sellerId: sellerId },
      headers: this.headers(marketContext),
    });
  }
}

export const httpPaymentsService = new HttpPaymentsService();
