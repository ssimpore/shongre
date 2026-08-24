import type { MonetizationOrder } from "@shongre/contracts/monetization";
import { PaymentsServiceContract } from "../../contracts/payments.contract";
import { httpClient } from "./http-client";

export class HttpPaymentsService implements PaymentsServiceContract {
  async createCheckout(quoteId: string, idempotencyKey: string) {
    return httpClient.post<MonetizationOrder>("/payments/intent", {
      quoteId,
      idempotencyKey,
    });
  }

  async requestSellerPayout(input: {
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }) {
    return httpClient.post<{
      payoutId: string;
      status: "completed" | "processing";
    }>("/payments/payout", input);
  }

  async getSellerBalance(sellerId: string) {
    return httpClient.get<{
      availableMinor: number;
      pendingMinor: number;
      currency: string;
    }>(`/payments/balance/${sellerId}`);
  }
}

export const httpPaymentsService = new HttpPaymentsService();
