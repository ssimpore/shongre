import type { components } from "@shongre/contracts/openapi";
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

/** A return request and the seller decision on it, as the contract defines it. */
export type OrderReturn = components["schemas"]["OrderReturn"];
export type OrderReturnReason = OrderReturn["reason"];

export interface OrdersServiceContract {
  getOrderById(orderId: string): Promise<Transaction | null>;
  getPurchases(): Promise<Transaction[]>;
  getSales(): Promise<Transaction[]>;
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
  listReturns(orderId: string): Promise<OrderReturn[]>;
  requestReturn(
    orderId: string,
    input: { reason: OrderReturnReason; details: string },
  ): Promise<OrderReturn>;
  decideReturn(
    returnId: string,
    input: { approve: boolean; note?: string },
  ): Promise<OrderReturn>;
  markReturnShipped(
    returnId: string,
    input: { carrierName?: string; trackingNumber?: string },
  ): Promise<OrderReturn>;
  confirmReturnReceived(
    returnId: string,
  ): Promise<{ return: OrderReturn; refundIssued: boolean }>;
}
