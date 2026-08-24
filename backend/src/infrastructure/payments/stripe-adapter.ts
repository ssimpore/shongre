import { AppError } from "../../shared/errors/app-error.js";

export interface StripePaymentIntentParams {
  amount: number; // in EUR cents or full euros
  currency: string;
  metadata?: Record<string, string>;
}

export class StripeAdapter {
  async createPaymentIntent(params: StripePaymentIntentParams): Promise<{
    id: string;
    clientSecret: string;
    status: "succeeded" | "requires_action" | "pending" | "failed";
    amount: number;
    currency: string;
  }> {
    void params;
    throw new AppError({
      code: "CONFLICT",
      message:
        "Les PaymentIntents libres sont désactivés. Utilisez un devis immuable et Checkout.",
    });
  }

  async createPayout(
    sellerId: string,
    amount: number,
  ): Promise<{
    payoutId: string;
    status: "completed" | "processing";
  }> {
    void sellerId;
    void amount;
    throw new AppError({
      code: "CONFLICT",
      message:
        "Le compte Stripe Connect du vendeur doit être validé avant un virement.",
    });
  }
}

export const stripeAdapter = new StripeAdapter();
