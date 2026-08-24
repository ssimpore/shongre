import {
  PaymentsServiceContract,
  PaymentIntentResult,
} from "../../contracts/payments.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { deterministicDemoId } from "./demo-identifiers";

export class DemoPaymentsService implements PaymentsServiceContract {
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    await simulateNetworkDelay();
    const intentId = deterministicDemoId("pi_demo", [
      amount,
      currency,
      metadata || {},
    ]);
    return {
      clientSecret: `${intentId}_secret_demo`,
      status: "succeeded",
      amount,
      currency,
    };
  }

  async requestSellerPayout(
    sellerId: string,
    amount: number,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    await simulateNetworkDelay();
    return {
      payoutId: deterministicDemoId("po_demo", [sellerId, amount]),
      status: "completed",
    };
  }

  async getSellerBalance(
    _sellerId: string,
  ): Promise<{ available: number; pending: number; currency: string }> {
    await simulateNetworkDelay();
    return {
      available: 485.5,
      pending: 120.0,
      currency: "EUR",
    };
  }
}

export const demoPaymentsService = new DemoPaymentsService();
