/**
 * SHONGRE TRANSACTION, PAYMENT, ORDER & FULFILLMENT DOMAIN TYPES
 * Authoritative models for direct purchases, reservations, multi-channel delivery,
 * payment lifecycles, refunds, disputes, and seller payouts.
 */

import { SellerType, TransactionStatus, TransactionDispute } from '../../types';

export type TransactionMode = 'CONTACT_ONLY' | 'DIRECT_PURCHASE' | 'RESERVATION';

export type PaymentStatus =
  | 'requires_payment'
  | 'processing'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded';

export type PaymentMethodType = 'card' | 'apple_pay' | 'google_pay' | 'sepa';

export type FulfillmentType =
  | 'local_pickup'
  | 'parcel'
  | 'bulky_delivery'
  | 'seller_delivery'
  | 'store_pickup'
  | 'digital'
  | 'remote_service'
  | 'on_site_service';

export type ShipmentStatus =
  | 'label_pending'
  | 'ready_to_ship'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_exception'
  | 'cancelled';

export type RefundStatus =
  | 'not_requested'
  | 'requested'
  | 'processing'
  | 'refunded'
  | 'failed';

export type PayoutStatus =
  | 'not_ready'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'blocked';

export interface OrderPricingSnapshot {
  itemPriceMinor: number;
  quantity: number;
  itemSubtotalMinor: number;
  shippingFeeMinor: number;
  buyerProtectionFeeMinor: number;
  platformCommissionMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalAmountMinor: number;
  sellerPayoutAmountMinor: number;
  currency: string;
}

export interface DeliveryQuote {
  id: string;
  fulfillmentType: FulfillmentType;
  providerId?: string;
  serviceId?: string;
  label: string;
  description?: string;
  price: {
    amountMinor: number;
    currency: string;
  };
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  expiresAt?: string;
  available: boolean;
  requiresPinCode?: boolean;
}

export interface ShipmentTrackingEvent {
  id: string;
  status: ShipmentStatus;
  label: string;
  location?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  code: string; // e.g. SHG-849201
  marketCode: string;
  buyerId: string;
  buyerName: string;
  buyerAvatarUrl?: string;
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl?: string;
  sellerType: SellerType;
  listingId: string;
  listingTitle: string;
  listingPhotoUrl: string;
  categorySlug?: string;
  quantity: number;
  mode: TransactionMode;
  pricingSnapshot: OrderPricingSnapshot;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethodType;
  cardLast4?: string;
  cardBrand?: string;
  fulfillmentType: FulfillmentType;
  carrierName?: string;
  deliveryAddress?: {
    fullName: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    relayPointName?: string;
    relayPointId?: string;
  };
  pickupDetails?: {
    scheduledDate?: string;
    meetingPlace?: string;
    notes?: string;
    buyerPhone?: string;
  };
  shipmentStatus?: ShipmentStatus;
  trackingNumber?: string;
  trackingEvents?: ShipmentTrackingEvent[];
  verificationPin?: string;
  verificationPinStatus?: 'pending' | 'verified';
  payoutStatus?: PayoutStatus;
  refundStatus?: RefundStatus;
  refundAmountMinor?: number;
  dispute?: TransactionDispute;
  reviewId?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}
