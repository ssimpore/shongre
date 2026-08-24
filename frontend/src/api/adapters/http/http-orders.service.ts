import {
  OrdersServiceContract,
  CreateDirectPurchaseInput,
  CreateReservationInput,
  DirectPurchaseQuote,
  OrderCheckoutResult,
} from "../../contracts/orders.contract";
import { httpClient } from "./http-client";
import { Transaction } from "../../../types";

type BackendOrder = {
  id: string;
  orderNumber: string;
  listingId: string;
  listing?: {
    title?: string;
    price?: number;
    images?: Array<{ url?: string }>;
    seller?: { name?: string };
  };
  buyerId: string;
  buyer?: { name?: string };
  sellerId: string;
  seller?: { name?: string };
  status: Transaction["status"];
  itemAmount: number;
  protectionFee: number;
  shippingFee: number;
  totalCharged: number;
  currency?: string;
  deliveryMethod: Transaction["deliveryMethod"];
  shippingAddress?: Transaction["deliveryAddress"];
  carrierName?: string;
  trackingNumber?: string;
  disputeReason?: string;
  disputeDetails?: string;
  createdAt: string;
  updatedAt: string;
};

const mapOrder = (order: BackendOrder): Transaction => ({
  id: order.id,
  code: order.orderNumber,
  listingId: order.listingId,
  listingTitle: order.listing?.title || `Commande ${order.orderNumber}`,
  listingPrice: order.listing?.price ?? order.itemAmount,
  listingPhotoUrl: order.listing?.images?.[0]?.url || "",
  buyerId: order.buyerId,
  buyerName: order.buyer?.name || "Acheteur",
  sellerId: order.sellerId,
  sellerName: order.seller?.name || order.listing?.seller?.name || "Vendeur",
  amount: order.itemAmount,
  protectionFee: order.protectionFee,
  shippingFee: order.shippingFee,
  totalAmount: order.totalCharged,
  currency: order.currency,
  deliveryMethod: order.deliveryMethod,
  deliveryAddress: order.shippingAddress,
  carrierName: order.carrierName,
  trackingNumber: order.trackingNumber,
  status: order.status,
  dispute:
    order.status === "disputed"
      ? {
          id: `dispute:${order.id}`,
          openedBy: "participant",
          openedByName: "Participant",
          role: "buyer",
          reason: order.disputeReason || "Litige",
          description: order.disputeDetails || "Dossier en cours d’examen.",
          status: "under_review",
          createdAt: order.updatedAt,
        }
      : undefined,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export class HttpOrdersService implements OrdersServiceContract {
  async getOrderById(orderId: string): Promise<Transaction | null> {
    const order = await httpClient.get<BackendOrder | null>(
      `/orders/${orderId}`,
    );
    return order ? mapOrder(order) : null;
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    return (
      await httpClient.get<BackendOrder[]>(`/orders/purchases/${userId}`)
    ).map(mapOrder);
  }

  async getSales(userId: string): Promise<Transaction[]> {
    return (
      await httpClient.get<BackendOrder[]>(`/orders/sales/${userId}`)
    ).map(mapOrder);
  }

  async quoteDirectPurchase(input: {
    listingId: string;
    deliveryMethod: Transaction["deliveryMethod"];
  }): Promise<DirectPurchaseQuote> {
    return httpClient.post<DirectPurchaseQuote>(
      "/orders/direct-purchase/quote",
      input,
    );
  }

  async createDirectPurchase(
    input: CreateDirectPurchaseInput,
  ): Promise<OrderCheckoutResult> {
    return httpClient.post<OrderCheckoutResult>(
      "/orders/direct-purchase",
      input,
    );
  }

  async createReservation(
    input: CreateReservationInput,
  ): Promise<OrderCheckoutResult> {
    return httpClient.post<OrderCheckoutResult>("/orders/reservation", input);
  }

  async issueHandoverCode(orderId: string) {
    return httpClient.post<{ code: string; expiresAt: string }>(
      `/orders/${orderId}/handover-code`,
    );
  }

  async confirmHandoverPIN(
    orderId: string,
    enteredPin: string,
  ): Promise<{ success: boolean; message: string }> {
    return httpClient.post<{ success: boolean; message: string }>(
      `/orders/${orderId}/confirm-pin`,
      { pin: enteredPin },
    );
  }

  async confirmDeliveryReceived(orderId: string): Promise<Transaction> {
    return mapOrder(
      await httpClient.post<BackendOrder>(
        `/orders/${orderId}/confirm-delivery`,
      ),
    );
  }

  async markShipped(
    orderId: string,
    input: { carrierName: string; trackingNumber: string },
  ): Promise<Transaction> {
    return mapOrder(
      await httpClient.post<BackendOrder>(`/orders/${orderId}/ship`, input),
    );
  }

  async cancelUnpaidOrder(orderId: string): Promise<Transaction> {
    return mapOrder(
      await httpClient.post<BackendOrder>(`/orders/${orderId}/cancel`),
    );
  }

  async openDispute(
    orderId: string,
    reason: string,
    details: string,
  ): Promise<Transaction> {
    return mapOrder(
      await httpClient.post<BackendOrder>(`/orders/${orderId}/dispute`, {
        reason,
        details,
      }),
    );
  }
}

export const httpOrdersService = new HttpOrdersService();
