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
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult>;
  requestPayout(
    accountReference: string,
    amountMinor: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }>;
  getBalance(accountReference: string, currency: string): Promise<{
    availableMinor: number;
    pendingMinor: number;
    currency: string;
  }>;
}

export class DemoPaymentProvider implements IPaymentProvider {
  async createPaymentIntent(
    amount: number,
    currency: string,
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
    accountReference: string,
    amountMinor: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    return {
      payoutId: deterministicProviderId(
        "po_demo",
        `${accountReference}:${amountMinor}:${currency}:${idempotencyKey}`,
      ),
      status: "processing",
    };
  }

  async getBalance(accountReference: string, currency: string): Promise<{
    availableMinor: number;
    pendingMinor: number;
    currency: string;
  }> {
    void accountReference;
    return {
      availableMinor: 48_000,
      pendingMinor: 25_000,
      currency: currency.toUpperCase(),
    };
  }
}

export class StripePaymentProvider implements IPaymentProvider {
  async createPaymentIntent(
    amount: number,
    currency: string,
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
    accountReference: string,
    amountMinor: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }> {
    if (
      !/^acct_[A-Za-z0-9]+$/.test(accountReference) ||
      !Number.isSafeInteger(amountMinor) ||
      amountMinor <= 0 ||
      !/^[A-Z]{3}$/.test(currency) ||
      !idempotencyKey ||
      idempotencyKey.length < 8
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La demande de versement est invalide.",
      });
    }
    const payload = await stripeConnectRequest(
      "/v1/payouts",
      accountReference,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": idempotencyKey,
        },
        body: new URLSearchParams({
          amount: String(amountMinor),
          currency: currency.toLowerCase(),
          "metadata[source]": "shongre_seller_payout",
        }),
      },
    );
    return {
      payoutId: String(payload.id || ""),
      status: payload.status === "paid" ? "completed" : "processing",
    };
  }

  async getBalance(accountReference: string, currency: string) {
    if (!/^acct_[A-Za-z0-9]+$/.test(accountReference)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le compte de versement est invalide.",
      });
    }
    const payload = await stripeConnectRequest("/v1/balance", accountReference);
    const normalizedCurrency = currency.toLowerCase();
    const available = Array.isArray(payload.available)
      ? payload.available.find(
          (entry: any) => entry?.currency === normalizedCurrency,
        )
      : undefined;
    const pending = Array.isArray(payload.pending)
      ? payload.pending.find(
          (entry: any) => entry?.currency === normalizedCurrency,
        )
      : undefined;
    return {
      availableMinor: Number(available?.amount || 0),
      pendingMinor: Number(pending?.amount || 0),
      currency: normalizedCurrency.toUpperCase(),
    };
  }
}

async function stripeConnectRequest(
  path: string,
  accountReference: string,
  init: RequestInit = {},
) {
  const { config } = await import("../../app/config/index.js");
  if (!config.stripeSecretKey) {
    throw new AppError({
      code: "NETWORK_ERROR",
      statusCode: 503,
      message: "Le prestataire de paiement n’est pas configuré.",
    });
  }
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      "Stripe-Account": accountReference,
      "Stripe-Version": "2026-02-25.clover",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError({
      code: response.status === 429 ? "RATE_LIMITED" : "NETWORK_ERROR",
      statusCode: response.status === 429 ? 429 : 503,
      message:
        payload?.error?.message ||
        "Le prestataire de paiement est temporairement indisponible.",
    });
  }
  return payload;
}
