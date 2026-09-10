import { randomUUID } from "node:crypto";
import {
  Transaction,
  DeliveryType,
  Listing,
  UserProfile,
} from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { databaseFailure } from "./repository-error.js";

export type OrderRecord = Omit<Transaction, "listing" | "buyer" | "seller"> & {
  listing?: Listing;
  buyer?: UserProfile;
  seller?: UserProfile;
  checkoutIdempotencyKey?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  destinationAccountId?: string;
  sellerTransferId?: string;
  sellerTransferAmountMinor?: number;
  sellerTransferStatus?:
    "pending" | "processing" | "completed" | "partially_reversed" | "reversed";
  handoverPinHash?: string;
  handoverPinIssuedAt?: string;
  handoverPinAttempts: number;
  handoverPinLockedUntil?: string;
  refundProviderId?: string;
  refundBaseMinor?: number;
  refundIdempotencyKey?: string;
  /**
   * Card-network chargeback, which is neither a buyer dispute nor a refund:
   * the network has already taken the money, so the platform must never issue
   * a refund against it. Kept separate from the refund ventilation for that
   * reason.
   */
  chargebackProviderId?: string;
  chargebackStatus?:
    "warning" | "open" | "under_review" | "won" | "lost" | "withdrawn";
  chargebackReason?: string;
  chargebackAmountMinor?: number;
  chargebackOpenedAt?: string;
  chargebackClosedAt?: string;
  payoutFailureCode?: string;
  payoutFailedAt?: string;
  /** Running total of item value refunded. Drives full-vs-partial decisions. */
  refundedBaseTotalMinor?: number;
};

/** One provider refund against an order. */
export interface OrderRefundRecord {
  id: string;
  orderId: string;
  providerRefundId?: string;
  idempotencyKey: string;
  baseMinor: number;
  refundedMinor: number;
  currency: string;
  isFull: boolean;
  reason?: string;
  status: "pending" | "succeeded" | "failed" | "cancelled";
  actorId?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "shipped"
  | "received"
  | "refunded"
  | "cancelled"
  | "expired";

export type OrderReturnReason =
  | "withdrawal"
  | "damaged"
  | "not_as_described"
  | "wrong_item"
  | "missing_parts"
  | "other";

/** A buyer return request and the seller decision on it. */
export interface OrderReturnRecord {
  id: string;
  orderId: string;
  requesterId: string;
  reason: OrderReturnReason;
  details: string;
  status: OrderReturnStatus;
  isStatutoryWithdrawal: boolean;
  requestedBaseMinor: number;
  currency: string;
  windowExpiresAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  carrierName?: string;
  trackingNumber?: string;
  shippedAt?: string;
  receivedAt?: string;
  refundId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrderRepository {
  findById(id: string): Promise<OrderRecord | null>;
  findByCheckoutIdempotencyKey(key: string): Promise<OrderRecord | null>;
  findByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null>;
  getPurchases(userId: string): Promise<OrderRecord[]>;
  getSales(userId: string): Promise<OrderRecord[]>;
  listUnsettledCheckouts(
    beforeIso: string,
    limit: number,
  ): Promise<OrderRecord[]>;
  create(order: OrderRecord): Promise<OrderRecord>;
  update(id: string, updates: Partial<OrderRecord>): Promise<OrderRecord>;
  recordHandoverPinFailure(id: string): Promise<OrderRecord>;

  /**
   * Claims a refund slot for this idempotency key, returning the existing row
   * when the key was already used. The uniqueness lives in the database, so
   * two concurrent requests cannot both issue a provider refund.
   */
  claimRefund(input: {
    orderId: string;
    idempotencyKey: string;
    baseMinor: number;
    refundedMinor: number;
    currency: string;
    isFull: boolean;
    reason?: string;
    actorId?: string;
  }): Promise<{ refund: OrderRefundRecord; created: boolean }>;
  updateRefund(
    id: string,
    updates: Partial<
      Pick<OrderRefundRecord, "providerRefundId" | "status" | "refundedMinor">
    >,
  ): Promise<OrderRefundRecord>;
  findRefundByProviderId(
    providerRefundId: string,
  ): Promise<OrderRefundRecord | null>;
  listRefunds(orderId: string): Promise<OrderRefundRecord[]>;

  createReturn(input: {
    orderId: string;
    requesterId: string;
    reason: OrderReturnReason;
    details: string;
    isStatutoryWithdrawal: boolean;
    requestedBaseMinor: number;
    currency: string;
    windowExpiresAt: string;
  }): Promise<OrderReturnRecord>;
  updateReturn(
    id: string,
    updates: Partial<OrderReturnRecord>,
  ): Promise<OrderReturnRecord>;
  findReturnById(id: string): Promise<OrderReturnRecord | null>;
  findOpenReturn(orderId: string): Promise<OrderReturnRecord | null>;
  listReturns(orderId: string): Promise<OrderReturnRecord[]>;
  expireStaleReturns(limit: number): Promise<number>;
}

const CANONICAL_DEMO_ORDERS: Record<string, OrderRecord> = {
  ord_sample_1: {
    id: "ord_sample_1",
    orderNumber: "CMD-849201",
    transactionType: "DIRECT_PURCHASE",
    listingId: "list_1",
    buyerId: "user_thomas",
    sellerId: "user_camille",
    status: "escrow_funded",
    itemAmount: 250,
    protectionFee: 10.7,
    shippingFee: 8.5,
    totalCharged: 269.2,
    escrowSecuredAmount: 258.5,
    currency: "EUR",
    deliveryMethod: "relay_point",
    paymentMethod: "card",
    handoverPinAttempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "7d3e760f-4ad7-47e5-8ca5-2a4ea59a3151": {
    id: "7d3e760f-4ad7-47e5-8ca5-2a4ea59a3151",
    orderNumber: "CMD-DELIVERY-001",
    transactionType: "DIRECT_PURCHASE",
    listingId: "list_1",
    buyerId: "user_thomas",
    sellerId: "user_camille",
    status: "escrow_funded",
    itemAmount: 250,
    protectionFee: 10.7,
    shippingFee: 0,
    totalCharged: 260.7,
    escrowSecuredAmount: 250,
    currency: "EUR",
    deliveryMethod: "hand_delivery",
    fulfillmentModel: "PHYSICAL",
    paymentMethod: "card",
    handoverPinAttempts: 0,
    createdAt: "2026-09-05T09:00:00.000Z",
    updatedAt: "2026-09-05T09:00:00.000Z",
  },
};

/** Statuses in which a return still awaits somebody's action. */
const OPEN_RETURN_STATUSES = new Set<OrderReturnStatus>([
  "requested",
  "approved",
  "shipped",
  "received",
]);

export class DemoOrderRepository implements IOrderRepository {
  private orders: Map<string, OrderRecord> = new Map();
  private refunds: Map<string, OrderRefundRecord> = new Map();
  private returns: Map<string, OrderReturnRecord> = new Map();

  constructor(
    initialOrders: Record<string, OrderRecord> = CANONICAL_DEMO_ORDERS,
  ) {
    this.reset(initialOrders);
  }

  reset(initialOrders: Record<string, OrderRecord> = CANONICAL_DEMO_ORDERS) {
    this.orders.clear();
    this.refunds.clear();
    this.returns.clear();
    Object.values(initialOrders).forEach((o) =>
      this.orders.set(o.id, { ...o, handoverPinAttempts: 0 }),
    );
  }

  async findById(id: string): Promise<OrderRecord | null> {
    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) {
      if (order.paymentIntentId === paymentIntentId) return { ...order };
    }
    return null;
  }

  async findByCheckoutIdempotencyKey(key: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) {
      if (order.checkoutIdempotencyKey === key) return { ...order };
    }
    return null;
  }

  async getPurchases(userId: string): Promise<OrderRecord[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.buyerId === userId)
      .map((o) => ({ ...o }));
  }

  async getSales(userId: string): Promise<OrderRecord[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.sellerId === userId)
      .map((o) => ({ ...o }));
  }

  async listUnsettledCheckouts(
    beforeIso: string,
    limit: number,
  ): Promise<OrderRecord[]> {
    return Array.from(this.orders.values())
      .filter(
        (order) =>
          ["initiated", "payment_pending"].includes(order.status) &&
          order.createdAt < beforeIso,
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, Math.max(0, limit))
      .map((order) => ({ ...order }));
  }

  async create(order: OrderRecord): Promise<OrderRecord> {
    this.orders.set(order.id, { ...order });
    return { ...order };
  }

  async update(
    id: string,
    updates: Partial<OrderRecord>,
  ): Promise<OrderRecord> {
    const existing = await this.findById(id);
    if (!existing)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(id, updated as OrderRecord);
    return { ...(updated as OrderRecord) };
  }

  async recordHandoverPinFailure(id: string): Promise<OrderRecord> {
    const order = await this.findById(id);
    if (!order)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    const attempts = order.handoverPinAttempts + 1;
    return this.update(id, {
      handoverPinAttempts: attempts,
      handoverPinLockedUntil:
        attempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : undefined,
    });
  }

  async claimRefund(input: {
    orderId: string;
    idempotencyKey: string;
    baseMinor: number;
    refundedMinor: number;
    currency: string;
    isFull: boolean;
    reason?: string;
    actorId?: string;
  }): Promise<{ refund: OrderRefundRecord; created: boolean }> {
    const existing = [...this.refunds.values()].find(
      (row) =>
        row.orderId === input.orderId &&
        row.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return { refund: { ...existing }, created: false };
    const now = new Date().toISOString();
    const refund: OrderRefundRecord = {
      id: randomUUID(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.refunds.set(refund.id, refund);
    return { refund: { ...refund }, created: true };
  }

  async updateRefund(
    id: string,
    updates: Partial<
      Pick<OrderRefundRecord, "providerRefundId" | "status" | "refundedMinor">
    >,
  ): Promise<OrderRefundRecord> {
    const existing = this.refunds.get(id);
    if (!existing)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Remboursement introuvable.",
      });
    const next = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.refunds.set(id, next);
    return { ...next };
  }

  async findRefundByProviderId(
    providerRefundId: string,
  ): Promise<OrderRefundRecord | null> {
    const found = [...this.refunds.values()].find(
      (row) => row.providerRefundId === providerRefundId,
    );
    return found ? { ...found } : null;
  }

  async listRefunds(orderId: string): Promise<OrderRefundRecord[]> {
    return [...this.refunds.values()]
      .filter((row) => row.orderId === orderId)
      .map((row) => ({ ...row }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async createReturn(input: {
    orderId: string;
    requesterId: string;
    reason: OrderReturnReason;
    details: string;
    isStatutoryWithdrawal: boolean;
    requestedBaseMinor: number;
    currency: string;
    windowExpiresAt: string;
  }): Promise<OrderReturnRecord> {
    if (await this.findOpenReturn(input.orderId)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Un retour est déjà en cours pour cette commande.",
      });
    }
    const now = new Date().toISOString();
    const record: OrderReturnRecord = {
      id: randomUUID(),
      status: "requested",
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.returns.set(record.id, record);
    return { ...record };
  }

  async updateReturn(
    id: string,
    updates: Partial<OrderReturnRecord>,
  ): Promise<OrderReturnRecord> {
    const existing = this.returns.get(id);
    if (!existing)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Retour introuvable.",
      });
    const next = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.returns.set(id, next);
    return { ...next };
  }

  async findReturnById(id: string): Promise<OrderReturnRecord | null> {
    const found = this.returns.get(id);
    return found ? { ...found } : null;
  }

  async findOpenReturn(orderId: string): Promise<OrderReturnRecord | null> {
    const found = [...this.returns.values()].find(
      (row) => row.orderId === orderId && OPEN_RETURN_STATUSES.has(row.status),
    );
    return found ? { ...found } : null;
  }

  async listReturns(orderId: string): Promise<OrderReturnRecord[]> {
    return [...this.returns.values()]
      .filter((row) => row.orderId === orderId)
      .map((row) => ({ ...row }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async expireStaleReturns(limit: number): Promise<number> {
    const now = new Date().toISOString();
    let expired = 0;
    for (const row of this.returns.values()) {
      if (expired >= limit) break;
      if (row.status === "requested" && row.windowExpiresAt <= now) {
        this.returns.set(row.id, {
          ...row,
          status: "expired",
          updatedAt: now,
        });
        expired += 1;
      }
    }
    return expired;
  }
}

export class PostgresOrderRepository implements IOrderRepository {
  private mapRowToOrder(row: any): OrderRecord {
    return {
      id: row.id,
      orderNumber: row.order_number,
      transactionType: row.transaction_type,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      status: row.status,
      itemAmount: Number(row.item_amount),
      itemAmountMinor: Number(
        row.item_amount_minor ?? Math.round(Number(row.item_amount) * 100),
      ),
      protectionFee: Number(row.protection_fee || 0),
      protectionFeeMinor: Number(
        row.protection_fee_minor ??
          Math.round(Number(row.protection_fee || 0) * 100),
      ),
      shippingFee: Number(row.shipping_fee || 0),
      shippingFeeMinor: Number(
        row.shipping_fee_minor ??
          Math.round(Number(row.shipping_fee || 0) * 100),
      ),
      totalCharged: Number(row.total_charged),
      totalChargedMinor: Number(
        row.total_charged_minor ?? Math.round(Number(row.total_charged) * 100),
      ),
      escrowSecuredAmount: Number(row.escrow_secured_amount),
      escrowSecuredAmountMinor: Number(
        row.escrow_secured_amount_minor ??
          Math.round(Number(row.escrow_secured_amount) * 100),
      ),
      currency: String(row.currency).toUpperCase(),
      commissionCalculationId: row.commission_calculation_id || undefined,
      platformCommissionMinor:
        row.platform_commission_minor === null ||
        row.platform_commission_minor === undefined
          ? undefined
          : Number(row.platform_commission_minor),
      sellerPayableMinor:
        row.seller_payable_minor === null ||
        row.seller_payable_minor === undefined
          ? undefined
          : Number(row.seller_payable_minor),
      commissionSnapshotHash: row.commission_snapshot_hash || undefined,
      depositAmount: row.deposit_amount
        ? Number(row.deposit_amount)
        : undefined,
      remainingBalance: row.remaining_balance
        ? Number(row.remaining_balance)
        : undefined,
      deliveryMethod: (row.delivery_method as DeliveryType) || "hand_delivery",
      fulfillmentModel: row.fulfillment_model || "PHYSICAL",
      digitalFulfillmentVersionId:
        row.digital_fulfillment_version_id || undefined,
      productVersion: row.product_version || undefined,
      shippingAddress: row.shipping_address || undefined,
      handoverCodeRequired:
        row.delivery_method === "hand_delivery" &&
        ["escrow_funded", "pin_pending"].includes(row.status) &&
        !row.is_pin_verified,
      isPinVerified: Boolean(row.is_pin_verified),
      paymentMethod: row.payment_method || "card",
      carrierName: row.carrier_name || undefined,
      trackingNumber: row.tracking_number || undefined,
      shippedAt: row.shipped_at || undefined,
      checkoutSessionId: row.checkout_session_id || undefined,
      checkoutIdempotencyKey: row.checkout_idempotency_key || undefined,
      paymentIntentId: row.payment_intent_id || undefined,
      destinationAccountId: row.destination_account_id || undefined,
      sellerTransferId: row.seller_transfer_id || undefined,
      sellerTransferAmountMinor:
        row.seller_transfer_amount_minor === null ||
        row.seller_transfer_amount_minor === undefined
          ? undefined
          : Number(row.seller_transfer_amount_minor),
      sellerTransferStatus: row.seller_transfer_status || undefined,
      handoverPinHash: row.handover_pin_hash || undefined,
      handoverPinIssuedAt: row.handover_pin_issued_at || undefined,
      handoverPinAttempts: Number(row.handover_pin_attempts || 0),
      handoverPinLockedUntil: row.handover_pin_locked_until || undefined,
      refundProviderId: row.refund_provider_id || undefined,
      refundBaseMinor:
        row.refund_base_minor === null || row.refund_base_minor === undefined
          ? undefined
          : Number(row.refund_base_minor),
      refundIdempotencyKey: row.refund_idempotency_key || undefined,
      disputeReason: row.dispute_reason || undefined,
      disputeDetails: row.dispute_details || undefined,
      chargebackProviderId: row.chargeback_provider_id || undefined,
      chargebackStatus: row.chargeback_status || undefined,
      chargebackReason: row.chargeback_reason || undefined,
      chargebackAmountMinor:
        row.chargeback_amount_minor === null ||
        row.chargeback_amount_minor === undefined
          ? undefined
          : Number(row.chargeback_amount_minor),
      chargebackOpenedAt: row.chargeback_opened_at || undefined,
      chargebackClosedAt: row.chargeback_closed_at || undefined,
      payoutFailureCode: row.payout_failure_code || undefined,
      payoutFailedAt: row.payout_failed_at || undefined,
      refundedBaseTotalMinor: Number(row.refunded_base_total_minor || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<OrderRecord | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        databaseFailure("orders.findById", error);
      }
      if (!data) return null;
      return this.mapRowToOrder(data);
    } catch (error) {
      databaseFailure("orders.findById", error);
    }
  }

  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<OrderRecord | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_intent_id", paymentIntentId)
        .maybeSingle();
      if (error) databaseFailure("orders.findByPaymentIntentId", error);
      return data ? this.mapRowToOrder(data) : null;
    } catch (error) {
      databaseFailure("orders.findByPaymentIntentId", error);
    }
  }

  async findByCheckoutIdempotencyKey(key: string): Promise<OrderRecord | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("checkout_idempotency_key", key)
        .maybeSingle();
      if (error) databaseFailure("orders.findByCheckoutIdempotencyKey", error);
      return data ? this.mapRowToOrder(data) : null;
    } catch (error) {
      databaseFailure("orders.findByCheckoutIdempotencyKey", error);
    }
  }

  async getPurchases(userId: string): Promise<OrderRecord[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });
      if (error || !data) databaseFailure("orders.getPurchases", error);
      return data.map((r: any) => this.mapRowToOrder(r));
    } catch (error) {
      databaseFailure("orders.getPurchases", error);
    }
  }

  async getSales(userId: string): Promise<OrderRecord[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
      if (error || !data) databaseFailure("orders.getSales", error);
      return data.map((r: any) => this.mapRowToOrder(r));
    } catch (error) {
      databaseFailure("orders.getSales", error);
    }
  }

  async listUnsettledCheckouts(
    beforeIso: string,
    limit: number,
  ): Promise<OrderRecord[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["initiated", "payment_pending"])
        .lt("created_at", beforeIso)
        .order("created_at", { ascending: true })
        .limit(Math.min(Math.max(limit, 1), 500));
      if (error || !data) {
        databaseFailure("orders.listUnsettledCheckouts", error);
      }
      return data.map((row: any) => this.mapRowToOrder(row));
    } catch (error) {
      databaseFailure("orders.listUnsettledCheckouts", error);
    }
  }

  async create(order: OrderRecord): Promise<OrderRecord> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: order.id.includes("-") ? order.id : undefined,
      order_number: order.orderNumber,
      transaction_type: order.transactionType,
      listing_id: order.listingId,
      buyer_id: order.buyerId,
      seller_id: order.sellerId,
      status: order.status,
      item_amount: order.itemAmount,
      item_amount_minor: order.itemAmountMinor,
      protection_fee: order.protectionFee,
      protection_fee_minor: order.protectionFeeMinor,
      shipping_fee: order.shippingFee,
      shipping_fee_minor: order.shippingFeeMinor,
      total_charged: order.totalCharged,
      total_charged_minor: order.totalChargedMinor,
      escrow_secured_amount: order.escrowSecuredAmount,
      escrow_secured_amount_minor: order.escrowSecuredAmountMinor,
      currency: order.currency,
      deposit_amount: order.depositAmount || 0,
      remaining_balance: order.remainingBalance || 0,
      delivery_method: order.deliveryMethod,
      fulfillment_model: order.fulfillmentModel || "PHYSICAL",
      digital_fulfillment_version_id: order.digitalFulfillmentVersionId || null,
      product_version: order.productVersion || null,
      shipping_address: order.shippingAddress || null,
      handover_pin_hash: order.handoverPinHash || null,
      handover_pin_issued_at: order.handoverPinIssuedAt || null,
      handover_pin_attempts: order.handoverPinAttempts,
      handover_pin_locked_until: order.handoverPinLockedUntil || null,
      is_pin_verified: Boolean(order.isPinVerified),
      payment_method: order.paymentMethod,
      carrier_name: order.carrierName || null,
      tracking_number: order.trackingNumber || null,
      shipped_at: order.shippedAt || null,
      checkout_session_id: order.checkoutSessionId || null,
      checkout_idempotency_key: order.checkoutIdempotencyKey || null,
      payment_intent_id: order.paymentIntentId || null,
      destination_account_id: order.destinationAccountId || null,
      seller_transfer_id: order.sellerTransferId || null,
      seller_transfer_amount_minor: order.sellerTransferAmountMinor ?? null,
      seller_transfer_status: order.sellerTransferStatus || null,
      refund_provider_id: order.refundProviderId || null,
      refund_base_minor: order.refundBaseMinor ?? null,
      refund_idempotency_key: order.refundIdempotencyKey || null,
      commission_calculation_id: order.commissionCalculationId || null,
      platform_commission_minor: order.platformCommissionMinor ?? null,
      seller_payable_minor: order.sellerPayableMinor ?? null,
      commission_snapshot_hash: order.commissionSnapshotHash || null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };

    const { data, error } = await (supabase
      .from("orders")
      .insert(payload as any)
      .select()
      .single() as any);
    if (error || !data) {
      if (error?.code === "23505" || error?.code === "23514") {
        throw new AppError({
          code: "CONFLICT",
          message: "L'annonce n'est plus disponible à l'achat.",
          originalError: error,
        });
      }
      databaseFailure("orders.create", error);
    }
    return this.mapRowToOrder(data);
  }

  async update(
    id: string,
    updates: Partial<OrderRecord>,
  ): Promise<OrderRecord> {
    const supabase = getSupabaseAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.fulfillmentModel !== undefined)
      payload.fulfillment_model = updates.fulfillmentModel;
    if (updates.digitalFulfillmentVersionId !== undefined)
      payload.digital_fulfillment_version_id =
        updates.digitalFulfillmentVersionId || null;
    if (updates.productVersion !== undefined)
      payload.product_version = updates.productVersion || null;
    if (updates.isPinVerified !== undefined)
      payload.is_pin_verified = updates.isPinVerified;
    if (updates.handoverPinHash !== undefined)
      payload.handover_pin_hash = updates.handoverPinHash || null;
    if (updates.handoverPinIssuedAt !== undefined)
      payload.handover_pin_issued_at = updates.handoverPinIssuedAt || null;
    if (updates.handoverPinAttempts !== undefined)
      payload.handover_pin_attempts = updates.handoverPinAttempts;
    if (updates.handoverPinLockedUntil !== undefined)
      payload.handover_pin_locked_until =
        updates.handoverPinLockedUntil || null;
    if (updates.checkoutSessionId !== undefined)
      payload.checkout_session_id = updates.checkoutSessionId || null;
    if (updates.paymentIntentId !== undefined)
      payload.payment_intent_id = updates.paymentIntentId || null;
    if (updates.destinationAccountId !== undefined)
      payload.destination_account_id = updates.destinationAccountId || null;
    if (updates.sellerTransferId !== undefined)
      payload.seller_transfer_id = updates.sellerTransferId || null;
    if (updates.sellerTransferAmountMinor !== undefined)
      payload.seller_transfer_amount_minor = updates.sellerTransferAmountMinor;
    if (updates.sellerTransferStatus !== undefined)
      payload.seller_transfer_status = updates.sellerTransferStatus;
    if (updates.refundProviderId !== undefined)
      payload.refund_provider_id = updates.refundProviderId || null;
    if (updates.refundBaseMinor !== undefined)
      payload.refund_base_minor = updates.refundBaseMinor;
    if (updates.refundIdempotencyKey !== undefined)
      payload.refund_idempotency_key = updates.refundIdempotencyKey || null;
    if (updates.disputeReason !== undefined)
      payload.dispute_reason = updates.disputeReason;
    if (updates.disputeDetails !== undefined)
      payload.dispute_details = updates.disputeDetails;
    if (updates.chargebackProviderId !== undefined)
      payload.chargeback_provider_id = updates.chargebackProviderId || null;
    if (updates.chargebackStatus !== undefined)
      payload.chargeback_status = updates.chargebackStatus || null;
    if (updates.chargebackReason !== undefined)
      payload.chargeback_reason = updates.chargebackReason || null;
    if (updates.chargebackAmountMinor !== undefined)
      payload.chargeback_amount_minor = updates.chargebackAmountMinor;
    if (updates.chargebackOpenedAt !== undefined)
      payload.chargeback_opened_at = updates.chargebackOpenedAt || null;
    if (updates.chargebackClosedAt !== undefined)
      payload.chargeback_closed_at = updates.chargebackClosedAt || null;
    if (updates.payoutFailureCode !== undefined)
      payload.payout_failure_code = updates.payoutFailureCode || null;
    if (updates.payoutFailedAt !== undefined)
      payload.payout_failed_at = updates.payoutFailedAt || null;
    if (updates.refundedBaseTotalMinor !== undefined)
      payload.refunded_base_total_minor = updates.refundedBaseTotalMinor;
    if (updates.carrierName !== undefined)
      payload.carrier_name = updates.carrierName || null;
    if (updates.trackingNumber !== undefined)
      payload.tracking_number = updates.trackingNumber || null;
    if (updates.shippedAt !== undefined)
      payload.shipped_at = updates.shippedAt || null;
    if (updates.commissionCalculationId !== undefined)
      payload.commission_calculation_id = updates.commissionCalculationId;
    if (updates.platformCommissionMinor !== undefined)
      payload.platform_commission_minor = updates.platformCommissionMinor;
    if (updates.sellerPayableMinor !== undefined)
      payload.seller_payable_minor = updates.sellerPayableMinor;
    if (updates.commissionSnapshotHash !== undefined)
      payload.commission_snapshot_hash = updates.commissionSnapshotHash;

    const { data, error } = await ((supabase.from("orders" as any) as any)
      .update(payload)
      .eq("id", id)
      .select()
      .single() as any);
    if (error || !data) {
      if (error?.code === "PGRST116") {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Commande introuvable.",
        });
      }
      databaseFailure("orders.update", error);
    }
    return this.mapRowToOrder(data);
  }

  async recordHandoverPinFailure(id: string): Promise<OrderRecord> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "record_order_handover_pin_failure",
      { p_order_id: id },
    );
    if (error || !data) {
      databaseFailure("orders.recordHandoverPinFailure", error);
    }
    return this.mapRowToOrder(Array.isArray(data) ? data[0] : data);
  }

  private mapRowToRefund(row: any): OrderRefundRecord {
    return {
      id: row.id,
      orderId: row.order_id,
      providerRefundId: row.provider_refund_id || undefined,
      idempotencyKey: row.idempotency_key,
      baseMinor: Number(row.base_minor),
      refundedMinor: Number(row.refunded_minor),
      currency: row.currency,
      isFull: Boolean(row.is_full),
      reason: row.reason || undefined,
      status: row.status,
      actorId: row.actor_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToReturn(row: any): OrderReturnRecord {
    return {
      id: row.id,
      orderId: row.order_id,
      requesterId: row.requester_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      isStatutoryWithdrawal: Boolean(row.is_statutory_withdrawal),
      requestedBaseMinor: Number(row.requested_base_minor),
      currency: row.currency,
      windowExpiresAt: row.window_expires_at,
      decidedBy: row.decided_by || undefined,
      decidedAt: row.decided_at || undefined,
      decisionNote: row.decision_note || undefined,
      carrierName: row.carrier_name || undefined,
      trackingNumber: row.tracking_number || undefined,
      shippedAt: row.shipped_at || undefined,
      receivedAt: row.received_at || undefined,
      refundId: row.refund_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async claimRefund(input: {
    orderId: string;
    idempotencyKey: string;
    baseMinor: number;
    refundedMinor: number;
    currency: string;
    isFull: boolean;
    reason?: string;
    actorId?: string;
  }): Promise<{ refund: OrderRefundRecord; created: boolean }> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await ((
      supabase.from("order_refunds" as any) as any
    )
      .insert({
        order_id: input.orderId,
        idempotency_key: input.idempotencyKey,
        base_minor: input.baseMinor,
        refunded_minor: input.refundedMinor,
        currency: input.currency,
        is_full: input.isFull,
        reason: input.reason ?? null,
        actor_id: input.actorId ?? null,
      })
      .select()
      .single() as any);
    if (!error && data) {
      return { refund: this.mapRowToRefund(data), created: true };
    }
    // 23505 is the unique violation on (order_id, idempotency_key): the same
    // request already claimed this refund, so return that one rather than
    // issuing a second provider refund.
    if (error?.code !== "23505") {
      databaseFailure("orders.claimRefund", error);
    }
    const { data: existing, error: readError } = await (
      supabase.from("order_refunds" as any) as any
    )
      .select("*")
      .eq("order_id", input.orderId)
      .eq("idempotency_key", input.idempotencyKey)
      .single();
    if (readError || !existing) {
      databaseFailure("orders.claimRefund.reread", readError);
    }
    return { refund: this.mapRowToRefund(existing), created: false };
  }

  async updateRefund(
    id: string,
    updates: Partial<
      Pick<OrderRefundRecord, "providerRefundId" | "status" | "refundedMinor">
    >,
  ): Promise<OrderRefundRecord> {
    const payload: Record<string, unknown> = {};
    if (updates.providerRefundId !== undefined)
      payload.provider_refund_id = updates.providerRefundId || null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.refundedMinor !== undefined)
      payload.refunded_minor = updates.refundedMinor;
    const { data, error } = await ((
      getSupabaseAdminClient().from("order_refunds" as any) as any
    )
      .update(payload)
      .eq("id", id)
      .select()
      .single() as any);
    if (error || !data) databaseFailure("orders.updateRefund", error);
    return this.mapRowToRefund(data);
  }

  async findRefundByProviderId(
    providerRefundId: string,
  ): Promise<OrderRefundRecord | null> {
    const { data, error } = await (
      getSupabaseAdminClient().from("order_refunds" as any) as any
    )
      .select("*")
      .eq("provider_refund_id", providerRefundId)
      .maybeSingle();
    if (error) databaseFailure("orders.findRefundByProviderId", error);
    return data ? this.mapRowToRefund(data) : null;
  }

  async listRefunds(orderId: string): Promise<OrderRefundRecord[]> {
    const { data, error } = await (
      getSupabaseAdminClient().from("order_refunds" as any) as any
    )
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) databaseFailure("orders.listRefunds", error);
    return (data || []).map((row: any) => this.mapRowToRefund(row));
  }

  async createReturn(input: {
    orderId: string;
    requesterId: string;
    reason: OrderReturnReason;
    details: string;
    isStatutoryWithdrawal: boolean;
    requestedBaseMinor: number;
    currency: string;
    windowExpiresAt: string;
  }): Promise<OrderReturnRecord> {
    const { data, error } = await ((
      getSupabaseAdminClient().from("order_returns" as any) as any
    )
      .insert({
        order_id: input.orderId,
        requester_id: input.requesterId,
        reason: input.reason,
        details: input.details,
        is_statutory_withdrawal: input.isStatutoryWithdrawal,
        requested_base_minor: input.requestedBaseMinor,
        currency: input.currency,
        window_expires_at: input.windowExpiresAt,
      })
      .select()
      .single() as any);
    if (error?.code === "23505") {
      // The partial unique index on open returns is what makes one claim per
      // order true even under concurrent requests.
      throw new AppError({
        code: "CONFLICT",
        message: "Un retour est déjà en cours pour cette commande.",
      });
    }
    if (error || !data) databaseFailure("orders.createReturn", error);
    return this.mapRowToReturn(data);
  }

  async updateReturn(
    id: string,
    updates: Partial<OrderReturnRecord>,
  ): Promise<OrderReturnRecord> {
    const payload: Record<string, unknown> = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.decidedBy !== undefined)
      payload.decided_by = updates.decidedBy || null;
    if (updates.decidedAt !== undefined)
      payload.decided_at = updates.decidedAt || null;
    if (updates.decisionNote !== undefined)
      payload.decision_note = updates.decisionNote || null;
    if (updates.carrierName !== undefined)
      payload.carrier_name = updates.carrierName || null;
    if (updates.trackingNumber !== undefined)
      payload.tracking_number = updates.trackingNumber || null;
    if (updates.shippedAt !== undefined)
      payload.shipped_at = updates.shippedAt || null;
    if (updates.receivedAt !== undefined)
      payload.received_at = updates.receivedAt || null;
    if (updates.refundId !== undefined)
      payload.refund_id = updates.refundId || null;
    const { data, error } = await ((
      getSupabaseAdminClient().from("order_returns" as any) as any
    )
      .update(payload)
      .eq("id", id)
      .select()
      .single() as any);
    if (error || !data) databaseFailure("orders.updateReturn", error);
    return this.mapRowToReturn(data);
  }

  async findReturnById(id: string): Promise<OrderReturnRecord | null> {
    const { data, error } = await (
      getSupabaseAdminClient().from("order_returns" as any) as any
    )
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseFailure("orders.findReturnById", error);
    return data ? this.mapRowToReturn(data) : null;
  }

  async findOpenReturn(orderId: string): Promise<OrderReturnRecord | null> {
    const { data, error } = await (
      getSupabaseAdminClient().from("order_returns" as any) as any
    )
      .select("*")
      .eq("order_id", orderId)
      .in("status", [...OPEN_RETURN_STATUSES])
      .maybeSingle();
    if (error) databaseFailure("orders.findOpenReturn", error);
    return data ? this.mapRowToReturn(data) : null;
  }

  async listReturns(orderId: string): Promise<OrderReturnRecord[]> {
    const { data, error } = await (
      getSupabaseAdminClient().from("order_returns" as any) as any
    )
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) databaseFailure("orders.listReturns", error);
    return (data || []).map((row: any) => this.mapRowToReturn(row));
  }

  async expireStaleReturns(limit: number): Promise<number> {
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "expire_stale_order_returns",
      { p_limit: limit },
    );
    if (error) databaseFailure("orders.expireStaleReturns", error);
    return Number(data || 0);
  }
}
