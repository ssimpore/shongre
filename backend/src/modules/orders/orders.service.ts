import { Transaction, DeliveryType } from "../../shared/types/index.js";
import { calculateOrderTotal } from "../../shared/money/escrow.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  IOrderRepository,
  IListingRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";

const DEFAULT_HOME_DELIVERY_MINOR =
  BASELINE_MONETIZATION_CATALOG.products.find(
    (product) => product.id === "delivery.home",
  )?.prices[0]?.amount.amountMinor || 0;

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
  paymentMethod: "card" | "bank_transfer" | "wallet";
}

export interface CreateReservationInput {
  listingId: string;
  buyerId: string;
  depositAmount: number;
  remainingAmount: number;
  agreedLocation: string;
  scheduledDate?: string;
}

export class OrdersService {
  constructor(
    private orderRepo: IOrderRepository = repositories.orders,
    private listingRepo: IListingRepository = repositories.listings,
  ) {}

  async getOrderById(orderId: string): Promise<Transaction | null> {
    return this.orderRepo.findById(orderId);
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    return this.orderRepo.getPurchases(userId);
  }

  async getSales(userId: string): Promise<Transaction[]> {
    return this.orderRepo.getSales(userId);
  }

  async createDirectPurchase(
    input: CreateDirectPurchaseInput,
  ): Promise<Transaction> {
    const listing = await this.listingRepo.findById(input.listingId);
    if (!listing) {
      throw new AppError({ code: "NOT_FOUND", message: "Annonce introuvable" });
    }

    if (listing.status !== "published") {
      throw new AppError({
        code: "CONFLICT",
        message: "L'annonce n'est plus disponible à l'achat",
      });
    }

    const shippingFee =
      input.deliveryMethod === "hand_delivery"
        ? 0
        : listing.shippingCost || DEFAULT_HOME_DELIVERY_MINOR / 100;
    const breakdown = calculateOrderTotal({
      itemAmount: listing.price,
      shippingFee,
      marketCode: listing.marketCode,
    });

    const handoverPin =
      input.deliveryMethod === "hand_delivery"
        ? randomInt(1000, 10_000).toString()
        : undefined;

    const orderId = randomUUID();
    const transaction: Transaction = {
      id: orderId,
      orderNumber: `CMD-${orderId.substring(4, 10).toUpperCase()}`,
      transactionType: "DIRECT_PURCHASE",
      listingId: listing.id,
      listing,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
      status: "escrow_funded",
      itemAmount: breakdown.itemAmount,
      protectionFee: breakdown.protectionFee,
      shippingFee: breakdown.shippingFee,
      totalCharged: breakdown.totalCharged,
      escrowSecuredAmount: breakdown.escrowSecuredAmount,
      deliveryMethod: input.deliveryMethod,
      shippingAddress: input.shippingAddress,
      handoverPin,
      isPinVerified: false,
      paymentMethod: input.paymentMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.orderRepo.create(transaction);
    logger.info("Direct purchase created and escrow funded", {
      orderId: saved.id,
    });
    return saved;
  }

  async createReservation(input: CreateReservationInput): Promise<Transaction> {
    const listing = await this.listingRepo.findById(input.listingId);
    if (!listing) {
      throw new AppError({ code: "NOT_FOUND", message: "Annonce introuvable" });
    }

    const breakdown = calculateOrderTotal({
      itemAmount: input.depositAmount,
      shippingFee: 0,
      marketCode: listing.marketCode,
    });

    const orderId = randomUUID();
    const transaction: Transaction = {
      id: orderId,
      orderNumber: `RES-${orderId.substring(4, 10).toUpperCase()}`,
      transactionType: "RESERVATION",
      listingId: listing.id,
      listing,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
      status: "escrow_funded",
      itemAmount: input.depositAmount,
      protectionFee: breakdown.protectionFee,
      shippingFee: 0,
      totalCharged: breakdown.totalCharged,
      escrowSecuredAmount: breakdown.escrowSecuredAmount,
      depositAmount: input.depositAmount,
      remainingBalance: input.remainingAmount,
      deliveryMethod: "hand_delivery",
      paymentMethod: "card",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.orderRepo.create(transaction);
    logger.info("Reservation created and escrow funded", { orderId: saved.id });
    return saved;
  }

  async confirmHandoverPIN(
    orderId: string,
    enteredPin: string,
  ): Promise<{ success: boolean; message: string }> {
    const normalizedPin = enteredPin.trim();
    if (!/^\d{4}$/.test(normalizedPin)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le code PIN doit comporter exactement 4 chiffres.",
      });
    }

    const order = await this.orderRepo.findById(orderId);
    if (!order)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    if (!order.handoverPin) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette commande ne requiert pas de code de remise.",
      });
    }
    const expected = Buffer.from(order.handoverPin);
    const received = Buffer.from(normalizedPin);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new AppError({
        code: "INVALID_PIN",
        message: "Code de remise incorrect.",
      });
    }

    await this.orderRepo.update(orderId, {
      isPinVerified: true,
      status: "completed",
    });

    logger.info("Handover verified and escrow funds released", { orderId });
    return {
      success: true,
      message:
        "Code PIN validé avec succès. Les fonds sécurisés ont été débloqués pour le vendeur.",
    };
  }

  async confirmDeliveryReceived(orderId: string): Promise<Transaction> {
    const updated = await this.orderRepo.update(orderId, {
      status: "completed",
    });
    logger.info(
      `Delivery confirmed by buyer for order ${orderId}. Escrow released.`,
    );
    return updated;
  }

  async openDispute(
    orderId: string,
    reason: string,
    details: string,
  ): Promise<Transaction> {
    const updated = await this.orderRepo.update(orderId, {
      status: "disputed",
      disputeReason: reason,
      disputeDetails: details,
    });
    logger.warn("Order dispute opened", { orderId });
    return updated;
  }
}

export const ordersService = new OrdersService();
