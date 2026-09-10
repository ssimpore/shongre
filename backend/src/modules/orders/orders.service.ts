import { taxonomyV1Service } from "../taxonomy/taxonomy.runtime.js";
import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import {
  orderReturnDecisionSchema,
  orderReturnRequestSchema,
  orderReturnShipmentSchema,
} from "@shongre/contracts/orders";
import { config } from "../../app/config/index.js";
import type { IComplianceRepository } from "../../infrastructure/database/repositories/compliance.repository.js";
import type { IListingRepository } from "../../infrastructure/database/repositories/listing.repository.js";
import type { IMarketRepository } from "../../infrastructure/database/repositories/market.repository.js";
import type {
  IOrderRepository,
  OrderRecord,
  OrderReturnReason,
  OrderReturnRecord,
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
import { listingLocationPolicy } from "../geo/geo.runtime.js";
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
import {
  digitalProductsService,
  type DigitalProductsService,
} from "../digital-products/digital-products.service.js";

const DEFAULT_HOME_DELIVERY_MINOR =
  BASELINE_MONETIZATION_CATALOG.products.find(
    (product) => product.id === "delivery.home",
  )?.prices[0]?.amount.amountMinor || 0;
const HANDOVER_CODE_TTL_MS = 30 * 60 * 1_000;
const CHECKOUT_RECONCILIATION_AGE_MS = 15 * 60 * 1_000;
const CHECKOUT_WITHOUT_REFERENCE_EXPIRY_MS = 26 * 60 * 60 * 1_000;

/**
 * Statutory withdrawal window for a consumer buying from a trader. Fourteen
 * days is the floor the right sets; a market that grants longer changes this
 * one constant.
 */
const STATUTORY_WITHDRAWAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1_000;
/** Window for a return claimed on the item's condition rather than the right. */
const CONDITION_RETURN_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;
/** Order states from which a return can still be asked for. */
const RETURNABLE_ORDER_STATUSES = new Set([
  "escrow_funded",
  "shipped",
  "pin_pending",
  "completed",
  "disputed",
]);

/**
 * Provider events that concern a card-network dispute rather than the
 * platform's own refund. Their payload is a Dispute or an early fraud warning,
 * which carries no Shongre metadata, so the order is found by payment intent.
 */
const PROVIDER_DISPUTE_EVENTS = new Set([
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "charge.dispute.funds_withdrawn",
  "charge.dispute.funds_reinstated",
  "radar.early_fraud_warning.created",
]);

/** Provider dispute states, narrowed to the states the order records. */
const PROVIDER_DISPUTE_STATUS: Record<
  string,
  NonNullable<OrderRecord["chargebackStatus"]>
> = {
  warning_needs_response: "warning",
  warning_under_review: "warning",
  warning_closed: "withdrawn",
  needs_response: "open",
  under_review: "under_review",
  won: "won",
  lost: "lost",
};

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
    private readonly digitalProducts: DigitalProductsService = digitalProductsService,
  ) {}

  async getOrderById(orderId: string): Promise<Transaction | null> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) return null;
    const listing =
      order.listing ?? (await this.listingRepo.findById(order.listingId));
    return this.toParticipantOrder({
      ...order,
      ...(listing ? { listing } : {}),
    });
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    return Promise.all(
      (await this.orderRepo.getPurchases(userId)).map((order) =>
        this.toParticipantOrder(order),
      ),
    );
  }

  async getSales(userId: string): Promise<Transaction[]> {
    return Promise.all(
      (await this.orderRepo.getSales(userId)).map((order) =>
        this.toParticipantOrder(order),
      ),
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
    const isDigital = (listing.fulfillmentModel || "PHYSICAL") !== "PHYSICAL";
    if (isDigital) {
      if (input.deliveryMethod !== "digital") {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Ce produit est remis uniquement en ligne.",
        });
      }
      await this.digitalProducts.assertListingCheckout(
        listing.id,
        listing.marketCode,
      );
    } else if (
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
      !isDigital &&
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
      isDigital || input.deliveryMethod === "hand_delivery"
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
    const isDigital = (listing.fulfillmentModel || "PHYSICAL") !== "PHYSICAL";
    if (isDigital) {
      if (input.deliveryMethod !== "digital") {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Ce produit est remis uniquement en ligne.",
        });
      }
      await this.digitalProducts.assertListingCheckout(
        listing.id,
        listing.marketCode,
      );
    } else if (
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
      isDigital || input.deliveryMethod === "hand_delivery"
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

  /**
   * Prices a visible listing for display, with no buyer and no purchasability
   * check.
   *
   * `quoteDirectPurchase` needs `permission("order.create")` because it decides
   * whether *this buyer* may purchase, and it is the only thing that could put
   * a number on the listing page's price disclosure. So a signed-out visitor —
   * every visitor arriving from a search engine — saw "Protection acheteur:
   * selon le mode de remise", "Livraison: selon l'option choisie" and, worst of
   * all, "Total: confirmé avant paiement". Three of four rows were placeholders,
   * including the one row that has to be a number.
   *
   * Recomputing the fee in the Web client was the alternative, and the wrong
   * one: `calculateOrderTotal` and the market's fee policy are the authority for
   * an amount a buyer will be charged, and a second implementation of it in the
   * browser is exactly the drift a legally-disclosed price cannot afford. This
   * shares that authority instead, so the disclosed total and the checkout total
   * cannot disagree.
   *
   * It deliberately reveals nothing a visitor cannot already see: the listing is
   * public, and the fee policy is per market, not per buyer.
   */
  async quoteListingPrice(input: {
    listingId: string;
    deliveryMethod?: DeliveryType;
  }): Promise<DirectPurchaseQuote> {
    const listing = await this.listingRepo.findById(input.listingId);
    if (!listing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      });
    }
    const market = await this.markets.getEffective(listing.marketCode);
    const isDigital = (listing.fulfillmentModel || "PHYSICAL") !== "PHYSICAL";
    const deliveryMethod = isDigital
      ? "digital"
      : this.cheapestQuotableDelivery(listing, market, input.deliveryMethod);

    const shippingFeeMinor = this.shippingFeeMinorFor(listing, deliveryMethod);
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
      deliveryMethod,
      itemAmountMinor: breakdown.itemAmountMinor,
      protectionFeeMinor: breakdown.protectionFeeMinor,
      shippingFeeMinor: breakdown.shippingFeeMinor,
      totalAmountMinor: breakdown.totalChargedMinor,
      currency: market.currency,
    };
  }

  /** Hand delivery and digital fulfilment carry no delivery fee. */
  private shippingFeeMinorFor(
    listing: Listing,
    deliveryMethod: DeliveryType,
  ): number {
    if (deliveryMethod === "hand_delivery" || deliveryMethod === "digital") {
      return 0;
    }
    return listing.shippingCost !== undefined
      ? Math.max(0, Math.round(listing.shippingCost * 100))
      : DEFAULT_HOME_DELIVERY_MINOR;
  }

  /**
   * The method to price when the caller names none.
   *
   * The cheapest one the listing and the market both allow, so the disclosed
   * total is the lowest total the buyer could actually reach rather than an
   * arbitrary first entry. A requested method is honoured when it is allowed,
   * and otherwise ignored rather than rejected: this endpoint exists to display
   * a price, and refusing to show one because a query parameter is stale would
   * put the placeholder back on the page.
   */
  private cheapestQuotableDelivery(
    listing: Listing,
    market: { allowedDeliveryMethods: DeliveryType[] },
    requested?: DeliveryType,
  ): DeliveryType {
    const allowed = listing.allowedDelivery.filter((method) =>
      market.allowedDeliveryMethods.includes(method),
    );
    if (requested && allowed.includes(requested)) return requested;
    if (allowed.length === 0) return "hand_delivery";
    return allowed.reduce((cheapest, candidate) =>
      this.shippingFeeMinorFor(listing, candidate) <
      this.shippingFeeMinorFor(listing, cheapest)
        ? candidate
        : cheapest,
    );
  }

  async createReservation(
    input: CreateReservationInput,
  ): Promise<OrderCheckoutResult> {
    const listing = await this.requirePurchasableListing(
      input.listingId,
      input.buyerId,
      input.idempotencyKey,
    );
    if ((listing.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "La réservation physique n’est pas disponible pour un produit numérique.",
      });
    }
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
    if ((order.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Un accès numérique ne se confirme pas comme une livraison physique.",
      });
    }
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
    if ((order.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
      throw new AppError({
        code: "CONFLICT",
        message: "Un produit numérique ne peut pas être déclaré expédié.",
      });
    }
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
    if ((order.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
      await this.digitalProducts.applyAuthoritativeOrderAccessState(
        order.id,
        "DISPUTED",
      );
    }
    logger.warn("order_dispute_opened", { orderId, userId });
    return this.toParticipantOrder(updated);
  }

  async refundOrder(
    orderId: string,
    input: {
      refundBaseMinor?: number;
      idempotencyKey: string;
      reason?: string;
      actorId?: string;
    },
  ) {
    const order = await this.requireOrder(orderId);
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence est requise pour le remboursement.",
      });
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
    const alreadyRefundedBaseMinor = order.refundedBaseTotalMinor ?? 0;
    const remainingBaseMinor = Math.max(
      0,
      fullBaseMinor - alreadyRefundedBaseMinor,
    );
    const refundBaseMinor = input.refundBaseMinor ?? remainingBaseMinor;
    if (
      !Number.isSafeInteger(refundBaseMinor) ||
      refundBaseMinor <= 0 ||
      refundBaseMinor > remainingBaseMinor
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          remainingBaseMinor === 0
            ? "Cette commande est déjà intégralement remboursée."
            : `Le montant remboursable restant est de ${remainingBaseMinor} centièmes.`,
      });
    }
    const isFullRefund = refundBaseMinor === remainingBaseMinor;
    const totalChargedMinor =
      order.totalChargedMinor ?? Math.round(order.totalCharged * 100);
    /*
     * A refund that closes out the order returns everything the buyer paid
     * and has not already been given back — fees included. Netting off the
     * ledger matters: refunding the full charge after an earlier partial
     * refund would credit the buyer more than they ever paid.
     *
     * A partial refund returns the item value asked for and leaves the fees
     * alone, because the service they paid for — escrow, delivery — was still
     * performed.
     */
    const alreadyCreditedMinor = (await this.orderRepo.listRefunds(orderId))
      .filter(
        (entry) => entry.status !== "failed" && entry.status !== "cancelled",
      )
      .reduce((total, entry) => total + entry.refundedMinor, 0);
    const totalMinor = isFullRefund
      ? totalChargedMinor -
        alreadyCreditedMinor -
        this.refundedFeesMinor(order, fullBaseMinor)
      : refundBaseMinor;
    if (totalMinor <= 0) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le montant déjà remboursé couvre cette commande.",
      });
    }

    // The database owns refund uniqueness, so a replayed request returns the
    // refund it already created instead of issuing a second one.
    const claim = await this.orderRepo.claimRefund({
      orderId,
      idempotencyKey: input.idempotencyKey,
      baseMinor: refundBaseMinor,
      refundedMinor: totalMinor,
      currency: order.currency,
      isFull: isFullRefund,
      reason: input.reason,
      actorId: input.actorId,
    });
    if (!claim.created) {
      return {
        order: await this.toParticipantOrder(order),
        commissionReversal: null,
        providerRefund: {
          id: claim.refund.providerRefundId || "",
          status: claim.refund.status,
        },
      };
    }
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
    /*
     * The seller transfer is clawed back in proportion to the item value
     * refunded so far, not to this one refund. Deriving it from the cumulative
     * total is what makes a sequence of partial refunds add up to exactly the
     * transfer: reversing per-refund would leave rounding behind, and reversing
     * the whole transfer for a partial refund would take money the seller is
     * still owed for the part of the order that stands.
     */
    const reversibleTransfer =
      (order.sellerTransferStatus === "completed" ||
        order.sellerTransferStatus === "partially_reversed") &&
      order.sellerTransferAmountMinor
        ? order.sellerTransferAmountMinor
        : 0;
    const proportionalReversal = (refundedBaseMinor: number) =>
      Math.min(
        reversibleTransfer,
        Math.round(
          (reversibleTransfer * refundedBaseMinor) / Math.max(1, fullBaseMinor),
        ),
      );
    const reversedSoFarMinor = proportionalReversal(alreadyRefundedBaseMinor);
    const reversalTargetMinor = isFullRefund
      ? reversibleTransfer
      : proportionalReversal(alreadyRefundedBaseMinor + refundBaseMinor);
    const transferReversalMinor =
      reversalTargetMinor > reversedSoFarMinor
        ? reversalTargetMinor - reversedSoFarMinor
        : undefined;
    const refund = await this.paymentGateway.refund({
      orderId,
      paymentIntentId,
      amountMinor: totalMinor,
      transferId: transferReversalMinor ? order.sellerTransferId : undefined,
      transferReversalAmountMinor: transferReversalMinor,
      idempotencyKey: input.idempotencyKey,
    });
    await this.orderRepo.updateRefund(claim.refund.id, {
      providerRefundId: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : "pending",
    });
    const refundedBaseTotalMinor = alreadyRefundedBaseMinor + refundBaseMinor;
    const pending = await this.orderRepo.update(orderId, {
      // A partial refund leaves the order in its fulfilled state: money went
      // back, but the sale itself still stands for the remainder.
      ...(isFullRefund ? { status: "refund_pending" as const } : {}),
      refundProviderId: refund.id,
      refundBaseMinor,
      refundedBaseTotalMinor,
      refundIdempotencyKey: input.idempotencyKey,
      ...(transferReversalMinor
        ? {
            sellerTransferStatus:
              reversalTargetMinor >= reversibleTransfer
                ? ("reversed" as const)
                : ("partially_reversed" as const),
          }
        : {}),
    });
    if (isFullRefund && (order.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
      await this.digitalProducts.applyAuthoritativeOrderAccessState(
        order.id,
        "REFUND_REQUESTED",
      );
    }
    let finalizedOrder = pending;
    let commissionReversal = null;
    if (refund.status === "succeeded") {
      // The commission engine reverses proportionally and remembers what it
      // already reversed, so a partial refund needs no special case here.
      if (isFullRefund) {
        const finalized = await this.finalizeRefund(pending);
        finalizedOrder = finalized.order;
        commissionReversal = finalized.commissionReversal;
      } else {
        commissionReversal = await this.reverseOrderCommission(
          order,
          refundBaseMinor,
          input.idempotencyKey,
        );
      }
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
      order: await this.toParticipantOrder(finalizedOrder),
      commissionReversal,
      providerRefund: refund,
    };
  }

  /**
   * Fees the platform keeps on a refund.
   *
   * Zero today: a refund that closes an order returns everything the buyer
   * paid. It exists as one named place so a market that decides to retain a
   * processing fee changes this and nothing else.
   */
  private refundedFeesMinor(_order: OrderRecord, _fullBaseMinor: number) {
    return 0;
  }

  private async reverseOrderCommission(
    order: OrderRecord,
    refundBaseMinor: number,
    idempotencyKey: string,
  ) {
    if (
      !order.commissionCalculationId ||
      (order.platformCommissionMinor || 0) <= 0
    ) {
      return null;
    }
    return this.commissions.reverse(order.commissionCalculationId, {
      refundBaseMinor,
      idempotencyKey: `${idempotencyKey}:commission`,
    });
  }

  /**
   * Records a buyer's return request.
   *
   * Two different things arrive through here. A statutory withdrawal is a
   * right: the buyer owes no reason and the seller cannot refuse it, so it is
   * marked as such and the decision step can only accept it. Everything else
   * is a claim about the item, which the seller may accept or refuse with a
   * reason. Eligibility for the right comes from who sold — it exists for a
   * consumer buying from a trader, not for a private sale between two people.
   */
  async requestReturn(
    orderId: string,
    buyerId: string,
    input: { reason: OrderReturnReason; details: string },
  ): Promise<OrderReturnRecord> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== buyerId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul l’acheteur peut demander un retour.",
      });
    }
    const parsedRequest = orderReturnRequestSchema.safeParse({
      reason: input.reason,
      details: input.details,
    });
    if (!parsedRequest.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Un motif valide et une description de 10 à 5 000 caractères sont requis.",
      });
    }
    const details = parsedRequest.data.details;
    if (!RETURNABLE_ORDER_STATUSES.has(order.status)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette commande n’accepte pas de retour dans son état actuel.",
      });
    }
    const fullBaseMinor =
      order.itemAmountMinor ?? Math.round(order.itemAmount * 100);
    const remainingBaseMinor =
      fullBaseMinor - (order.refundedBaseTotalMinor ?? 0);
    if (remainingBaseMinor <= 0) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette commande est déjà intégralement remboursée.",
      });
    }

    const listing = await this.listingRepo.findById(order.listingId);
    const soldByTrader = listing?.publisherType === "professional";
    const isStatutoryWithdrawal = input.reason === "withdrawal" && soldByTrader;
    if (input.reason === "withdrawal" && !soldByTrader) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le droit de rétractation s’applique aux achats auprès d’un vendeur professionnel. Ouvrez une contestation pour une vente entre particuliers.",
      });
    }

    // The clock starts at delivery where one is recorded, and at payment
    // otherwise, so a seller cannot shorten the window by never shipping.
    const startedAt = Date.parse(
      order.shippedAt || order.createdAt || new Date().toISOString(),
    );
    const windowMs = isStatutoryWithdrawal
      ? STATUTORY_WITHDRAWAL_WINDOW_MS
      : CONDITION_RETURN_WINDOW_MS;
    const expiresAt = startedAt + windowMs;
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le délai de retour de cette commande est écoulé.",
      });
    }

    const created = await this.orderRepo.createReturn({
      orderId,
      requesterId: buyerId,
      reason: input.reason,
      details,
      isStatutoryWithdrawal,
      requestedBaseMinor: remainingBaseMinor,
      currency: order.currency,
      windowExpiresAt: new Date(expiresAt).toISOString(),
    });
    logger.info("order_return_requested", {
      orderId,
      returnId: created.id,
      reason: created.reason,
      isStatutoryWithdrawal,
    });
    return created;
  }

  /** The seller's answer. A statutory withdrawal may only be accepted. */
  async decideReturn(
    returnId: string,
    sellerId: string,
    input: { approve: boolean; note?: string },
  ): Promise<OrderReturnRecord> {
    const { record, order } = await this.requireReturnParticipant(
      returnId,
      sellerId,
      "seller",
    );
    if (record.status !== "requested") {
      throw new AppError({
        code: "CONFLICT",
        message: "Ce retour a déjà été traité.",
      });
    }
    if (record.isStatutoryWithdrawal && !input.approve) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Une rétractation légale ne peut pas être refusée. Acceptez le retour puis remboursez à réception.",
      });
    }
    const parsedDecision = orderReturnDecisionSchema.safeParse({
      approve: input.approve,
      note: input.note,
    });
    const note = parsedDecision.success ? (parsedDecision.data.note ?? "") : "";
    if (!parsedDecision.success || (!input.approve && note.length < 1)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un refus de retour doit être motivé.",
      });
    }
    const decided = await this.orderRepo.updateReturn(returnId, {
      status: input.approve ? "approved" : "rejected",
      decidedBy: sellerId,
      decidedAt: new Date().toISOString(),
      decisionNote: note || undefined,
    });
    logger.info("order_return_decided", {
      orderId: order.id,
      returnId,
      approved: input.approve,
    });
    return decided;
  }

  /** The buyer sends the item back. */
  async markReturnShipped(
    returnId: string,
    buyerId: string,
    input: { carrierName?: string; trackingNumber?: string },
  ): Promise<OrderReturnRecord> {
    const { record } = await this.requireReturnParticipant(
      returnId,
      buyerId,
      "buyer",
    );
    if (record.status !== "approved") {
      throw new AppError({
        code: "CONFLICT",
        message: "Ce retour doit d’abord être accepté.",
      });
    }
    const shipment = orderReturnShipmentSchema.safeParse(input);
    if (!shipment.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Les informations de renvoi sont invalides.",
      });
    }
    return this.orderRepo.updateReturn(returnId, {
      status: "shipped",
      carrierName: shipment.data.carrierName || undefined,
      trackingNumber: shipment.data.trackingNumber || undefined,
      shippedAt: new Date().toISOString(),
    });
  }

  /**
   * The seller confirms the item is back, which is what releases the money.
   *
   * The refund runs through the same path as any other refund, so the
   * commission reversal, the transfer claw-back and the ledger entry are the
   * ones that were already proven rather than a second implementation.
   */
  async confirmReturnReceived(
    returnId: string,
    sellerId: string,
  ): Promise<{ return: OrderReturnRecord; refundIssued: boolean }> {
    const { record, order } = await this.requireReturnParticipant(
      returnId,
      sellerId,
      "seller",
    );
    if (!["approved", "shipped"].includes(record.status)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Ce retour n’est pas en attente de réception.",
      });
    }
    const received = await this.orderRepo.updateReturn(returnId, {
      status: "received",
      receivedAt: new Date().toISOString(),
      decidedBy: record.decidedBy ?? sellerId,
      decidedAt: record.decidedAt ?? new Date().toISOString(),
    });
    const refund = await this.refundOrder(order.id, {
      refundBaseMinor: Math.min(
        record.requestedBaseMinor,
        (order.itemAmountMinor ?? Math.round(order.itemAmount * 100)) -
          (order.refundedBaseTotalMinor ?? 0),
      ),
      idempotencyKey: `return:${returnId}`,
      reason: `return:${record.reason}`,
      actorId: sellerId,
    });
    const refundIssued = refund.providerRefund.status === "succeeded";
    const settled = await this.orderRepo.updateReturn(returnId, {
      status: refundIssued ? "refunded" : "received",
    });
    logger.info("order_return_received", {
      orderId: order.id,
      returnId,
      refundIssued,
    });
    return { return: refundIssued ? settled : received, refundIssued };
  }

  async listOrderReturns(
    orderId: string,
    userId: string,
  ): Promise<OrderReturnRecord[]> {
    const order = await this.requireOrder(orderId);
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    }
    return this.orderRepo.listReturns(orderId);
  }

  /** Closes return requests nobody answered inside the window. */
  async expireStaleReturns(limit = 500): Promise<{ expired: number }> {
    const expired = await this.orderRepo.expireStaleReturns(limit);
    if (expired > 0) {
      logger.info("order_returns_expired", { expired });
    }
    return { expired };
  }

  private async requireReturnParticipant(
    returnId: string,
    userId: string,
    as: "buyer" | "seller",
  ): Promise<{ record: OrderReturnRecord; order: OrderRecord }> {
    const record = await this.orderRepo.findReturnById(returnId);
    if (!record) {
      throw new AppError({ code: "NOT_FOUND", message: "Retour introuvable." });
    }
    const order = await this.requireOrder(record.orderId);
    const expected = as === "buyer" ? order.buyerId : order.sellerId;
    if (expected !== userId) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          as === "buyer"
            ? "Seul l’acheteur peut effectuer cette action."
            : "Seul le vendeur peut effectuer cette action.",
      });
    }
    return { record, order };
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
    if (PROVIDER_DISPUTE_EVENTS.has(eventType)) {
      return this.handleProviderDisputeEvent(event, rawBody);
    }
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

  /**
   * Records a card-network dispute against the order it belongs to.
   *
   * A chargeback is not a refund: the network has already moved the money out
   * of the platform balance, so this path must never call the refund gateway —
   * doing so would credit the buyer twice. What it does instead is recover the
   * seller leg, reverse the commission that was earned on a sale that did not
   * hold, and put the order into `disputed`, which already blocks payout and
   * completion.
   *
   * The Dispute and EarlyFraudWarning payloads carry no Shongre metadata, so
   * the order is correlated through the payment intent. A unique index on the
   * provider dispute id is what keeps a replayed event from being applied to a
   * second order.
   */
  private async handleProviderDisputeEvent(event: any, rawBody: string) {
    const eventType = String(event?.type || "");
    const object = event?.data?.object || {};
    const eventId = String(event?.id || "");
    const paymentIntentId = String(object.payment_intent || "");
    const disputeId = String(object.id || "");
    if (!eventId || !disputeId || !paymentIntentId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Événement de litige fournisseur incomplet.",
      });
    }

    const order = await this.orderRepo.findByPaymentIntentId(paymentIntentId);
    if (!order) {
      return { processed: false, reason: "not_marketplace_order", eventId };
    }
    if (
      order.chargebackProviderId &&
      order.chargebackProviderId !== disputeId
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Un autre litige est déjà enregistré pour cette commande.",
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

    const isEarlyFraudWarning =
      eventType === "radar.early_fraud_warning.created";
    const chargebackStatus = isEarlyFraudWarning
      ? "warning"
      : (PROVIDER_DISPUTE_STATUS[String(object.status || "")] ?? "open");
    const amountMinor = Number(object.amount);
    const occurredAt = Number.isFinite(Number(event?.created))
      ? new Date(Number(event.created) * 1_000).toISOString()
      : new Date().toISOString();
    const fundsLost =
      eventType === "charge.dispute.funds_withdrawn" ||
      chargebackStatus === "lost";
    const closed = ["won", "lost", "withdrawn"].includes(chargebackStatus);

    const updates: Partial<OrderRecord> = {
      chargebackProviderId: disputeId,
      chargebackStatus,
      chargebackReason: String(
        object.reason || (isEarlyFraudWarning ? object.fraud_type : "") || "",
      ).slice(0, 200),
      chargebackOpenedAt: order.chargebackOpenedAt || occurredAt,
      chargebackClosedAt: closed ? occurredAt : undefined,
      ...(Number.isSafeInteger(amountMinor) && amountMinor > 0
        ? { chargebackAmountMinor: amountMinor }
        : {}),
    };

    // The seller leg and the commission are only unwound once the money has
    // actually left. A warning or an open dispute may still be won.
    let commissionReversal = null;
    if (fundsLost) {
      updates.status = "disputed";
      if (
        order.sellerTransferStatus === "completed" &&
        order.sellerTransferId
      ) {
        await this.paymentGateway.reverseSellerTransfer({
          orderId: order.id,
          transferId: order.sellerTransferId,
          amountMinor: order.sellerTransferAmountMinor,
          idempotencyKey: `chargeback:${disputeId}:transfer-reversal`,
        });
        updates.sellerTransferStatus = "reversed";
      }
      if (
        order.commissionCalculationId &&
        (order.platformCommissionMinor || 0) > 0
      ) {
        commissionReversal = await this.commissions.reverse(
          order.commissionCalculationId,
          {
            refundBaseMinor:
              order.itemAmountMinor ?? Math.round(order.itemAmount * 100),
            idempotencyKey: `chargeback:${disputeId}:commission`,
          },
        );
      }
      if ((order.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
        await this.digitalProducts.applyAuthoritativeOrderAccessState(
          order.id,
          "DISPUTED",
        );
      }
    } else if (!closed) {
      updates.status = "disputed";
    }

    const updated = await this.orderRepo.update(order.id, updates);

    if (fundsLost) {
      void this.emitFinancialAnalytics("refund_completed", order, {
        listingId: order.listingId,
        sellerId: order.sellerId,
        orderId: order.id,
        transactionId: disputeId,
        amountMinor:
          updates.chargebackAmountMinor ??
          order.totalChargedMinor ??
          Math.round(order.totalCharged * 100),
        currency: order.currency,
      });
    }
    // A won dispute returns the money to the platform after the seller leg was
    // already recovered, so settling the seller again is an operator decision
    // rather than something to do silently.
    logger.warn("order_chargeback_recorded", {
      orderId: order.id,
      disputeId,
      eventType,
      chargebackStatus,
      fundsLost,
      sellerSettlementReviewRequired: chargebackStatus === "won",
    });

    await this.compliance.completeProviderEvent({
      provider: "stripe_marketplace_orders",
      eventId,
      payloadHash,
    });
    return {
      processed: true,
      state: updated.status,
      chargebackStatus,
      commissionReversal,
      eventId,
    };
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
      fulfillmentModel: input.listing.fulfillmentModel || "PHYSICAL",
      digitalFulfillmentVersionId: input.listing.digitalFulfillmentVersionId,
      productVersion: input.listing.productVersion,
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
    if ((input.listing.fulfillmentModel || "PHYSICAL") === "PHYSICAL") {
      await this.setListingStatus(input.listing.id, "reserved");
    }
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
    if ((updated.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
      await this.digitalProducts.confirmAuthoritativePayment(
        updated.id,
        checkout.paymentIntentId,
      );
    }
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
      return { ...(await this.toParticipantOrder(updated)), checkout };
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
    if ((listing.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") return;
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
    const commissionReversal = await this.reverseOrderCommission(
      order,
      order.refundBaseMinor,
      order.refundIdempotencyKey,
    );
    const updated = await this.orderRepo.update(order.id, {
      status: "refunded",
    });
    if ((order.fulfillmentModel || "PHYSICAL") !== "PHYSICAL") {
      await this.digitalProducts.applyAuthoritativeOrderAccessState(
        order.id,
        "REFUNDED",
      );
    }
    await this.setListingStatus(order.listingId, "published", "reserved");
    return { order: updated, commissionReversal };
  }

  private async toParticipantOrder(order: OrderRecord): Promise<Transaction> {
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
      ...(listing
        ? {
            listing: toPublicListing(
              listing,
              await taxonomyV1Service.snapshot(),
              listingLocationPolicy,
            ),
          }
        : {}),
    };
  }
}

export const ordersService = new OrdersService();
