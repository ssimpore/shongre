import { Transaction, DeliveryType } from "../../types";

export const ORDER_HANDOVER_POLICY = {
  codeLength: 6,
  lifetimeMinutes: 30,
} as const;

export interface CreateDirectPurchaseInput {
  listingId: string;
  deliveryMethod: DeliveryType;
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  idempotencyKey: string;
}

export interface CreateReservationInput {
  listingId: string;
  agreedLocation: string;
  scheduledDate?: string;
  idempotencyKey: string;
}

export interface OrderCheckoutResult {
  id: string;
  orderNumber?: string;
  status: string;
  checkout?: { id: string; url: string; status: string };
  demoTransaction?: Transaction;
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

export interface OrdersServiceContract {
  getOrderById(orderId: string): Promise<Transaction | null>;
  getPurchases(userId: string): Promise<Transaction[]>;
  getSales(userId: string): Promise<Transaction[]>;
  quoteDirectPurchase(input: {
    listingId: string;
    deliveryMethod: DeliveryType;
  }): Promise<DirectPurchaseQuote>;
  createDirectPurchase(
    input: CreateDirectPurchaseInput,
  ): Promise<OrderCheckoutResult>;
  createReservation(
    input: CreateReservationInput,
  ): Promise<OrderCheckoutResult>;
  issueHandoverCode(
    orderId: string,
  ): Promise<{ code: string; expiresAt: string }>;
  confirmHandoverPIN(
    orderId: string,
    enteredPin: string,
  ): Promise<{ success: boolean; message: string }>;
  confirmDeliveryReceived(orderId: string): Promise<Transaction>;
  markShipped(
    orderId: string,
    input: { carrierName: string; trackingNumber: string },
  ): Promise<Transaction>;
  cancelUnpaidOrder(orderId: string): Promise<Transaction>;
  openDispute(
    orderId: string,
    reason: string,
    details: string,
  ): Promise<Transaction>;
}
