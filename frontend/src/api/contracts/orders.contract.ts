import { Transaction, DeliveryType } from '../../types';

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

export interface OrdersServiceContract {
  getOrderById(orderId: string): Promise<Transaction | null>;
  getPurchases(userId: string): Promise<Transaction[]>;
  getSales(userId: string): Promise<Transaction[]>;
  createDirectPurchase(input: CreateDirectPurchaseInput): Promise<Transaction>;
  createReservation(input: CreateReservationInput): Promise<Transaction>;
  confirmHandoverPIN(orderId: string, enteredPin: string): Promise<{ success: boolean; message: string }>;
  confirmDeliveryReceived(orderId: string): Promise<Transaction>;
  openDispute(orderId: string, reason: string, details: string): Promise<Transaction>;
}
