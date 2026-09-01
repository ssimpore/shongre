import { createHash } from "node:crypto";
import { config } from "../../app/config/index.js";
import { stripeCheckoutAdapter } from "./stripe-checkout-adapter.js";
import { AppError } from "../../shared/errors/app-error.js";

export interface OrderCheckoutInput {
  orderId: string;
  buyerId: string;
  listingId: string;
  listingTitle: string;
  marketCode: string;
  currency: string;
  totalAmountMinor: number;
  destinationAccountId?: string;
  idempotencyKey: string;
}

export interface OrderPaymentGateway {
  createCheckout(input: OrderCheckoutInput): Promise<{
    id: string;
    url: string;
    status: string;
  }>;
  expireCheckout(input: {
    checkoutSessionId: string;
    idempotencyKey: string;
  }): Promise<void>;
  retrieveCheckout(checkoutSessionId: string): Promise<{
    id: string;
    status: string;
    paymentStatus: string;
    amountTotalMinor?: number;
    currency?: string;
    paymentIntentId?: string;
    orderId?: string;
  }>;
  refund(input: {
    orderId: string;
    paymentIntentId: string;
    amountMinor?: number;
    transferId?: string;
    transferReversalAmountMinor?: number;
    idempotencyKey: string;
  }): Promise<{ id: string; status: string }>;
  releaseSellerFunds(input: {
    orderId: string;
    paymentIntentId: string;
    destinationAccountId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ transferId: string; status: "completed" | "processing" }>;
}

export class DemoOrderPaymentGateway implements OrderPaymentGateway {
  async createCheckout(input: OrderCheckoutInput) {
    const id = `cs_demo_${createHash("sha256")
      .update(input.idempotencyKey)
      .digest("hex")
      .slice(0, 18)}`;
    return {
      id,
      url: (() => {
        const url = new URL("/paiement/retour", config.frontendUrl);
        url.searchParams.set("checkout", "demo");
        url.searchParams.set("session_id", id);
        url.searchParams.set("order_id", input.orderId);
        return url.toString();
      })(),
      status: "open",
    };
  }

  async expireCheckout() {}

  async retrieveCheckout(checkoutSessionId: string) {
    return {
      id: checkoutSessionId,
      status: "open",
      paymentStatus: "unpaid",
    };
  }

  async refund(input: {
    orderId: string;
    paymentIntentId: string;
    amountMinor?: number;
    idempotencyKey: string;
  }) {
    return {
      id: `re_demo_${createHash("sha256")
        .update(
          `${input.paymentIntentId}:${input.amountMinor || "full"}:${input.idempotencyKey}`,
        )
        .digest("hex")
        .slice(0, 18)}`,
      status: "succeeded",
    };
  }

  async releaseSellerFunds(input: {
    orderId: string;
    paymentIntentId: string;
    destinationAccountId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }) {
    return {
      transferId: `tr_demo_${createHash("sha256")
        .update(`${input.orderId}:${input.idempotencyKey}`)
        .digest("hex")
        .slice(0, 18)}`,
      status: "completed" as const,
    };
  }
}

export class StripeOrderPaymentGateway implements OrderPaymentGateway {
  async createCheckout(input: OrderCheckoutInput) {
    if (!input.destinationAccountId) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Le compte de versement du vendeur doit être vérifié avant l’achat.",
      });
    }
    return stripeCheckoutAdapter.createSession({
      idempotencyKey: input.idempotencyKey,
      accountId: input.buyerId,
      verticalType: "marketplace",
      marketCode: input.marketCode,
      returnRoute: "/compte/achats",
      mode: "payment",
      lines: [
        {
          name: input.listingTitle,
          description: `Commande Shongre ${input.orderId}`,
          amountMinor: input.totalAmountMinor,
          currency: input.currency,
          quantity: 1,
        },
      ],
      metadata: {
        resource_type: "marketplace_order",
        order_id: input.orderId,
        listing_id: input.listingId,
      },
      onBehalfOf: input.destinationAccountId,
      transferGroup: `ORDER_${input.orderId}`,
    });
  }

  async expireCheckout(input: {
    checkoutSessionId: string;
    idempotencyKey: string;
  }) {
    await stripeCheckoutAdapter.expireSession(input);
  }

  async retrieveCheckout(checkoutSessionId: string) {
    const payload =
      await stripeCheckoutAdapter.retrieveSession(checkoutSessionId);
    const metadata =
      typeof payload.metadata === "object" && payload.metadata !== null
        ? (payload.metadata as Record<string, unknown>)
        : {};
    return {
      id: String(payload.id || ""),
      status: String(payload.status || "unknown"),
      paymentStatus: String(payload.payment_status || "unknown"),
      amountTotalMinor:
        typeof payload.amount_total === "number"
          ? payload.amount_total
          : undefined,
      currency:
        typeof payload.currency === "string"
          ? payload.currency.toUpperCase()
          : undefined,
      paymentIntentId:
        typeof payload.payment_intent === "string"
          ? payload.payment_intent
          : undefined,
      orderId:
        typeof metadata.order_id === "string" ? metadata.order_id : undefined,
    };
  }

  async refund(input: {
    orderId: string;
    paymentIntentId: string;
    amountMinor?: number;
    transferId?: string;
    transferReversalAmountMinor?: number;
    idempotencyKey: string;
  }) {
    if (input.transferId) {
      await stripeCheckoutAdapter.reverseTransfer({
        transferId: input.transferId,
        amountMinor: input.transferReversalAmountMinor,
        idempotencyKey: `${input.idempotencyKey}:transfer-reversal`,
        metadata: {
          resource_type: "marketplace_order_refund",
          order_id: input.orderId,
        },
      });
    }
    const payload = await stripeCheckoutAdapter.createRefund({
      ...input,
      reverseTransfer: false,
      refundApplicationFee: false,
      metadata: {
        resource_type: "marketplace_order_refund",
        order_id: input.orderId,
      },
    });
    return {
      id: String(payload.id || ""),
      status: String(payload.status || "pending"),
    };
  }

  async releaseSellerFunds(input: {
    orderId: string;
    paymentIntentId: string;
    destinationAccountId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }) {
    const paymentIntent = await stripeCheckoutAdapter.retrievePaymentIntent(
      input.paymentIntentId,
    );
    const sourceTransactionId = String(paymentIntent.latest_charge || "");
    if (!/^ch_[A-Za-z0-9]+$/.test(sourceTransactionId)) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le paiement n’est pas encore disponible pour le versement vendeur.",
      });
    }
    const transfer = await stripeCheckoutAdapter.createTransfer({
      amountMinor: input.amountMinor,
      currency: input.currency,
      destinationAccountId: input.destinationAccountId,
      sourceTransactionId,
      transferGroup: `ORDER_${input.orderId}`,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        resource_type: "marketplace_order_seller_transfer",
        order_id: input.orderId,
      },
    });
    const transferId = String(transfer.id || "");
    if (!/^tr_[A-Za-z0-9]+$/.test(transferId)) {
      throw new AppError({
        code: "PAYMENT_FAILED",
        message: "Le prestataire n’a pas confirmé le versement vendeur.",
      });
    }
    return { transferId, status: "completed" as const };
  }
}

export const orderPaymentGateway: OrderPaymentGateway =
  config.paymentProvider === "stripe"
    ? new StripeOrderPaymentGateway()
    : new DemoOrderPaymentGateway();
