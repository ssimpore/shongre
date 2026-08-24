import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { providerExecutionGuard } from "../../integrations/providers/provider-execution.js";

const STRIPE_API_VERSION = "2026-02-25.clover";

export interface StripeCheckoutLine {
  name: string;
  description: string;
  amountMinor: number;
  currency: string;
  quantity: number;
  recurring?: "month" | "year";
}

export interface StripeCheckoutSessionInput {
  idempotencyKey: string;
  accountId: string;
  verticalType: string;
  marketCode: string;
  quoteId?: string;
  snapshotHash?: string;
  lines: StripeCheckoutLine[];
  mode: "payment" | "subscription";
  trial?: {
    durationDays: number;
    requiresPaymentMethod: boolean;
  };
  providerCouponId?: string;
  metadata?: Record<string, string>;
  destinationAccountId?: string;
  applicationFeeAmountMinor?: number;
  onBehalfOf?: string;
  transferGroup?: string;
}

const stripeError = (status: number, payload: unknown) =>
  new AppError({
    code: status === 429 ? "RATE_LIMITED" : "PAYMENT_FAILED",
    message:
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "object" &&
      payload.error !== null &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "Le prestataire de paiement a refusé la création du paiement.",
  });

export class StripeCheckoutAdapter {
  private async request(
    path: string,
    body: URLSearchParams,
    idempotencyKey: string,
  ) {
    if (!config.stripeSecretKey) {
      throw new AppError({
        code: "PAYMENT_FAILED",
        message: "Le prestataire de paiement n’est pas configuré.",
      });
    }
    return providerExecutionGuard.execute({
      providerId: "stripe",
      capability: "payment.checkout",
      marketCode: "*",
      mutating: true,
      idempotencyKey,
      maxAttempts: 2,
      isRetryable: (error) =>
        error instanceof AppError
          ? error.code === "RATE_LIMITED" || error.statusCode >= 500
          : true,
      operation: async () => {
        const response = await fetch(`https://api.stripe.com${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Idempotency-Key": idempotencyKey,
            "Stripe-Version": STRIPE_API_VERSION,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw stripeError(response.status, payload);
        return payload as Record<string, unknown>;
      },
    });
  }

  async createSession(input: StripeCheckoutSessionInput) {
    if (!config.frontendUrl) {
      throw new AppError({
        code: "PAYMENT_FAILED",
        message: "L’URL de retour du paiement n’est pas configurée.",
      });
    }
    const body = new URLSearchParams({
      mode: input.mode,
      success_url: `${config.frontendUrl}/paiement/retour?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/paiement/retour?checkout=cancelled`,
      client_reference_id: input.accountId,
      "metadata[account_id]": input.accountId,
      "metadata[vertical_type]": input.verticalType,
      "metadata[market_code]": input.marketCode,
      "metadata[idempotency_key]": input.idempotencyKey,
      "metadata[quote_id]": input.quoteId || "",
      "metadata[snapshot_hash]": input.snapshotHash || "",
      allow_promotion_codes: "false",
    });
    if (input.mode === "payment") body.set("invoice_creation[enabled]", "true");
    if (input.mode === "subscription" && input.trial) {
      body.set(
        "subscription_data[trial_period_days]",
        String(input.trial.durationDays),
      );
      body.set(
        "payment_method_collection",
        input.trial.requiresPaymentMethod ? "always" : "if_required",
      );
    }
    if (input.providerCouponId) {
      body.set("discounts[0][coupon]", input.providerCouponId);
    }
    for (const [key, value] of Object.entries(input.metadata || {})) {
      body.set(`metadata[${key}]`, value);
      if (input.mode === "payment") {
        body.set(`payment_intent_data[metadata][${key}]`, value);
      }
    }
    if (input.destinationAccountId) {
      body.set(
        "payment_intent_data[transfer_data][destination]",
        input.destinationAccountId,
      );
      body.set(
        "payment_intent_data[application_fee_amount]",
        String(input.applicationFeeAmountMinor || 0),
      );
      if (input.onBehalfOf) {
        body.set("payment_intent_data[on_behalf_of]", input.onBehalfOf);
      }
    }
    if (input.transferGroup && input.mode === "payment") {
      body.set("payment_intent_data[transfer_group]", input.transferGroup);
    }
    if (input.onBehalfOf && !input.destinationAccountId) {
      body.set("payment_intent_data[on_behalf_of]", input.onBehalfOf);
    }
    input.lines.forEach((line, index) => {
      body.set(`line_items[${index}][quantity]`, String(line.quantity));
      body.set(
        `line_items[${index}][price_data][currency]`,
        line.currency.toLowerCase(),
      );
      body.set(
        `line_items[${index}][price_data][unit_amount]`,
        String(line.amountMinor),
      );
      body.set(
        `line_items[${index}][price_data][product_data][name]`,
        line.name,
      );
      body.set(
        `line_items[${index}][price_data][product_data][description]`,
        line.description,
      );
      if (line.recurring) {
        body.set(
          `line_items[${index}][price_data][recurring][interval]`,
          line.recurring,
        );
      }
    });
    const payload = await this.request(
      "/v1/checkout/sessions",
      body,
      input.idempotencyKey,
    );
    return {
      id: String(payload.id || ""),
      url: String(payload.url || ""),
      status: String(payload.status || "open"),
    };
  }

  async createRefund(input: {
    paymentIntentId: string;
    amountMinor?: number;
    idempotencyKey: string;
    reverseTransfer?: boolean;
    refundApplicationFee?: boolean;
    metadata?: Record<string, string>;
  }) {
    const body = new URLSearchParams({ payment_intent: input.paymentIntentId });
    if (input.amountMinor !== undefined)
      body.set("amount", String(input.amountMinor));
    if (input.reverseTransfer) body.set("reverse_transfer", "true");
    if (input.refundApplicationFee) body.set("refund_application_fee", "true");
    for (const [key, value] of Object.entries(input.metadata || {})) {
      body.set(`metadata[${key}]`, value);
    }
    return this.request("/v1/refunds", body, input.idempotencyKey);
  }

  async expireSession(input: {
    checkoutSessionId: string;
    idempotencyKey: string;
  }) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(input.checkoutSessionId)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La session de paiement est invalide.",
      });
    }
    return this.request(
      `/v1/checkout/sessions/${encodeURIComponent(input.checkoutSessionId)}/expire`,
      new URLSearchParams(),
      input.idempotencyKey,
    );
  }

  async retrieveSession(checkoutSessionId: string) {
    if (
      !/^cs_[A-Za-z0-9_]+$/.test(checkoutSessionId) ||
      !config.stripeSecretKey
    ) {
      throw new AppError({
        code: "PAYMENT_FAILED",
        message: "La référence de la session de paiement est invalide.",
      });
    }
    return providerExecutionGuard.execute({
      providerId: "stripe",
      capability: "payment.checkout_reconciliation",
      marketCode: "*",
      mutating: false,
      maxAttempts: 2,
      isRetryable: (error) =>
        error instanceof AppError
          ? error.code === "RATE_LIMITED" || error.statusCode >= 500
          : true,
      operation: async () => {
        const response = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`,
          {
            headers: {
              Authorization: `Bearer ${config.stripeSecretKey}`,
              "Stripe-Version": STRIPE_API_VERSION,
            },
            signal: AbortSignal.timeout(10_000),
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok) throw stripeError(response.status, payload);
        return payload as Record<string, unknown>;
      },
    });
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId) || !config.stripeSecretKey) {
      throw new AppError({
        code: "PAYMENT_FAILED",
        message: "La référence du paiement est invalide.",
      });
    }
    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
      {
        headers: {
          Authorization: `Bearer ${config.stripeSecretKey}`,
          "Stripe-Version": STRIPE_API_VERSION,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload: unknown = await response.json();
    if (!response.ok) throw stripeError(response.status, payload);
    return payload as Record<string, unknown>;
  }

  async createTransfer(input: {
    amountMinor: number;
    currency: string;
    destinationAccountId: string;
    sourceTransactionId: string;
    transferGroup: string;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }) {
    const body = new URLSearchParams({
      amount: String(input.amountMinor),
      currency: input.currency.toLowerCase(),
      destination: input.destinationAccountId,
      source_transaction: input.sourceTransactionId,
      transfer_group: input.transferGroup,
    });
    for (const [key, value] of Object.entries(input.metadata || {})) {
      body.set(`metadata[${key}]`, value);
    }
    return this.request("/v1/transfers", body, input.idempotencyKey);
  }

  async reverseTransfer(input: {
    transferId: string;
    amountMinor?: number;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }) {
    const body = new URLSearchParams();
    if (input.amountMinor !== undefined) {
      body.set("amount", String(input.amountMinor));
    }
    for (const [key, value] of Object.entries(input.metadata || {})) {
      body.set(`metadata[${key}]`, value);
    }
    return this.request(
      `/v1/transfers/${encodeURIComponent(input.transferId)}/reversals`,
      body,
      input.idempotencyKey,
    );
  }

  async updateSubscriptionCancellation(input: {
    providerSubscriptionId: string;
    cancelAtPeriodEnd: boolean;
    idempotencyKey: string;
  }) {
    const body = new URLSearchParams({
      cancel_at_period_end: input.cancelAtPeriodEnd ? "true" : "false",
    });
    return this.request(
      `/v1/subscriptions/${encodeURIComponent(input.providerSubscriptionId)}`,
      body,
      input.idempotencyKey,
    );
  }
}

export const stripeCheckoutAdapter = new StripeCheckoutAdapter();
