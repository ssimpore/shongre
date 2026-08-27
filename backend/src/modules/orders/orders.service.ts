import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { config } from "../../app/config/index.js";
import type { IComplianceRepository } from "../../infrastructure/database/repositories/compliance.repository.js";
import type { IListingRepository } from "../../infrastructure/database/repositories/listing.repository.js";
import type { IMarketRepository } from "../../infrastructure/database/repositories/market.repository.js";
import type {
  IOrderRepository,
  OrderRecord,
} from "../../infrastructure/database/repositories/order.repository.js";
import {
  repositories,
  hashProviderPayload,
} from "../../infrastructure/database/repositories/index.js";
import {
  orderPaymentGateway,
  type OrderPaymentGateway,
} from "../../infrastructure/payments/order-payment-gateway.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import { calculateOrderTotal } from "../../shared/money/escrow.js";
import { toPublicListing } from "../../shared/public-projections.js";
import type {
  DeliveryType,
  Listing,
  Transaction,
} from "../../shared/types/index.js";
import {
  CommissionService,
  commissionService,
} from "../commission/commission.service.js";
import { analyticsService } from "../analytics/analytics.service.js";

const DEFAULT_HOME_DELIVERY_MINOR =
  BASELINE_MONETIZATION_CATALOG.products.find(
    (product) => product.id === "delivery.home",
  )?.prices[0]?.amount.amountMinor || 0;
const HANDOVER_CODE_TTL_MS = 30 * 60 * 1_000;
const CHECKOUT_RECONCILIATION_AGE_MS = 15 * 60 * 1_000;
const CHECKOUT_WITHOUT_REFERENCE_EXPIRY_MS = 26 * 60 * 60 * 1_000;

export interface CreateDirectPurchaseInput {
  listingId: string;
  buyerId: string;
  deliveryMethod: DeliveryType;
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  /** Required by live payment mode; optional only for deterministic demos. */
  idempotencyKey?: string;
  /** Legacy clients may send this, but the server always uses Stripe Checkout. */
  paymentMethod?: "card" | "bank_transfer" | "wallet";
}

export interface CreateReservationInput {
  listingId: string;
  buyerId: string;
  agreedLocation: string;
  scheduledDate?: string;
  idempotencyKey?: string;
}

export interface OrderCheckoutResult extends Transaction {
  checkout: { id: string; url: string; status: string };
}

export interface DirectPurchaseQuote {
  listingId: string;
  deliveryMethod: DeliveryType;
  itemAmountMinor: number;
  protectionFeeMinor: number;
  shippingFeeMinor: number;
  totalAmountMinor: number;
  currency: string;
}

function sellerType(listing: Listing) {
  if (
    listing.publisherType === "professional" ||
    listing.seller?.accountType === "professional"
  ) {
    return listing.publisherOrganizationId ? "organization" : "professional";
  }
  return "individual";
}

export class OrdersService {
  constructor(
    private readonly orderRepo: IOrderRepository = repositories.orders,
    private readonly listingRepo: IListingRepository = repositories.listings,
    private readonly commissions: CommissionService = commissionService,
    private readonly markets: IMarketRepository = repositories.markets,
    private readonly compliance: IComplianceRepository = repositories.compliance,
    private readonly paymentGateway: OrderPaymentGateway = orderPaymentGateway,
  ) {}

  async getOrderById(orderId: string): Promise<Transaction | null> {
    const order = await this.orderRepo.findById(orderId);
    return order ? this.toParticipantOrder(order) : null;
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    return (await this.orderRepo.getPurchases(userId)).map((order) =>
      this.toParticipantOrder(order),
    );
  }

  async getSales(userId: string): Promise<Transaction[]> {
    return (await this.orderRepo.getSales(userId)).map((order) =>
      this.toParticipantOrder(order),
    );
  }

  async createDirectPurchase(
    input: CreateDirectPurchaseInput,
  ): Promise<OrderCheckoutResult> {
    const listing = await this.requirePurchasableListing(
      input.listingId,
      input.buyerId,
      input.idempotencyKey,
    );
    const market = await this.markets.getEffective(listing.marketCode);
    if (
      !market.isActive ||
      !market.allowedDeliveryMethods.includes(input.deliveryMethod) ||
      !listing.allowedDelivery.includes(input.deliveryMethod)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Ce mode de livraison n’est pas disponible pour cette annonce.",
      });
    }
    if (
      input.deliveryMethod !== "hand_delivery" &&
      (!input.shippingAddress?.street?.trim() ||
        !input.shippingAddress.city?.trim() ||
        !input.shippingAddress.postalCode?.trim() ||
        input.shippingAddress.country?.length !== 2)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une adresse de livraison complète est requise.",
      });
    }

    const shippingFeeMinor =
      input.deliveryMethod === "hand_delivery"
        ? 0
        : listing.shippingCost !== undefined
          ? Math.max(0, Math.round(listing.shippingCost * 100))
          : DEFAULT_HOME_DELIVERY_MINOR;
    return this.createCheckoutOrder({
      listing,
      buyerId: input.buyerId,
      transactionType: "DIRECT_PURCHASE",
      itemAmountMinor: Math.round(listing.price * 100),
      remainingBalanceMinor: 0,
      deliveryMethod: input.deliveryMethod,
      shippingFeeMinor,
      shippingAddress: input.shippingAddress,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async quoteDirectPurchase(input: {
    listingId: string;
    buyerId: string;
    deliveryMethod: DeliveryType;
  }): Promise<DirectPurchaseQuote> {
    const listing = await this.requirePurchasableListing(
      input.listingId,
      input.buyerId,
    );
    const market = await this.markets.getEffective(listing.marketCode);
    if (
      !market.isActive ||
      !market.allowedDeliveryMethods.includes(input.deliveryMethod) ||
      !listing.allowedDelivery.includes(input.deliveryMethod)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Ce mode de livraison n’est pas disponible pour cette annonce.",
      });
    }
    const shippingFeeMinor =
      input.deliveryMethod === "hand_delivery"
        ? 0
        : listing.shippingCost !== undefined
          ? Math.max(0, Math.round(listing.shippingCost * 100))
          : DEFAULT_HOME_DELIVERY_MINOR;
    const breakdown = calculateOrderTotal({
      itemAmount: listing.price,
      shippingFee: shippingFeeMinor / 100,
      marketCode: market.code,
      ruleOverride: {
        protectionFeeRate: market.protectionFeeRate,
        protectionFixedFee: market.protectionFixedFee,
      },
    });
    return {
      listingId: listing.id,
      deliveryMethod: input.deliveryMethod,
      itemAmountMinor: breakdown.itemAmountMinor,
      protectionFeeMinor: breakdown.protectionFeeMinor,
      shippingFeeMinor: breakdown.shippingFeeMinor,
      totalAmountMinor: breakdown.totalChargedMinor,
      currency: market.currency,
    };
  }

  async createReservation(
    input: CreateReservationInput,
  ): Promise<OrderCheckoutResult> {
    const listing = await this.requirePurchasableListing(
      input.listingId,
      input.buyerId,
      input.idempotencyKey,
    );
    if (!input.agreedLocation?.trim() || input.agreedLocation.length > 500) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le lieu de remise convenu est requis.",
      });
    }
    const market = await this.markets.getEffective(listing.marketCode);
    const listingAmountMinor = Math.max(0, Math.round(listing.price * 100));
    const calculatedDeposit = Math.round(
      (listingAmountMinor * market.reservationDepositRateBps) / 10_000,
    );
    const depositAmountMinor = Math.min(
      listingAmountMinor,
      Math.max(
        market.reservationDepositMinimumMinor,
        Math.min(calculatedDeposit, market.reservationDepositMaximumMinor),
      ),
    );
    return this.createCheckoutOrder({
      listing,
      buyerId: input.buyerId,
      transactionType: "RESERVATION",
      itemAmountMinor: depositAmountMinor,
      remainingBalanceMinor: listingAmountMinor - depositAmountMinor,
      deliveryMethod: "hand_delivery",
      shippingFeeMinor: 0,
      shippingAddress: {
        street: input.agreedLocation.trim(),
        city: listing.city,
        postalCode: listing.postalCode,
        country: listing.country,
      },
      idempotencyKey: input.idempotencyKey,
    });
  }

  async issueHandoverCode(
    orderId: string,
    buyerId: string,
  ): Promise<{ code: string; expiresAt: string }> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== buyerId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul l’acheteur peut générer le code de remise.",
      });
    }
    if (
      order.deliveryMethod !== "hand_delivery" ||
      !["escrow_funded", "pin_pending"].includes(order.status)
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le code de remise n’est pas disponible pour cette commande.",
      });
    }
    const code = randomInt(0, 10_000).toString().padStart(4, "0");
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + HANDOVER_CODE_TTL_MS).toISOString();
    await this.orderRepo.update(orderId, {
      status: "pin_pending",
      handoverPinHash: this.hashHandoverCode(orderId, code),
      handoverPinIssuedAt: issuedAt,
      handoverPinAttempts: 0,
      handoverPinLockedUntil: "",
    });
    logger.info("order_handover_code_issued", { orderId, buyerId, expiresAt });
    return { code, expiresAt };
  }

  async confirmHandoverPIN(
    orderId: string,
    sellerId: string,
    enteredPin: string,
  ): Promise<{ success: boolean; message: string }> {
    const normalizedPin = String(enteredPin || "").trim();
    if (!/^\d{4}$/.test(normalizedPin)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le code PIN doit comporter exactement 4 chiffres.",
      });
    }
    const order = await this.requireOrder(orderId);
    if (order.sellerId !== sellerId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul le vendeur peut confirmer le code de remise.",
      });
    }
    if (
      order.deliveryMethod !== "hand_delivery" ||
      order.status !== "pin_pending" ||
      !order.handoverPinHash ||
      !order.handoverPinIssuedAt
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Aucun code de remise actif n’est disponible.",
      });
    }
    if (
      order.handoverPinLockedUntil &&
      new Date(order.handoverPinLockedUntil).getTime() > Date.now()
    ) {
      throw new AppError({
        code: "RATE_LIMITED",
        statusCode: 429,
        message: "Trop de tentatives. Réessayez plus tard.",
      });
    }
    if (
      Date.now() - new Date(order.handoverPinIssuedAt).getTime() >
      HANDOVER_CODE_TTL_MS
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le code de remise a expiré. L’acheteur doit en générer un nouveau.",
      });
    }
    if (
      !this.matchesHandoverCode(orderId, normalizedPin, order.handoverPinHash)
    ) {
      const failed = await this.orderRepo.recordHandoverPinFailure(orderId);
      throw new AppError({
        code: failed.handoverPinAttempts >= 5 ? "RATE_LIMITED" : "INVALID_PIN",
        statusCode: failed.handoverPinAttempts >= 5 ? 429 : 400,
        message:
          failed.handoverPinAttempts >= 5
            ? "Trop de tentatives. Réessayez plus tard."
            : "Code de remise incorrect.",
      });
    }

    const released = await this.releaseSellerFunds(order);
    await this.orderRepo.update(orderId, {
      isPinVerified: true,
      status: "completed",
      ...released,
      handoverPinHash: "",
      handoverPinIssuedAt: "",
      handoverPinAttempts: 0,
      handoverPinLockedUntil: "",
    });
    await this.setListingStatus(order.listingId, "sold");
    logger.info("order_handover_verified", { orderId, sellerId });
    return {
      success: true,
      message: "Code validé. La remise est confirmée.",
    };
  }

  async confirmDeliveryReceived(
    orderId: string,
    buyerId: string,
  ): Promise<Transaction> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== buyerId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul l’acheteur peut confirmer la livraison.",
      });
    }
    if (order.deliveryMethod === "hand_delivery") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Une remise en main propre doit être confirmée par le vendeur avec le code.",
      });
    }
    if (!["escrow_funded", "shipped"].includes(order.status)) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Cette livraison ne peut pas être confirmée dans son état actuel.",
      });
    }
    const released = await this.releaseSellerFunds(order);
    const updated = await this.orderRepo.update(orderId, {
      status: "completed",
      ...released,
    });
    await this.setListingStatus(order.listingId, "sold");
    logger.info("order_delivery_confirmed", { orderId, buyerId });
    return this.toParticipantOrder(updated);
  }

  async markShipped(
    orderId: string,
    sellerId: string,
    input: { carrierName: string; trackingNumber: string },
  ): Promise<Transaction> {
    const order = await this.requireOrder(orderId);
    if (order.sellerId !== sellerId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul le vendeur peut déclarer l’expédition.",
      });
    }
    if (
      order.deliveryMethod === "hand_delivery" ||
      order.status !== "escrow_funded"
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette commande ne peut pas être déclarée expédiée.",
      });
    }
    const carrierName = input.carrierName?.trim();
    const trackingNumber = input.trackingNumber?.trim();
    if (
      !carrierName ||
      carrierName.length > 120 ||
      !trackingNumber ||
      trackingNumber.length < 3 ||
      trackingNumber.length > 120 ||
      !/^[A-Za-z0-9._\-/ ]+$/.test(trackingNumber)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le transporteur et un numéro de suivi valide sont requis.",
      });
    }
    const updated = await this.orderRepo.update(orderId, {
      status: "shipped",
      carrierName,
      trackingNumber,
      shippedAt: new Date().toISOString(),
    });
    logger.info("order_shipped", { orderId, sellerId, carrierName });
    return this.toParticipantOrder(updated);
  }

  async cancelUnpaidOrder(
    orderId: string,
    buyerId: string,
  ): Promise<Transaction> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== buyerId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul l’acheteur peut annuler cette commande.",
      });
    }
    if (!["initiated", "payment_pending"].includes(order.status)) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Un paiement confirmé nécessite une procédure de remboursement.",
      });
    }
    if (order.checkoutSessionId) {
      await this.paymentGateway.expireCheckout({
        checkoutSessionId: order.checkoutSessionId,
        idempotencyKey: `checkout-expire:${order.id}`,
      });
    }
    const updated = await this.orderRepo.update(orderId, {
      status: "cancelled",
    });
    await this.setListingStatus(order.listingId, "published", "reserved");
    logger.info("unpaid_order_cancelled", { orderId, buyerId });
    return this.toParticipantOrder(updated);
  }

  async openDispute(
    orderId: string,
    userId: string,
    reason: string,
    details: string,
  ): Promise<Transaction> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Vous ne participez pas à cette commande.",
      });
    }
    if (
      !reason?.trim() ||
      reason.length > 120 ||
      !details?.trim() ||
      details.trim().length < 10 ||
      details.length > 5_000
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le motif et les détails de la contestation sont requis.",
      });
    }
    const updated = await this.orderRepo.update(orderId, {
      status: "disputed",
      disputeReason: reason.trim(),
      disputeDetails: details.trim(),
    });
    logger.warn("order_dispute_opened", { orderId, userId });
    return this.toParticipantOrder(updated);
  }

  async refundOrder(
    orderId: string,
    input: { refundBaseMinor?: number; idempotencyKey: string },
  ) {
    const order = await this.requireOrder(orderId);
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence est requise pour le remboursement.",
      });
    }
    if (
      order.refundIdempotencyKey === input.idempotencyKey &&
      order.refundProviderId
    ) {
      return {
        order: this.toParticipantOrder(order),
        commissionReversal: null,
        providerRefund: {
          id: order.refundProviderId,
          status: order.status === "refunded" ? "succeeded" : "pending",
        },
      };
    }
    if (!["escrow_funded", "completed", "disputed"].includes(order.status)) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Cette commande ne peut pas être remboursée dans son état actuel.",
      });
    }
    const fullBaseMinor =
      order.itemAmountMinor ?? Math.round(order.itemAmount * 100);
    const refundBaseMinor = input.refundBaseMinor ?? fullBaseMinor;
    if (refundBaseMinor !== fullBaseMinor) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Seul le remboursement intégral est disponible pour cette commande.",
      });
    }
    const totalMinor =
      order.totalChargedMinor ?? Math.round(order.totalCharged * 100);
    const paymentIntentId =
      order.paymentIntentId ||
      (config.paymentProvider === "demo" ? `pi_demo_${order.id}` : undefined);
    if (!paymentIntentId) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Aucun paiement fournisseur remboursable n’est associé à cette commande.",
      });
    }
    const refund = await this.paymentGateway.refund({
      orderId,
      paymentIntentId,
      amountMinor: totalMinor,
      transferId:
        order.sellerTransferStatus === "completed"
          ? order.sellerTransferId
          : undefined,
      transferReversalAmountMinor:
        order.sellerTransferStatus === "completed" &&
        order.sellerTransferAmountMinor
          ? order.sellerTransferAmountMinor
          : undefined,
      idempotencyKey: input.idempotencyKey,
    });
    const pending = await this.orderRepo.update(orderId, {
      status: "refund_pending",
      refundProviderId: refund.id,
      refundBaseMinor,
      refundIdempotencyKey: input.idempotencyKey,
      ...(order.sellerTransferStatus === "completed"
        ? {
            sellerTransferStatus: "reversed",
          }
        : {}),
    });
    let finalizedOrder = pending;
    let commissionReversal = null;
    if (refund.status === "succeeded") {
      const finalized = await this.finalizeRefund(pending);
      finalizedOrder = finalized.order;
      commissionReversal = finalized.commissionReversal;
      void this.emitFinancialAnalytics("refund_completed", order, {
        listingId: order.listingId,
        sellerId: order.sellerId,
        orderId: order.id,
        transactionId: refund.id,
        amountMinor: totalMinor,
        currency: order.currency,
      });
    }
    return {
      order: this.toParticipantOrder(finalizedOrder),
      commissionReversal,
      providerRefund: refund,
    };
  }

  async reconcileStaleCheckouts(asOf = new Date()) {
    if (config.paymentProvider !== "stripe") {
      return {
        skipped: true,
        inspected: 0,
        paid: 0,
        cancelled: 0,
        pending: 0,
        errors: 0,
      } as const;
    }
    const beforeIso = new Date(
      asOf.getTime() - CHECKOUT_RECONCILIATION_AGE_MS,
    ).toISOString();
    const orders = await this.orderRepo.listUnsettledCheckouts(beforeIso, 200);
    const result = {
      skipped: false,
      inspected: orders.length,
      paid: 0,
      cancelled: 0,
      pending: 0,
      errors: 0,
    };
    for (const order of orders) {
      try {
        if (!order.checkoutSessionId) {
          const ageMs = asOf.getTime() - new Date(order.createdAt).getTime();
          if (ageMs >= CHECKOUT_WITHOUT_REFERENCE_EXPIRY_MS) {
            if (await this.cancelReconciledOrder(order)) result.cancelled += 1;
          } else {
            result.pending += 1;
          }
          continue;
        }
        const checkout = await this.paymentGateway.retrieveCheckout(
          order.checkoutSessionId,
        );
        if (
          checkout.id !== order.checkoutSessionId ||
          (checkout.orderId && checkout.orderId !== order.id)
        ) {
          await this.orderRepo.update(order.id, { status: "disputed" });
          await this.setListingStatus(order.listingId, "reserved");
          throw new AppError({
            code: "CONFLICT",
            message: "La session réconciliée ne correspond pas à la commande.",
          });
        }
        if (checkout.paymentStatus === "paid") {
          await this.recordSuccessfulPayment(order, checkout);
          result.paid += 1;
        } else if (checkout.status === "expired") {
          if (await this.cancelReconciledOrder(order)) result.cancelled += 1;
        } else {
          if (checkout.status === "complete") {
            await this.orderRepo.update(order.id, {
              status: "payment_pending",
            });
          }
          result.pending += 1;
        }
      } catch (error) {
        result.errors += 1;
        logger.error("order_checkout_reconciliation_failed", {
          orderId: order.id,
          checkoutSessionId: order.checkoutSessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    logger.info("order_checkout_reconciliation_completed", result);
    return result;
  }

  async handleStripeWebhook(event: any, rawBody: string) {
    const eventType = String(event?.type || "");
    const object = event?.data?.object || {};
    const metadata = object.metadata || {};
    const resourceType = String(metadata.resource_type || "");
    if (
      resourceType !== "marketplace_order" &&
      resourceType !== "marketplace_order_refund"
    ) {
      return { processed: false, reason: "not_marketplace_order" };
    }
    const eventId = String(event?.id || "");
    const orderId = String(metadata.order_id || "");
    if (!eventId || !eventType || !orderId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Événement Stripe de commande incomplet.",
      });
    }
    const payloadHash = hashProviderPayload(rawBody);
    const claim = await this.compliance.claimProviderEvent({
      provider: "stripe_marketplace_orders",
      eventId,
      payloadHash,
    });
    if (claim === "HASH_MISMATCH") {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Le contenu de cet événement ne correspond pas à sa première réception.",
      });
    }
    if (claim !== "CLAIMED") {
      return { processed: false, reason: claim.toLowerCase(), eventId };
    }

    const order = await this.requireOrder(orderId);
    let result: unknown = {
      processed: false,
      reason: "event_ignored",
      eventId,
    };
    if (resourceType === "marketplace_order") {
      if (
        order.checkoutSessionId &&
        String(object.id) !== order.checkoutSessionId
      ) {
        throw new AppError({
          code: "FORBIDDEN",
          message: "La session de paiement ne correspond pas à la commande.",
        });
      }
      const paidEvent =
        eventType === "checkout.session.async_payment_succeeded" ||
        (eventType === "checkout.session.completed" &&
          object.payment_status === "paid");
      if (paidEvent) {
        await this.recordSuccessfulPayment(order, {
          id: String(object.id || ""),
          amountTotalMinor: Number(object.amount_total),
          currency: String(object.currency || "").toUpperCase(),
          paymentIntentId: String(object.payment_intent || ""),
        });
        result = { processed: true, state: "escrow_funded", eventId };
      } else if (
        eventType === "checkout.session.expired" ||
        eventType === "checkout.session.async_payment_failed"
      ) {
        await this.orderRepo.update(order.id, { status: "cancelled" });
        await this.setListingStatus(order.listingId, "published", "reserved");
        result = { processed: true, state: "cancelled", eventId };
      } else if (eventType === "checkout.session.completed") {
        await this.orderRepo.update(order.id, { status: "payment_pending" });
        result = { processed: true, state: "payment_pending", eventId };
      }
    } else if (
      resourceType === "marketplace_order_refund" &&
      eventType === "refund.updated"
    ) {
      if (
        !order.refundProviderId ||
        String(object.id || "") !== order.refundProviderId
      ) {
        throw new AppError({
          code: "FORBIDDEN",
          message: "Le remboursement ne correspond pas à la commande.",
        });
      }
      if (object.status === "succeeded") {
        const finalized = await this.finalizeRefund(order);
        result = {
          processed: true,
          state: finalized.order.status,
          eventId,
        };
      } else if (["failed", "canceled"].includes(String(object.status))) {
        const disputed = await this.orderRepo.update(order.id, {
          status: "disputed",
        });
        result = {
          processed: true,
          state: disputed.status,
          eventId,
        };
      }
    }
    await this.compliance.completeProviderEvent({
      provider: "stripe_marketplace_orders",
      eventId,
      payloadHash,
    });
    return result;
  }

  private async createCheckoutOrder(input: {
    listing: Listing;
    buyerId: string;
    transactionType: "DIRECT_PURCHASE" | "RESERVATION";
    itemAmountMinor: number;
    remainingBalanceMinor: number;
    deliveryMethod: DeliveryType;
    shippingFeeMinor: number;
    shippingAddress?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    idempotencyKey?: string;
  }): Promise<OrderCheckoutResult> {
    const idempotencyKey = this.resolveIdempotencyKey(
      input.idempotencyKey,
      input.buyerId,
      input.listing.id,
    );
    const market = await this.markets.getEffective(input.listing.marketCode);
    if (input.listing.currency !== market.currency) {
      throw new AppError({
        code: "CONFLICT",
        message: "La devise de l’annonce ne correspond pas au marché actif.",
      });
    }
    const breakdown = calculateOrderTotal({
      itemAmount: input.itemAmountMinor / 100,
      shippingFee: input.shippingFeeMinor / 100,
      marketCode: market.code,
      ruleOverride: {
        protectionFeeRate: market.protectionFeeRate,
        protectionFixedFee: market.protectionFixedFee,
      },
    });
    const existing =
      await this.orderRepo.findByCheckoutIdempotencyKey(idempotencyKey);
    if (existing) {
      if (
        existing.buyerId !== input.buyerId ||
        existing.listingId !== input.listing.id ||
        existing.transactionType !== input.transactionType ||
        existing.deliveryMethod !== input.deliveryMethod ||
        existing.totalChargedMinor !== breakdown.totalChargedMinor ||
        existing.currency !== market.currency
      ) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Cette clé d’idempotence a déjà été utilisée pour une autre commande.",
        });
      }
      if (["cancelled", "refunded"].includes(existing.status)) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Cette tentative de paiement est terminée. Recommencez avec une nouvelle demande.",
        });
      }
      return this.ensureProviderCheckout(
        existing,
        input.listing,
        market.code,
        idempotencyKey,
      );
    }
    const orderId = randomUUID();
    const now = new Date().toISOString();
    const commission = await this.commissions.quote({
      idempotencyKey: `commission:order:${orderId}:quote`,
      orderId,
      eligibleCommercialEvent: true,
      earningEvent: "payment_succeeded",
      effectiveAt: now,
      marketCode: market.code,
      countryCode: input.listing.country,
      currency: market.currency,
      categoryId: input.listing.categoryId,
      transactionType: "marketplace_order",
      sellerType: sellerType(input.listing),
      sellerAccountId: input.listing.sellerId,
      organizationId: input.listing.publisherOrganizationId,
      planId: input.listing.publicationOfferId,
      campaignIds: [],
      paymentMethod: "stripe_checkout",
      itemSubtotalMinor: breakdown.itemAmountMinor,
      discountMinor: 0,
      shippingMinor: breakdown.shippingFeeMinor,
      taxMinor: 0,
      buyerFeesMinor: breakdown.protectionFeeMinor,
      totalMinor: breakdown.totalChargedMinor,
      platformCollectedMinor: breakdown.totalChargedMinor,
      historicalVolumeMinor: 0,
    });
    const destinationAccountId = await this.resolveDestinationAccount(
      input.listing.sellerId,
    );
    const record: OrderRecord = {
      id: orderId,
      orderNumber: `${input.transactionType === "RESERVATION" ? "RES" : "CMD"}-${orderId.slice(0, 8).toUpperCase()}`,
      transactionType: input.transactionType,
      listingId: input.listing.id,
      listing: input.listing,
      buyerId: input.buyerId,
      sellerId: input.listing.sellerId,
      status: "initiated",
      itemAmount: breakdown.itemAmount,
      itemAmountMinor: breakdown.itemAmountMinor,
      protectionFee: breakdown.protectionFee,
      protectionFeeMinor: breakdown.protectionFeeMinor,
      shippingFee: breakdown.shippingFee,
      shippingFeeMinor: breakdown.shippingFeeMinor,
      totalCharged: breakdown.totalCharged,
      totalChargedMinor: breakdown.totalChargedMinor,
      escrowSecuredAmount: breakdown.escrowSecuredAmount,
      escrowSecuredAmountMinor: breakdown.escrowSecuredAmountMinor,
      currency: market.currency,
      commissionCalculationId: commission.id,
      platformCommissionMinor: commission.totalCommissionMinor,
      sellerPayableMinor: commission.sellerPayableMinor,
      destinationAccountId,
      sellerTransferAmountMinor:
        commission.sellerPayableMinor + breakdown.shippingFeeMinor,
      sellerTransferStatus: "pending",
      commissionSnapshotHash: commission.snapshotHash,
      depositAmount:
        input.transactionType === "RESERVATION"
          ? breakdown.itemAmount
          : undefined,
      remainingBalance:
        input.transactionType === "RESERVATION"
          ? input.remainingBalanceMinor / 100
          : undefined,
      deliveryMethod: input.deliveryMethod,
      shippingAddress: input.shippingAddress,
      handoverCodeRequired: false,
      isPinVerified: false,
      handoverPinAttempts: 0,
      paymentMethod: "stripe_checkout",
      checkoutIdempotencyKey: idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };
    let saved: OrderRecord;
    try {
      saved = await this.orderRepo.create(record);
    } catch (error) {
      const raced =
        await this.orderRepo.findByCheckoutIdempotencyKey(idempotencyKey);
      if (!raced) throw error;
      if (
        raced.buyerId !== input.buyerId ||
        raced.listingId !== input.listing.id ||
        raced.transactionType !== input.transactionType ||
        raced.deliveryMethod !== input.deliveryMethod ||
        raced.totalChargedMinor !== breakdown.totalChargedMinor ||
        raced.currency !== market.currency
      ) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Cette clé d’idempotence a déjà été utilisée pour une autre commande.",
        });
      }
      saved = raced;
    }
    await this.setListingStatus(input.listing.id, "reserved");
    const checkout = await this.ensureProviderCheckout(
      saved,
      input.listing,
      market.code,
      idempotencyKey,
    );
    void analyticsService
      .captureAuthoritative({
        name: "checkout_started",
        marketCode: market.code,
        eventId: `evt_checkout_started_${saved.id}`,
        userId: input.buyerId,
        userType: "buyer",
        properties: {
          listingId: input.listing.id,
          sellerId: input.listing.sellerId,
          orderId: saved.id,
          amountMinor: breakdown.totalChargedMinor,
          currency: market.currency,
        },
      })
      .catch(() => undefined);
    return checkout;
  }

  private async recordSuccessfulPayment(
    order: OrderRecord,
    checkout: {
      id: string;
      amountTotalMinor?: number;
      currency?: string;
      paymentIntentId?: string;
    },
  ): Promise<OrderRecord> {
    const expectedMinor =
      order.totalChargedMinor ?? Math.round(order.totalCharged * 100);
    if (
      checkout.amountTotalMinor !== expectedMinor ||
      checkout.currency?.toUpperCase() !== order.currency.toUpperCase() ||
      !checkout.paymentIntentId?.startsWith("pi_") ||
      (order.paymentIntentId &&
        order.paymentIntentId !== checkout.paymentIntentId)
    ) {
      await this.orderRepo.update(order.id, { status: "disputed" });
      await this.setListingStatus(order.listingId, "reserved");
      throw new AppError({
        code: "CONFLICT",
        message: "Le paiement réconcilié ne correspond pas à la commande.",
      });
    }
    const commission = await this.earnOrderCommission(order);
    const updated = await this.orderRepo.update(order.id, {
      status: "escrow_funded",
      paymentIntentId: checkout.paymentIntentId,
      commissionCalculationId: commission.id,
      platformCommissionMinor: commission.totalCommissionMinor,
      sellerPayableMinor: commission.sellerPayableMinor,
      commissionSnapshotHash: commission.snapshotHash,
    });
    await this.setListingStatus(order.listingId, "reserved");
    void this.emitFinancialAnalytics("transaction_completed", order, {
      listingId: order.listingId,
      sellerId: order.sellerId,
      orderId: order.id,
      transactionId: checkout.paymentIntentId,
      amountMinor: expectedMinor,
      currency: order.currency,
    });
    return updated;
  }

  private async emitFinancialAnalytics(
    name: "transaction_completed" | "refund_completed",
    order: OrderRecord,
    properties: {
      listingId: string;
      sellerId: string;
      orderId: string;
      transactionId: string;
      amountMinor: number;
      currency: string;
    },
  ): Promise<void> {
    try {
      const marketCode =
        order.listing?.marketCode ||
        (await this.listingRepo.findById(order.listingId))?.marketCode;
      if (!marketCode) return;
      await analyticsService.captureAuthoritative({
        name,
        marketCode,
        eventId: `evt_${name}_${properties.transactionId}`,
        userId: order.buyerId,
        userType: "buyer",
        properties,
      });
    } catch {
      // Analytics is non-blocking and cannot change the financial outcome.
    }
  }

  private async cancelReconciledOrder(order: OrderRecord): Promise<boolean> {
    const current = await this.orderRepo.findById(order.id);
    if (
      !current ||
      !["initiated", "payment_pending"].includes(current.status)
    ) {
      return false;
    }
    await this.orderRepo.update(order.id, { status: "cancelled" });
    await this.setListingStatus(order.listingId, "published", "reserved");
    return true;
  }

  private async ensureProviderCheckout(
    order: OrderRecord,
    listing: Listing,
    marketCode: string,
    idempotencyKey: string,
  ): Promise<OrderCheckoutResult> {
    try {
      const checkout = await this.paymentGateway.createCheckout({
        orderId: order.id,
        buyerId: order.buyerId,
        listingId: order.listingId,
        listingTitle: listing.title,
        marketCode,
        currency: order.currency,
        totalAmountMinor:
          order.totalChargedMinor ?? Math.round(order.totalCharged * 100),
        destinationAccountId: order.destinationAccountId,
        idempotencyKey,
      });
      if (order.checkoutSessionId && order.checkoutSessionId !== checkout.id) {
        await this.orderRepo.update(order.id, { status: "disputed" });
        throw new AppError({
          code: "CONFLICT",
          message:
            "Le prestataire a renvoyé une session de paiement incohérente.",
        });
      }
      const updated = await this.orderRepo.update(order.id, {
        checkoutSessionId: checkout.id,
      });
      logger.info("order_checkout_created", {
        orderId: order.id,
        listingId: order.listingId,
        transactionType: order.transactionType,
      });
      return { ...this.toParticipantOrder(updated), checkout };
    } catch (error) {
      logger.error("order_checkout_creation_failed", {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof AppError
        ? error
        : new AppError({
            code: "PAYMENT_FAILED",
            message: "Le paiement n’a pas pu être initialisé.",
            originalError: error,
          });
    }
  }

  private async requirePurchasableListing(
    listingId: string,
    buyerId: string,
    checkoutIdempotencyKey?: string,
  ): Promise<Listing> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      });
    }
    if (listing.sellerId === buyerId) {
      throw new AppError({
        code: "CONFLICT",
        message: "Vous ne pouvez pas acheter votre propre annonce.",
      });
    }
    if (listing.status !== "published") {
      const retry = checkoutIdempotencyKey
        ? await this.orderRepo.findByCheckoutIdempotencyKey(
            checkoutIdempotencyKey,
          )
        : null;
      if (
        retry &&
        retry.listingId === listingId &&
        retry.buyerId === buyerId &&
        !["cancelled", "refunded"].includes(retry.status)
      ) {
        return listing;
      }
      throw new AppError({
        code: "CONFLICT",
        message: "L’annonce n’est plus disponible à l’achat.",
      });
    }
    return listing;
  }

  private async resolveDestinationAccount(
    sellerId: string,
  ): Promise<string | undefined> {
    if (config.paymentProvider !== "stripe") return undefined;
    const records = await this.compliance.listVerificationRecords(sellerId);
    const verified = records.find(
      (record) =>
        ["payment", "payout", "bank_account"].includes(record.dimension) &&
        record.state === "verified" &&
        record.providerReference?.startsWith("acct_"),
    );
    if (!verified?.providerReference) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Le compte de versement du vendeur doit être vérifié avant l’achat.",
        details: { complianceRequired: true, missing: ["payout"] },
      });
    }
    return verified.providerReference;
  }

  private resolveIdempotencyKey(
    value: string | undefined,
    buyerId: string,
    listingId: string,
  ): string {
    if (value !== undefined) {
      if (value.length >= 8 && value.length <= 200) return value;
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La clé d’idempotence doit contenir entre 8 et 200 caractères.",
      });
    }
    if (config.paymentProvider === "demo") {
      return `demo-order:${buyerId}:${listingId}:${randomUUID()}`;
    }
    throw new AppError({
      code: "VALIDATION_ERROR",
      message:
        "Une clé d’idempotence est requise pour initialiser le paiement.",
    });
  }

  private async releaseSellerFunds(
    order: OrderRecord,
  ): Promise<
    Pick<
      OrderRecord,
      "sellerTransferId" | "sellerTransferStatus" | "sellerTransferAmountMinor"
    >
  > {
    if (order.sellerTransferStatus === "completed" && order.sellerTransferId) {
      return {
        sellerTransferId: order.sellerTransferId,
        sellerTransferStatus: "completed",
        sellerTransferAmountMinor: order.sellerTransferAmountMinor,
      };
    }
    const amountMinor =
      order.sellerTransferAmountMinor ?? order.sellerPayableMinor;
    if (!amountMinor || amountMinor <= 0) {
      return {
        sellerTransferStatus: "completed",
        sellerTransferAmountMinor: 0,
      };
    }
    const paymentIntentId =
      order.paymentIntentId ||
      (config.paymentProvider === "demo" ? `pi_demo_${order.id}` : undefined);
    if (!paymentIntentId || !order.destinationAccountId) {
      if (config.paymentProvider === "demo") {
        const released = await this.paymentGateway.releaseSellerFunds({
          orderId: order.id,
          paymentIntentId: paymentIntentId || `pi_demo_${order.id}`,
          destinationAccountId:
            order.destinationAccountId || "acct_demo_seller",
          amountMinor,
          currency: order.currency,
          idempotencyKey: `seller-transfer:${order.id}`,
        });
        return {
          sellerTransferId: released.transferId,
          sellerTransferStatus: "completed",
          sellerTransferAmountMinor: amountMinor,
        };
      }
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le paiement ou le compte vendeur requis pour le versement est manquant.",
      });
    }
    const released = await this.paymentGateway.releaseSellerFunds({
      orderId: order.id,
      paymentIntentId,
      destinationAccountId: order.destinationAccountId,
      amountMinor,
      currency: order.currency,
      idempotencyKey: `seller-transfer:${order.id}`,
    });
    return {
      sellerTransferId: released.transferId,
      sellerTransferStatus: released.status,
      sellerTransferAmountMinor: amountMinor,
    };
  }

  private async earnOrderCommission(order: OrderRecord) {
    if (!order.commissionCalculationId) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le devis de commission de la commande est introuvable.",
      });
    }
    const locked = await this.commissions.getCalculation(
      order.commissionCalculationId,
    );
    if (
      locked.totalCommissionMinor !== order.platformCommissionMinor ||
      locked.sellerPayableMinor !== order.sellerPayableMinor
    ) {
      await this.orderRepo.update(order.id, { status: "disputed" });
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le devis financier de la commande ne correspond plus au paiement.",
      });
    }
    const earned = await this.commissions.earnQuote(
      order.commissionCalculationId,
      {
        transactionId: order.id,
        idempotencyKey: `commission:order:${order.id}:earned`,
        effectiveAt: new Date().toISOString(),
      },
    );
    return earned;
  }

  private async setListingStatus(
    listingId: string,
    status: Listing["status"],
    onlyFrom?: Listing["status"],
  ): Promise<void> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing || (onlyFrom && listing.status !== onlyFrom)) return;
    if (listing.status !== status)
      await this.listingRepo.update(listingId, { status });
  }

  private async requireOrder(orderId: string): Promise<OrderRecord> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    }
    return order;
  }

  private hashHandoverCode(orderId: string, code: string): string {
    const salt = randomBytes(16).toString("base64url");
    const digest = createHmac("sha256", config.handoverPinPepper)
      .update(`${orderId}:${salt}:${code}`)
      .digest("hex");
    return `v1$${salt}$${digest}`;
  }

  private matchesHandoverCode(
    orderId: string,
    code: string,
    encoded: string,
  ): boolean {
    const [version, salt, expectedHex] = encoded.split("$");
    if (version !== "v1" || !salt || !expectedHex) return false;
    const actualHex = createHmac("sha256", config.handoverPinPepper)
      .update(`${orderId}:${salt}:${code}`)
      .digest("hex");
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(actualHex, "hex");
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private async finalizeRefund(order: OrderRecord) {
    if (!order.refundBaseMinor || !order.refundIdempotencyKey) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le remboursement ne possède pas de ventilation persistée.",
      });
    }
    const commissionReversal =
      order.commissionCalculationId && (order.platformCommissionMinor || 0) > 0
        ? await this.commissions.reverse(order.commissionCalculationId, {
            refundBaseMinor: order.refundBaseMinor,
            idempotencyKey: `${order.refundIdempotencyKey}:commission`,
          })
        : null;
    const updated = await this.orderRepo.update(order.id, {
      status: "refunded",
    });
    await this.setListingStatus(order.listingId, "published", "reserved");
    return { order: updated, commissionReversal };
  }

  private toParticipantOrder(order: OrderRecord): Transaction {
    const {
      checkoutIdempotencyKey: _checkoutIdempotencyKey,
      checkoutSessionId: _checkoutSessionId,
      paymentIntentId: _paymentIntentId,
      destinationAccountId: _destinationAccountId,
      sellerTransferId: _sellerTransferId,
      sellerTransferAmountMinor: _sellerTransferAmountMinor,
      sellerTransferStatus: _sellerTransferStatus,
      handoverPinHash: _handoverPinHash,
      handoverPinIssuedAt: _handoverPinIssuedAt,
      handoverPinAttempts: _handoverPinAttempts,
      handoverPinLockedUntil: _handoverPinLockedUntil,
      refundProviderId: _refundProviderId,
      refundBaseMinor: _refundBaseMinor,
      refundIdempotencyKey: _refundIdempotencyKey,
      commissionCalculationId: _commissionCalculationId,
      platformCommissionMinor: _platformCommissionMinor,
      sellerPayableMinor: _sellerPayableMinor,
      commissionSnapshotHash: _commissionSnapshotHash,
      buyer: _buyer,
      seller: _seller,
      listing,
      ...participantOrder
    } = order;
    return {
      ...participantOrder,
      ...(listing ? { listing: toPublicListing(listing) } : {}),
    };
  }
}

export const ordersService = new OrdersService();
