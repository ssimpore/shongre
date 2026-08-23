import { stripeAdapter } from "../../infrastructure/payments/stripe-adapter.js";
import { createHash } from "node:crypto";
import { AppError } from "../../shared/errors/app-error.js";

const deterministicProviderId = (prefix: string, value: string) =>
  `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;

export interface PaymentIntentResult {
  clientSecret: string;
  status: "succeeded" | "requires_action" | "pending" | "failed";
  amount: number;
  currency: string;
}

export interface IPaymentProvider {
  createPaymentIntent(
    amount: number,
    currency?: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult>;
  requestPayout(
    sellerId: string,
    amount: number,
    iban: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }>;
  getBalance(
    sellerId: string,
  ): Promise<{ available: number; pending: number; currency: string }>;
}

export class DemoPaymentProvider implements IPaymentProvider {
  async createPaymentIntent(
    amount: number,
    currency = "EUR",
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    const id = deterministicProviderId(
      "pi_demo",
      `${amount}:${currency}:${JSON.stringify(metadata || {})}`,
    );
    return {
      clientSecret: `${id}_secret_demo`,
      status: "requires_action",
      amount,
      currency: currency.toLowerCase(),
    };
  }

  async requestPayout(
    sellerId: string,
    amount: number,
    iban: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    return {
      payoutId: deterministicProviderId(
        "po_demo",
        `${sellerId}:${amount}:${iban.slice(-4)}`,
      ),
      status: "processing",
    };
  }

  async getBalance(
    sellerId: string,
  ): Promise<{ available: number; pending: number; currency: string }> {
    void sellerId;
    return {
      available: 480,
      pending: 250,
      currency: "EUR",
    };
  }
}

export class StripePaymentProvider implements IPaymentProvider {
  async createPaymentIntent(
    amount: number,
    currency = "EUR",
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    const res = await stripeAdapter.createPaymentIntent({
      amount,
      currency,
      metadata,
    });
    return {
      clientSecret: res.clientSecret,
      status: res.status,
      amount: res.amount,
      currency: res.currency,
    };
  }

  async requestPayout(
    sellerId: string,
    amount: number,
    iban: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    return stripeAdapter.createPayout(sellerId, amount, iban);
  }

  async getBalance(
    sellerId: string,
  ): Promise<{ available: number; pending: number; currency: string }> {
    void sellerId;
    throw new AppError({
      code: "NETWORK_ERROR",
      statusCode: 503,
      message: "Le solde de paiement est temporairement indisponible.",
    });
  }
}
