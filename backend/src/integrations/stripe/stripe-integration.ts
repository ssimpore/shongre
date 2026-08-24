import { stripeAdapter } from "../../infrastructure/payments/stripe-adapter.js";

export class StripeIntegration {
  async initiateEscrowHold(orderId: string, amount: number, currency = "EUR") {
    return stripeAdapter.createPaymentIntent({
      amount,
      currency,
      metadata: { order_id: orderId },
    });
  }

  async payoutSeller(sellerId: string, amount: number) {
    return stripeAdapter.createPayout(sellerId, amount);
  }
}

export const stripeIntegration = new StripeIntegration();
