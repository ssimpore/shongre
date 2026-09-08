import {
  OrdersServiceContract,
  CreateDirectPurchaseInput,
  CreateReservationInput,
  DirectPurchaseQuote,
  OrderCheckoutResult,
} from "../../contracts/orders.contract";
import { apiOperation } from "./generated-api-operation";
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
    const order = await apiOperation<BackendOrder | null, "getOrdersById">(
      "getOrdersById",
      { path: { id: orderId } },
    );
    return order ? mapOrder(order) : null;
  }

  async getPurchases(_userId: string): Promise<Transaction[]> {
    return (
      await apiOperation<BackendOrder[], "getOrdersPurchases">(
        "getOrdersPurchases",
        {},
      )
    ).map(mapOrder);
  }

  async getSales(_userId: string): Promise<Transaction[]> {
    return (
      await apiOperation<BackendOrder[], "getOrdersSales">("getOrdersSales", {})
    ).map(mapOrder);
  }

  async quoteDirectPurchase(input: {
    listingId: string;
    deliveryMethod: Transaction["deliveryMethod"];
  }): Promise<DirectPurchaseQuote> {
    return apiOperation<DirectPurchaseQuote, "postOrdersDirectPurchaseQuote">(
      "postOrdersDirectPurchaseQuote",
      { body: input },
    );
  }

  async createDirectPurchase(
    input: CreateDirectPurchaseInput,
  ): Promise<OrderCheckoutResult> {
    return apiOperation<OrderCheckoutResult, "postOrdersDirectPurchase">(
      "postOrdersDirectPurchase",
      { body: input },
    );
  }

  async createReservation(
    input: CreateReservationInput,
  ): Promise<OrderCheckoutResult> {
    return apiOperation<OrderCheckoutResult, "postOrdersReservation">(
      "postOrdersReservation",
      { body: input },
    );
  }

  async issueHandoverCode(orderId: string) {
    return apiOperation<
      { code: string; expiresAt: string },
      "postOrdersByIdHandoverCode"
    >("postOrdersByIdHandoverCode", { path: { id: orderId } });
  }

  async confirmHandoverPIN(
    orderId: string,
    enteredPin: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiOperation<
      { success: boolean; message: string },
      "postOrdersByIdConfirmPin"
    >("postOrdersByIdConfirmPin", {
      path: { id: orderId },
      body: { pin: enteredPin },
    });
  }

  async confirmDeliveryReceived(orderId: string): Promise<Transaction> {
    return mapOrder(
      await apiOperation<BackendOrder, "postOrdersByIdConfirmDelivery">(
        "postOrdersByIdConfirmDelivery",
        { path: { id: orderId } },
      ),
    );
  }

  async markShipped(
    orderId: string,
    input: { carrierName: string; trackingNumber: string },
  ): Promise<Transaction> {
    return mapOrder(
      await apiOperation<BackendOrder, "postOrdersByIdShip">(
        "postOrdersByIdShip",
        { path: { id: orderId }, body: input },
      ),
    );
  }

  async cancelUnpaidOrder(orderId: string): Promise<Transaction> {
    return mapOrder(
      await apiOperation<BackendOrder, "postOrdersByIdCancel">(
        "postOrdersByIdCancel",
        { path: { id: orderId } },
      ),
    );
  }

  async openDispute(
    orderId: string,
    reason: string,
    details: string,
  ): Promise<Transaction> {
    return mapOrder(
      await apiOperation<BackendOrder, "postOrdersByIdDispute">(
        "postOrdersByIdDispute",
        {
          path: { id: orderId },
          body: {
            reason,
            details,
          },
        },
      ),
    );
  }
}

export const httpOrdersService = new HttpOrdersService();
