import type { MonetizationOrder } from "@shongre/contracts/monetization";
import type { MarketContext } from "@shongre/contracts";
import { PaymentsServiceContract } from "../../contracts/payments.contract";
import { httpClient } from "./http-client";

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
    return httpClient.post<MonetizationOrder>(
      "/payments/intent",
      { quoteId, idempotencyKey },
      { headers: this.headers(marketContext) },
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
    return httpClient.post<{
      payoutId: string;
      status: "completed" | "processing";
    }>("/payments/payout", input, {
      headers: this.headers(marketContext),
    });
  }

  async getSellerBalance(marketContext: MarketContext, sellerId: string) {
    return httpClient.get<{
      availableMinor: number;
      pendingMinor: number;
      currency: string;
    }>(`/payments/balance/${sellerId}`, {
      headers: this.headers(marketContext),
    });
  }
}

export const httpPaymentsService = new HttpPaymentsService();
