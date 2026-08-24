import {
  PaymentsServiceContract,
  PaymentIntentResult,
} from "../../contracts/payments.contract";
import { httpClient } from "./http-client";

export class HttpPaymentsService implements PaymentsServiceContract {
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    return httpClient.post<PaymentIntentResult>("/payments/intent", {
      amount,
      currency,
      metadata,
    });
  }

  async requestSellerPayout(
    sellerId: string,
    amount: number,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    return httpClient.post<{
      payoutId: string;
      status: "completed" | "processing";
    }>("/payments/payout", { sellerId, amount });
  }

  async getSellerBalance(
    sellerId: string,
  ): Promise<{ available: number; pending: number; currency: string }> {
    return httpClient.get<{
      available: number;
      pending: number;
      currency: string;
    }>(`/payments/balance/${sellerId}`);
  }
}

export const httpPaymentsService = new HttpPaymentsService();
