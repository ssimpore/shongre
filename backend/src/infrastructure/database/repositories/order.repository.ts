import { Transaction, DeliveryType } from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { databaseFailure } from "./repository-error.js";

export interface IOrderRepository {
  findById(id: string): Promise<Transaction | null>;
  getPurchases(userId: string): Promise<Transaction[]>;
  getSales(userId: string): Promise<Transaction[]>;
  create(order: Transaction): Promise<Transaction>;
  update(id: string, updates: Partial<Transaction>): Promise<Transaction>;
}

export const CANONICAL_DEMO_ORDERS: Record<string, Transaction> = {
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
    deliveryMethod: "relay_point",
    paymentMethod: "card",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export class DemoOrderRepository implements IOrderRepository {
  private orders: Map<string, Transaction> = new Map();

  constructor(
    initialOrders: Record<string, Transaction> = CANONICAL_DEMO_ORDERS,
  ) {
    this.reset(initialOrders);
  }

  reset(initialOrders: Record<string, Transaction> = CANONICAL_DEMO_ORDERS) {
    this.orders.clear();
    Object.values(initialOrders).forEach((o) =>
      this.orders.set(o.id, { ...o }),
    );
  }

  async findById(id: string): Promise<Transaction | null> {
    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.buyerId === userId)
      .map((o) => ({ ...o }));
  }

  async getSales(userId: string): Promise<Transaction[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.sellerId === userId)
      .map((o) => ({ ...o }));
  }

  async create(order: Transaction): Promise<Transaction> {
    this.orders.set(order.id, { ...order });
    return { ...order };
  }

  async update(
    id: string,
    updates: Partial<Transaction>,
  ): Promise<Transaction> {
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
    this.orders.set(id, updated as Transaction);
    return { ...(updated as Transaction) };
  }
}

export class PostgresOrderRepository implements IOrderRepository {
  private mapRowToOrder(row: any): Transaction {
    return {
      id: row.id,
      orderNumber: row.order_number,
      transactionType: row.transaction_type,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      status: row.status,
      itemAmount: Number(row.item_amount),
      protectionFee: Number(row.protection_fee || 0),
      shippingFee: Number(row.shipping_fee || 0),
      totalCharged: Number(row.total_charged),
      escrowSecuredAmount: Number(row.escrow_secured_amount),
      depositAmount: row.deposit_amount
        ? Number(row.deposit_amount)
        : undefined,
      remainingBalance: row.remaining_balance
        ? Number(row.remaining_balance)
        : undefined,
      deliveryMethod: (row.delivery_method as DeliveryType) || "hand_delivery",
      shippingAddress: row.shipping_address || undefined,
      handoverPin: row.handover_pin || undefined,
      isPinVerified: Boolean(row.is_pin_verified),
      paymentMethod: row.payment_method || "card",
      paymentIntentId: row.payment_intent_id || undefined,
      disputeReason: row.dispute_reason || undefined,
      disputeDetails: row.dispute_details || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Transaction | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(*), buyer:buyer_id(*), seller:seller_id(*)")
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

  async getPurchases(userId: string): Promise<Transaction[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(*), buyer:buyer_id(*), seller:seller_id(*)")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });
      if (error || !data) databaseFailure("orders.getPurchases", error);
      return data.map((r: any) => this.mapRowToOrder(r));
    } catch (error) {
      databaseFailure("orders.getPurchases", error);
    }
  }

  async getSales(userId: string): Promise<Transaction[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(*), buyer:buyer_id(*), seller:seller_id(*)")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
      if (error || !data) databaseFailure("orders.getSales", error);
      return data.map((r: any) => this.mapRowToOrder(r));
    } catch (error) {
      databaseFailure("orders.getSales", error);
    }
  }

  async create(order: Transaction): Promise<Transaction> {
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
      protection_fee: order.protectionFee,
      shipping_fee: order.shippingFee,
      total_charged: order.totalCharged,
      escrow_secured_amount: order.escrowSecuredAmount,
      deposit_amount: order.depositAmount || 0,
      remaining_balance: order.remainingBalance || 0,
      delivery_method: order.deliveryMethod,
      shipping_address: order.shippingAddress || null,
      handover_pin: order.handoverPin || null,
      is_pin_verified: Boolean(order.isPinVerified),
      payment_method: order.paymentMethod,
      payment_intent_id: order.paymentIntentId || null,
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
    updates: Partial<Transaction>,
  ): Promise<Transaction> {
    const supabase = getSupabaseAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isPinVerified !== undefined)
      payload.is_pin_verified = updates.isPinVerified;
    if (updates.disputeReason !== undefined)
      payload.dispute_reason = updates.disputeReason;
    if (updates.disputeDetails !== undefined)
      payload.dispute_details = updates.disputeDetails;

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
}
