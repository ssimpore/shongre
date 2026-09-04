/**
 * SHONGRE TRANSACTION, PAYMENT, ORDER & FULFILLMENT DOMAIN TYPES
 * Authoritative models for direct purchases, reservations, multi-channel delivery,
 * payment lifecycles, refunds, disputes, and seller payouts.
 */

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
