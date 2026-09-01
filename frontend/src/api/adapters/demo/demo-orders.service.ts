import {
  OrdersServiceContract,
  CreateDirectPurchaseInput,
  CreateReservationInput,
  OrderCheckoutResult,
  DirectPurchaseQuote,
  ORDER_HANDOVER_POLICY,
} from "../../contracts/orders.contract";
import { transactionRepository } from "../../../repositories/transaction.repository";
import { transactionService } from "../../../domains/transaction/transaction.service";
import { listingRepository } from "../../../repositories/listing.repository";
import { storageService } from "../../../services/storage.service";
import { Transaction } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { minutesToMilliseconds } from "../../../utilities/time";
import { DEFAULT_MARKET_CODE } from "../../../configuration/market-baseline";
import { requireDemoCapability } from "./demo-authorization";

export class DemoOrdersService implements OrdersServiceContract {
  async getOrderById(orderId: string): Promise<Transaction | null> {
    await simulateNetworkDelay();
    requireDemoCapability("order.read.own");
    return transactionRepository.getTransactionById(orderId);
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    await simulateNetworkDelay();
    requireDemoCapability("order.read.own");
    return transactionRepository.getPurchases(userId);
  }

  async getSales(userId: string): Promise<Transaction[]> {
    await simulateNetworkDelay();
    requireDemoCapability("order.manage.seller");
    return transactionRepository.getSales(userId);
  }

  async quoteDirectPurchase(input: {
    listingId: string;
    deliveryMethod: Transaction["deliveryMethod"];
  }): Promise<DirectPurchaseQuote> {
    await simulateNetworkDelay();
    requireDemoCapability("order.create");
    const listing = await listingRepository.getListingById(input.listingId);
    if (!listing) throw new Error("Annonce introuvable");
    const option = listing.deliveryOptions.find(
      (delivery) =>
        delivery.type === input.deliveryMethod && delivery.available,
    );
    if (!option) throw new Error("Ce mode de livraison n’est pas disponible.");
    const pricing = transactionService.calculateOrderPricingSnapshot(
      listing.price,
      1,
      option.price || 0,
      listing.sellerType,
      listing.marketCodes?.[0] || DEFAULT_MARKET_CODE,
    );
    return {
      listingId: listing.id,
      deliveryMethod: input.deliveryMethod,
      itemAmountMinor: pricing.itemSubtotalMinor,
      protectionFeeMinor: pricing.buyerProtectionFeeMinor,
      shippingFeeMinor: pricing.shippingFeeMinor,
      totalAmountMinor: pricing.totalAmountMinor,
      currency: pricing.currency,
    };
  }

  async createDirectPurchase(
    input: CreateDirectPurchaseInput,
  ): Promise<OrderCheckoutResult> {
    await simulateNetworkDelay();
    requireDemoCapability("order.create");
    const listing = await listingRepository.getListingById(input.listingId);
    if (!listing) throw new Error("Annonce introuvable");
    const deliveryOption = listing.deliveryOptions.find(
      (option) => option.type === input.deliveryMethod && option.available,
    );
    if (!deliveryOption) {
      throw new Error("Ce mode de remise n’est pas disponible.");
    }

    const pricing = transactionService.calculateOrderPricingSnapshot(
      listing.price,
      1,
      deliveryOption.price || 0,
      listing.sellerType,
      listing.marketCodes?.[0] || DEFAULT_MARKET_CODE,
    );

    const tx = await transactionRepository.createTransaction({
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingPhotoUrl: listing.coverImageUrl,
      buyerId: storageService.getCurrentUser()?.id || "guest",
      buyerName: storageService.getCurrentUser()?.name || "Acheteur",
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      amount: pricing.itemSubtotalMinor / 100,
      totalAmount: pricing.totalAmountMinor / 100,
      protectionFee: pricing.buyerProtectionFeeMinor / 100,
      shippingFee: pricing.shippingFeeMinor / 100,
      currency: pricing.currency,
      status: "payment_escrowed",
      deliveryMethod: input.deliveryMethod,
    });

    return {
      id: tx.id,
      orderNumber: tx.code,
      status: tx.status,
      demoTransaction: tx,
    };
  }

  async createReservation(
    input: CreateReservationInput,
  ): Promise<OrderCheckoutResult> {
    await simulateNetworkDelay();
    requireDemoCapability("order.create");
    const listing = await listingRepository.getListingById(input.listingId);
    if (!listing) throw new Error("Annonce introuvable");

    const tx = await transactionRepository.createTransaction({
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingPhotoUrl: listing.coverImageUrl,
      buyerId: storageService.getCurrentUser()?.id || "guest",
      buyerName: storageService.getCurrentUser()?.name || "Acheteur",
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      amount: Math.max(5, Math.min(listing.price * 0.1, 200)),
      totalAmount: Math.max(5, Math.min(listing.price * 0.1, 200)) + 0.99,
      protectionFee: 0.99,
      shippingFee: 0,
      currency: listing.currency,
      status: "payment_escrowed",
      deliveryMethod: "hand_delivery",
    });

    return {
      id: tx.id,
      orderNumber: tx.code,
      status: tx.status,
      demoTransaction: tx,
    };
  }

  async issueHandoverCode(orderId: string) {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const order = await transactionRepository.getTransactionById(orderId);
    if (!order?.verificationCode) {
      throw new Error("Le code de remise n’est pas disponible.");
    }
    return {
      code: order.verificationCode,
      expiresAt: new Date(
        Date.now() +
          minutesToMilliseconds(ORDER_HANDOVER_POLICY.lifetimeMinutes),
      ).toISOString(),
    };
  }

  async confirmHandoverPIN(
    orderId: string,
    enteredPin: string,
  ): Promise<{ success: boolean; message: string }> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const success = await transactionRepository.confirmHandoverPin(
      orderId,
      enteredPin,
    );
    if (success) {
      return {
        success: true,
        message: "Code PIN validé avec succès ! Fonds débloqués.",
      };
    }
    return {
      success: false,
      message: "Code PIN incorrect ou transaction non valide.",
    };
  }

  async confirmDeliveryReceived(orderId: string): Promise<Transaction> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    return transactionRepository.updateTransactionStatus(orderId, "completed");
  }

  async markShipped(
    orderId: string,
    input: { carrierName: string; trackingNumber: string },
  ): Promise<Transaction> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const updated = await transactionRepository.updateTransactionStatus(
      orderId,
      "shipped",
    );
    return {
      ...updated,
      carrierName: input.carrierName,
      trackingNumber: input.trackingNumber,
    };
  }

  async cancelUnpaidOrder(orderId: string): Promise<Transaction> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    return transactionRepository.updateTransactionStatus(orderId, "cancelled");
  }

  async openDispute(
    orderId: string,
    reason: string,
    details: string,
  ): Promise<Transaction> {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const user = storageService.getCurrentUser();
    return transactionRepository.openDispute(orderId, {
      openedBy: user?.id || "buyer",
      openedByName: user?.name || "Acheteur",
      role: "buyer",
      reason,
      description: details,
      status: "open",
    });
  }
}

export const demoOrdersService = new DemoOrdersService();
