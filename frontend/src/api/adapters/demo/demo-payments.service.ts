import {
  PaymentsServiceContract,
  PaymentIntentResult,
} from "../../contracts/payments.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";

export class DemoPaymentsService implements PaymentsServiceContract {
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    await simulateNetworkDelay();
    return {
      clientSecret: `pi_demo_${Date.now()}_secret_${Math.random().toString(36).substring(2, 9)}`,
      status: "succeeded",
      amount,
      currency,
    };
  }

  async requestSellerPayout(
    sellerId: string,
    amount: number,
    _iban: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    await simulateNetworkDelay();
    return {
      payoutId: `po_demo_${Date.now()}`,
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
