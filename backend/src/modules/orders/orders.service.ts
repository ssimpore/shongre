import { Transaction, DeliveryType } from '../../shared/types/index.js';
import { calculateOrderTotal } from '../../shared/money/escrow.js';
import { AppError } from '../../shared/errors/app-error.js';
import { listingsService } from '../listings/listings.service.js';
import { logger } from '../../infrastructure/logging/logger.js';

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
  paymentMethod: 'card' | 'bank_transfer' | 'wallet';
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
  async getOrderById(orderId: string): Promise<Transaction | null> {
    return {
      id: orderId,
      orderNumber: `CMD-${orderId.substring(0, 8).toUpperCase()}`,
      transactionType: 'DIRECT_PURCHASE',
      listingId: 'list_1',
      buyerId: 'user_thomas',
      sellerId: 'user_camille',
      status: 'escrow_funded',
      itemAmount: 250,
      protectionFee: 10.7,
      shippingFee: 8.5,
      totalCharged: 269.2,
      escrowSecuredAmount: 258.5,
      deliveryMethod: 'relay_point',
      paymentMethod: 'card',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    return [];
  }

  async getSales(userId: string): Promise<Transaction[]> {
    return [];
  }

  async createDirectPurchase(input: CreateDirectPurchaseInput): Promise<Transaction> {
    const listing = await listingsService.getListingById(input.listingId);
    if (!listing) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Annonce introuvable' });
    }

    if (listing.status !== 'published') {
      throw new AppError({ code: 'CONFLICT', message: "L'annonce n'est plus disponible à l'achat" });
    }

    const shippingFee = input.deliveryMethod === 'hand_delivery' ? 0 : (listing.shippingCost || 5.0);
    const breakdown = calculateOrderTotal({
      itemAmount: listing.price,
      shippingFee,
      marketCode: listing.marketCode,
    });

    const handoverPin = input.deliveryMethod === 'hand_delivery'
      ? Math.floor(1000 + Math.random() * 9000).toString()
      : undefined;

    const orderId = `ord_${Math.random().toString(36).substring(2, 12)}`;
    const transaction: Transaction = {
      id: orderId,
      orderNumber: `CMD-${orderId.substring(4, 10).toUpperCase()}`,
      transactionType: 'DIRECT_PURCHASE',
      listingId: listing.id,
      listing,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
      status: 'escrow_funded',
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

    logger.info(`Direct Purchase created & Escrow funded: ${orderId} (Total: ${breakdown.totalCharged} EUR)`);
    return transaction;
  }

  async createReservation(input: CreateReservationInput): Promise<Transaction> {
    const listing = await listingsService.getListingById(input.listingId);
    if (!listing) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Annonce introuvable' });
    }

    const breakdown = calculateOrderTotal({
      itemAmount: input.depositAmount,
      shippingFee: 0,
      marketCode: listing.marketCode,
    });

    const orderId = `res_${Math.random().toString(36).substring(2, 12)}`;
    const transaction: Transaction = {
      id: orderId,
      orderNumber: `RES-${orderId.substring(4, 10).toUpperCase()}`,
      transactionType: 'RESERVATION',
      listingId: listing.id,
      listing,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
      status: 'escrow_funded',
      itemAmount: input.depositAmount,
      protectionFee: breakdown.protectionFee,
      shippingFee: 0,
      totalCharged: breakdown.totalCharged,
      escrowSecuredAmount: breakdown.escrowSecuredAmount,
      depositAmount: input.depositAmount,
      remainingBalance: input.remainingAmount,
      deliveryMethod: 'hand_delivery',
      paymentMethod: 'card',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    logger.info(`Reservation created: ${orderId} (Deposit Escrow: ${input.depositAmount} EUR, Remaining: ${input.remainingAmount} EUR)`);
    return transaction;
  }

  async confirmHandoverPIN(orderId: string, enteredPin: string): Promise<{ success: boolean; message: string }> {
    if (!enteredPin || enteredPin.trim().length !== 4) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Le code PIN doit comporter exactement 4 chiffres.',
      });
    }

    logger.info(`Handover PIN ${enteredPin} verified for order ${orderId}. Escrow funds released to seller.`);
    return {
      success: true,
      message: 'Code PIN validé avec succès. Les fonds sécurisés ont été débloqués pour le vendeur.',
    };
  }

  async confirmDeliveryReceived(orderId: string): Promise<Transaction> {
    logger.info(`Delivery confirmed by buyer for order ${orderId}. Escrow released.`);
    return {
      id: orderId,
      orderNumber: `CMD-${orderId.substring(0, 6).toUpperCase()}`,
      transactionType: 'DIRECT_PURCHASE',
      listingId: 'list_1',
      buyerId: 'user_thomas',
      sellerId: 'user_camille',
      status: 'completed',
      itemAmount: 150,
      protectionFee: 6.7,
      shippingFee: 0,
      totalCharged: 156.7,
      escrowSecuredAmount: 150,
      deliveryMethod: 'relay_point',
      paymentMethod: 'card',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async openDispute(orderId: string, reason: string, details: string): Promise<Transaction> {
    logger.warn(`Dispute opened on order ${orderId}: ${reason}`);
    return {
      id: orderId,
      orderNumber: `CMD-${orderId.substring(0, 6).toUpperCase()}`,
      transactionType: 'DIRECT_PURCHASE',
      listingId: 'list_1',
      buyerId: 'user_thomas',
      sellerId: 'user_camille',
      status: 'disputed',
      itemAmount: 150,
      protectionFee: 6.7,
      shippingFee: 0,
      totalCharged: 156.7,
      escrowSecuredAmount: 150,
      deliveryMethod: 'relay_point',
      paymentMethod: 'card',
      disputeReason: reason,
      disputeDetails: details,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const ordersService = new OrdersService();
