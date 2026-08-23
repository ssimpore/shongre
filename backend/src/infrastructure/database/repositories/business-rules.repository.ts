import { createHash } from "node:crypto";
import type {
  ActiveEntitlement,
  CommercialAuditEvent,
  CommercialConfigurationVersion,
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationQuote,
  MonetizationSubscription,
} from "@shongre/contracts/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";

export interface BusinessRulesRepository {
  getAccountAudience(
    accountId: string,
  ): Promise<"individual" | "professional" | "organization">;
  getActiveCatalog(marketCode: string): Promise<MonetizationCatalog | null>;
  getCatalogVersion(versionId: string): Promise<MonetizationCatalog | null>;
  listVersions(marketCode: string): Promise<CommercialConfigurationVersion[]>;
  saveVersion(
    version: CommercialConfigurationVersion,
    catalog: MonetizationCatalog,
  ): Promise<void>;
  publishVersion(
    versionId: string,
    actorId: string,
    reason: string,
  ): Promise<void>;
  activateDueVersions(): Promise<number>;
  saveQuote(
    quote: MonetizationQuote,
    idempotencyKey: string,
  ): Promise<MonetizationQuote>;
  getQuote(quoteId: string): Promise<MonetizationQuote | null>;
  getQuoteByIdempotency(
    accountId: string,
    idempotencyKey: string,
  ): Promise<MonetizationQuote | null>;
  saveOrder(
    order: MonetizationOrder,
    idempotencyKey: string,
  ): Promise<MonetizationOrder>;
  getOrderByQuote(quoteId: string): Promise<MonetizationOrder | null>;
  listOrders(limit?: number): Promise<MonetizationOrder[]>;
  listEntitlements(
    accountId?: string,
    limit?: number,
  ): Promise<ActiveEntitlement[]>;
  listSubscriptions(
    accountId?: string,
    limit?: number,
  ): Promise<MonetizationSubscription[]>;
  updateSubscriptionCancellation(
    subscriptionId: string,
    accountId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<MonetizationSubscription>;
  countQuotesSince(since: string): Promise<number>;
  countPromotionRedemptions(
    promotionId: string,
    accountId?: string,
  ): Promise<number>;
  listAuditEvents(limit?: number): Promise<CommercialAuditEvent[]>;
  appendAudit(event: CommercialAuditEvent): Promise<void>;
  getQuotaUsage(
    accountId: string,
    ruleKey: string,
    marketCode: string,
    periodStart: string,
  ): Promise<number>;
  consumeQuota(input: {
    accountId: string;
    ruleKey: string;
    marketCode: string;
    periodStart: string;
    periodEnd: string;
    limit: number;
    observedMinimum: number;
    amount?: number;
  }): Promise<number>;
}

const now = () => new Date().toISOString();

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

const snapshotHash = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");

const deterministicMemoryId = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 32);

const initialVersion = (): CommercialConfigurationVersion => ({
  id: BASELINE_MONETIZATION_CATALOG.configurationVersionId,
  setId: "commercial-core",
  versionNumber: BASELINE_MONETIZATION_CATALOG.versionNumber,
  marketCode: BASELINE_MONETIZATION_CATALOG.marketCode,
  status: "active",
  reason: "Backfill initial du catalogue commercial audité",
  effectiveFrom: "2026-08-22T00:00:00.000Z",
  createdBy: "system:migration",
  approvedBy: "system:migration",
  createdAt: "2026-08-22T00:00:00.000Z",
  publishedAt: "2026-08-22T00:00:00.000Z",
  productCount: BASELINE_MONETIZATION_CATALOG.products.length,
  ruleCount: BASELINE_MONETIZATION_CATALOG.rules.length,
  conflicts: [],
});

type MemoryState = {
  catalogs: Map<string, MonetizationCatalog>;
  versions: Map<string, CommercialConfigurationVersion>;
  quotes: Map<string, MonetizationQuote>;
  quoteKeys: Map<string, string>;
  orders: Map<string, MonetizationOrder>;
  orderKeys: Map<string, string>;
  audit: CommercialAuditEvent[];
  usage: Map<string, number>;
  entitlements: Map<string, ActiveEntitlement>;
  subscriptions: Map<string, MonetizationSubscription>;
  promotionRedemptions: Array<{
    promotionId: string;
    accountId: string;
    orderId: string;
  }>;
};

const memory: MemoryState = {
  catalogs: new Map([
    [
      BASELINE_MONETIZATION_CATALOG.configurationVersionId,
      BASELINE_MONETIZATION_CATALOG,
    ],
  ]),
  versions: new Map([
    [BASELINE_MONETIZATION_CATALOG.configurationVersionId, initialVersion()],
  ]),
  quotes: new Map(),
  quoteKeys: new Map(),
  orders: new Map(),
  orderKeys: new Map(),
  audit: [],
  usage: new Map(),
  entitlements: new Map(),
  subscriptions: new Map(),
  promotionRedemptions: [],
};

export class DemoBusinessRulesRepository implements BusinessRulesRepository {
  async getAccountAudience(accountId: string) {
    if (/org|organization|dealer|agency|school/i.test(accountId))
      return "organization" as const;
    if (/pro|professional/i.test(accountId)) return "professional" as const;
    return "individual" as const;
  }

  async getActiveCatalog(marketCode: string) {
    const version = [...memory.versions.values()]
      .filter(
        (entry) => entry.marketCode === marketCode && entry.status === "active",
      )
      .sort((a, b) => b.versionNumber - a.versionNumber)[0];
    return version ? memory.catalogs.get(version.id) || null : null;
  }

  async getCatalogVersion(versionId: string) {
    return memory.catalogs.get(versionId) || null;
  }

  async listVersions(marketCode: string) {
    return [...memory.versions.values()]
      .filter((entry) => entry.marketCode === marketCode)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async saveVersion(
    version: CommercialConfigurationVersion,
    catalog: MonetizationCatalog,
  ) {
    memory.versions.set(version.id, structuredClone(version));
    memory.catalogs.set(version.id, structuredClone(catalog));
  }

  async publishVersion(versionId: string, actorId: string, reason: string) {
    const target = memory.versions.get(versionId);
    if (!target || target.status !== "approved")
      throw new Error("version is not approved");
    if (!target.approvedBy || target.createdBy === actorId)
      throw new Error("four-eyes approval required");
    const publishedAt = now();
    if (target.effectiveFrom && target.effectiveFrom > publishedAt) {
      target.status = "scheduled";
      target.reason = reason;
      return;
    }
    for (const version of memory.versions.values()) {
      if (
        version.setId === target.setId &&
        version.marketCode === target.marketCode &&
        version.status === "active"
      ) {
        version.status = "archived";
        version.effectiveUntil = publishedAt;
      }
    }
    target.status = "active";
    target.reason = reason;
    target.effectiveFrom = target.effectiveFrom || publishedAt;
    target.publishedAt = publishedAt;
  }

  async activateDueVersions() {
    const due = [...memory.versions.values()]
      .filter(
        (entry) =>
          entry.status === "scheduled" &&
          entry.effectiveFrom &&
          entry.effectiveFrom <= now(),
      )
      .sort((left, right) =>
        String(left.effectiveFrom).localeCompare(String(right.effectiveFrom)),
      );
    for (const target of due) {
      for (const version of memory.versions.values()) {
        if (
          version.setId === target.setId &&
          version.marketCode === target.marketCode &&
          version.status === "active"
        ) {
          version.status = "archived";
          version.effectiveUntil = target.effectiveFrom;
        }
      }
      target.status = "active";
      target.publishedAt = now();
    }
    return due.length;
  }

  async saveQuote(quote: MonetizationQuote, idempotencyKey: string) {
    const key = `${quote.accountId}:${idempotencyKey}`;
    const existingId = memory.quoteKeys.get(key);
    if (existingId) return structuredClone(memory.quotes.get(existingId)!);
    memory.quotes.set(quote.id, structuredClone(quote));
    memory.quoteKeys.set(key, quote.id);
    return quote;
  }

  async getQuote(quoteId: string) {
    return structuredClone(memory.quotes.get(quoteId) || null);
  }

  async getQuoteByIdempotency(accountId: string, idempotencyKey: string) {
    const id = memory.quoteKeys.get(`${accountId}:${idempotencyKey}`);
    return id ? structuredClone(memory.quotes.get(id) || null) : null;
  }

  async saveOrder(order: MonetizationOrder, idempotencyKey: string) {
    const key = `${order.accountId}:${idempotencyKey}`;
    const existingId = memory.orderKeys.get(key);
    if (existingId) return structuredClone(memory.orders.get(existingId)!);
    memory.orders.set(order.id, structuredClone(order));
    memory.orderKeys.set(key, order.id);
    if (order.status === "paid") {
      const quote = memory.quotes.get(order.quoteId);
      if (quote) quote.status = "consumed";
      const catalog = quote
        ? memory.catalogs.get(quote.configurationVersionId)
        : undefined;
      if (quote && catalog) {
        for (const line of quote.lines) {
          const product = catalog.products.find(
            (candidate) => candidate.id === line.productId,
          );
          const price = product?.prices.find(
            (candidate) => candidate.id === line.priceId,
          );
          const startsAt = order.updatedAt;
          const periodEnd = new Date(startsAt);
          if (line.billingPeriod === "year")
            periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
          else if (line.billingPeriod === "month")
            periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
          const endsAt = price?.durationDays
            ? new Date(
                new Date(startsAt).getTime() + price.durationDays * 86_400_000,
              ).toISOString()
            : line.billingPeriod === "once"
              ? undefined
              : periodEnd.toISOString();
          for (const entitlement of line.entitlementSnapshot) {
            const entitlementId = deterministicMemoryId(
              `${order.id}:${line.productId}:${entitlement.key}`,
            );
            memory.entitlements.set(entitlementId, {
              id: entitlementId,
              accountId: order.accountId,
              productId: line.productId,
              key: entitlement.key,
              value: entitlement.value,
              sourceOrderId: order.id,
              startsAt,
              endsAt,
              status: "active",
            });
          }
          if (product?.kind === "subscription") {
            const subscriptionId = deterministicMemoryId(
              `subscription:${order.id}:${line.productId}`,
            );
            memory.subscriptions.set(subscriptionId, {
              id: subscriptionId,
              accountId: order.accountId,
              productId: line.productId,
              sourceOrderId: order.id,
              status: "active",
              providerSubscriptionId: order.providerCheckoutId,
              currentPeriodStart: startsAt,
              currentPeriodEnd: periodEnd.toISOString(),
              cancelAtPeriodEnd: false,
              createdAt: startsAt,
              updatedAt: startsAt,
            });
          }
        }
        const promotion = quote.promotionCode
          ? catalog.promotions.find(
              (candidate) => candidate.code === quote.promotionCode,
            )
          : undefined;
        if (
          promotion &&
          !memory.promotionRedemptions.some(
            (entry) =>
              entry.promotionId === promotion.id && entry.orderId === order.id,
          )
        ) {
          memory.promotionRedemptions.push({
            promotionId: promotion.id,
            accountId: order.accountId,
            orderId: order.id,
          });
        }
      }
    }
    return order;
  }

  async getOrderByQuote(quoteId: string) {
    const order = [...memory.orders.values()].find(
      (entry) => entry.quoteId === quoteId,
    );
    return order ? structuredClone(order) : null;
  }

  async listOrders(limit = 25) {
    return [...memory.orders.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async listEntitlements(accountId?: string, limit = 100) {
    return [...memory.entitlements.values()]
      .filter((entry) => !accountId || entry.accountId === accountId)
      .sort((left, right) => right.startsAt.localeCompare(left.startsAt))
      .slice(0, limit)
      .map((entry) => structuredClone(entry));
  }

  async listSubscriptions(accountId?: string, limit = 100) {
    return [...memory.subscriptions.values()]
      .filter((entry) => !accountId || entry.accountId === accountId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map((entry) => structuredClone(entry));
  }

  async updateSubscriptionCancellation(
    subscriptionId: string,
    accountId: string,
    cancelAtPeriodEnd: boolean,
  ) {
    const subscription = memory.subscriptions.get(subscriptionId);
    if (!subscription || subscription.accountId !== accountId)
      throw new Error("subscription not found");
    subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
    subscription.updatedAt = now();
    return structuredClone(subscription);
  }

  async countQuotesSince(since: string) {
    return [...memory.quotes.values()].filter(
      (entry, index, all) =>
        entry.createdAt >= since &&
        all.findIndex((candidate) => candidate.id === entry.id) === index,
    ).length;
  }

  async countPromotionRedemptions(promotionId: string, accountId?: string) {
    return memory.promotionRedemptions.filter(
      (entry) =>
        entry.promotionId === promotionId &&
        (!accountId || entry.accountId === accountId),
    ).length;
  }

  async listAuditEvents(limit = 50) {
    return memory.audit.slice(0, limit).map((event) => structuredClone(event));
  }

  async appendAudit(event: CommercialAuditEvent) {
    memory.audit.unshift(structuredClone(event));
  }

  async getQuotaUsage(
    accountId: string,
    ruleKey: string,
    marketCode: string,
    periodStart: string,
  ) {
    return (
      memory.usage.get(
        `${accountId}:${ruleKey}:${marketCode}:${periodStart}`,
      ) || 0
    );
  }

  async consumeQuota(input: {
    accountId: string;
    ruleKey: string;
    marketCode: string;
    periodStart: string;
    periodEnd: string;
    limit: number;
    observedMinimum: number;
    amount?: number;
  }) {
    const key = `${input.accountId}:${input.ruleKey}:${input.marketCode}:${input.periodStart}`;
    const next =
      Math.max(memory.usage.get(key) || 0, input.observedMinimum) +
      (input.amount || 1);
    if (next > input.limit) throw new Error("quota exhausted");
    memory.usage.set(key, next);
    return next;
  }
}

function versionFromRow(row: any): CommercialConfigurationVersion {
  const snapshot = row.snapshot as MonetizationCatalog;
  return {
    id: String(row.id),
    setId: String(row.rule_set_id),
    versionNumber: Number(row.version_number),
    marketCode: row.market_code,
    status: row.status,
    reason: String(row.change_reason),
    effectiveFrom: row.effective_from || undefined,
    effectiveUntil: row.effective_until || undefined,
    createdBy: row.created_by ? String(row.created_by) : "system:migration",
    approvedBy: row.approved_by || undefined,
    createdAt: String(row.created_at),
    publishedAt: row.published_at || undefined,
    productCount: snapshot?.products?.length || 0,
    ruleCount: snapshot?.rules?.length || 0,
    conflicts: Array.isArray(row.conflicts) ? row.conflicts : [],
  };
}

export class PostgresBusinessRulesRepository implements BusinessRulesRepository {
  private get client(): any {
    return getSupabaseAdminClient() as any;
  }

  async getAccountAudience(accountId: string) {
    const { data: organization } = await this.client
      .from("organizations")
      .select("id")
      .eq("owner_id", accountId)
      .limit(1)
      .maybeSingle();
    if (organization) return "organization" as const;
    const { data, error } = await this.client
      .from("profiles")
      .select("account_type")
      .eq("id", accountId)
      .maybeSingle();
    if (error) throw error;
    return data?.account_type === "professional"
      ? ("professional" as const)
      : ("individual" as const);
  }

  async getActiveCatalog(marketCode: string) {
    const { data, error } = await this.client
      .from("commercial_configuration_versions")
      .select("snapshot")
      .eq("market_code", marketCode)
      .eq("status", "active")
      .lte("effective_from", now())
      .or(`effective_until.is.null,effective_until.gt.${now()}`)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data?.snapshot as MonetizationCatalog | undefined) || null;
  }

  async getCatalogVersion(versionId: string) {
    const { data, error } = await this.client
      .from("commercial_configuration_versions")
      .select("snapshot")
      .eq("id", versionId)
      .maybeSingle();
    if (error) throw error;
    return (data?.snapshot as MonetizationCatalog | undefined) || null;
  }

  async listVersions(marketCode: string) {
    const { data, error } = await this.client
      .from("commercial_configuration_versions")
      .select("*")
      .eq("market_code", marketCode)
      .order("version_number", { ascending: false });
    if (error) throw error;
    return (data || []).map(versionFromRow);
  }

  async saveVersion(
    version: CommercialConfigurationVersion,
    catalog: MonetizationCatalog,
  ) {
    const { error } = await this.client.rpc(
      "save_commercial_configuration_version",
      {
        p_version: version,
        p_catalog: catalog,
        p_snapshot_hash: snapshotHash(catalog),
      },
    );
    if (error) throw error;
  }

  async publishVersion(versionId: string, actorId: string, reason: string) {
    const { error } = await this.client.rpc(
      "publish_commercial_configuration",
      {
        p_version_id: versionId,
        p_actor_id: actorId,
        p_reason: reason,
      },
    );
    if (error) throw error;
  }

  async activateDueVersions() {
    const { data, error } = await this.client.rpc(
      "activate_due_commercial_configurations",
    );
    if (error) throw error;
    return Number(data || 0);
  }

  async saveQuote(quote: MonetizationQuote, idempotencyKey: string) {
    const { data, error } = await this.client.rpc("save_monetization_quote", {
      p_quote: quote,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    return data as MonetizationQuote;
  }

  async getQuote(quoteId: string) {
    const { data, error } = await this.client
      .from("monetization_quotes")
      .select("quote_snapshot")
      .eq("id", quoteId)
      .maybeSingle();
    if (error) throw error;
    return (data?.quote_snapshot as MonetizationQuote | undefined) || null;
  }

  async getQuoteByIdempotency(accountId: string, idempotencyKey: string) {
    const { data, error } = await this.client
      .from("monetization_quotes")
      .select("quote_snapshot")
      .eq("account_id", accountId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    return (data?.quote_snapshot as MonetizationQuote | undefined) || null;
  }

  async saveOrder(order: MonetizationOrder, idempotencyKey: string) {
    const { data: existing } = await this.client
      .from("monetization_orders")
      .select("order_snapshot")
      .eq("account_id", order.accountId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing?.order_snapshot)
      return existing.order_snapshot as MonetizationOrder;
    const { data, error } = await this.client
      .from("monetization_orders")
      .insert({
        id: order.id,
        quote_id: order.quoteId,
        account_id: order.accountId,
        snapshot_hash: order.snapshotHash,
        currency: order.total.currency,
        total_minor: order.total.amountMinor,
        status: order.status,
        provider: order.provider,
        provider_checkout_id: order.providerCheckoutId,
        provider_payment_id: order.providerPaymentId,
        invoice_id: order.invoiceId,
        idempotency_key: idempotencyKey,
        order_snapshot: order,
      })
      .select("order_snapshot")
      .single();
    if (error) {
      if (error.code === "23505") {
        const existingByQuote = await this.getOrderByQuote(order.quoteId);
        if (existingByQuote) return existingByQuote;
      }
      throw error;
    }
    return data.order_snapshot as MonetizationOrder;
  }

  async getOrderByQuote(quoteId: string) {
    const { data, error } = await this.client
      .from("monetization_orders")
      .select("order_snapshot")
      .eq("quote_id", quoteId)
      .maybeSingle();
    if (error) throw error;
    return (data?.order_snapshot as MonetizationOrder | undefined) || null;
  }

  async listOrders(limit = 25) {
    const { data, error } = await this.client
      .from("monetization_orders")
      .select("order_snapshot")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(
      (row: any) => row.order_snapshot as MonetizationOrder,
    );
  }

  async listEntitlements(accountId?: string, limit = 100) {
    let query = this.client
      .from("monetization_entitlements")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(limit);
    if (accountId) query = query.eq("account_id", accountId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any): ActiveEntitlement => ({
      id: String(row.id),
      accountId: String(row.account_id),
      productId: String(row.product_id),
      key: String(row.entitlement_key),
      value: row.entitlement_value,
      sourceOrderId: row.source_order_id || undefined,
      startsAt: String(row.starts_at),
      endsAt: row.ends_at || undefined,
      status: row.status,
    }));
  }

  async listSubscriptions(accountId?: string, limit = 100) {
    let query = this.client
      .from("monetization_subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (accountId) query = query.eq("account_id", accountId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any): MonetizationSubscription => ({
      id: String(row.id),
      accountId: String(row.account_id),
      productId: String(row.product_id),
      sourceOrderId: String(row.source_order_id),
      status: row.status,
      providerSubscriptionId: row.provider_subscription_id || undefined,
      currentPeriodStart: String(row.current_period_start),
      currentPeriodEnd: String(row.current_period_end),
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  async updateSubscriptionCancellation(
    subscriptionId: string,
    accountId: string,
    cancelAtPeriodEnd: boolean,
  ) {
    const { data, error } = await this.client
      .from("monetization_subscriptions")
      .update({ cancel_at_period_end: cancelAtPeriodEnd, updated_at: now() })
      .eq("id", subscriptionId)
      .eq("account_id", accountId)
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: String(data.id),
      accountId: String(data.account_id),
      productId: String(data.product_id),
      sourceOrderId: String(data.source_order_id),
      status: data.status,
      providerSubscriptionId: data.provider_subscription_id || undefined,
      currentPeriodStart: String(data.current_period_start),
      currentPeriodEnd: String(data.current_period_end),
      cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
    };
  }

  async countQuotesSince(since: string) {
    const { count, error } = await this.client
      .from("monetization_quotes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if (error) throw error;
    return Number(count || 0);
  }

  async countPromotionRedemptions(promotionId: string, accountId?: string) {
    let query = this.client
      .from("monetization_promotion_redemptions")
      .select("order_id", { count: "exact", head: true })
      .eq("promotion_id", promotionId);
    if (accountId) query = query.eq("account_id", accountId);
    const { count, error } = await query;
    if (error) throw error;
    return Number(count || 0);
  }

  async listAuditEvents(limit = 50) {
    const { data, error } = await this.client
      .from("commercial_configuration_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      reason: row.reason,
      before: row.before_snapshot,
      after: row.after_snapshot,
      approvalActorId: row.approval_actor_id || undefined,
      requestId: row.request_id,
      ipPrefix: row.ip_prefix || undefined,
      createdAt: row.created_at,
    }));
  }

  async appendAudit(event: CommercialAuditEvent) {
    const { error } = await this.client
      .from("commercial_configuration_audit")
      .insert({
        id: event.id,
        actor_id: event.actorId,
        actor_name: event.actorName,
        action: event.action,
        entity_type: event.entityType,
        entity_id: event.entityId,
        reason: event.reason,
        before_snapshot: event.before,
        after_snapshot: event.after,
        approval_actor_id: event.approvalActorId,
        request_id: event.requestId,
        ip_prefix: event.ipPrefix,
        created_at: event.createdAt,
      });
    if (error) throw error;
  }

  async getQuotaUsage(
    accountId: string,
    ruleKey: string,
    marketCode: string,
    periodStart: string,
  ) {
    const { data, error } = await this.client
      .from("monetization_usage_counters")
      .select("used_count")
      .eq("account_id", accountId)
      .eq("rule_key", ruleKey)
      .eq("market_code", marketCode)
      .eq("period_start", periodStart)
      .maybeSingle();
    if (error) throw error;
    return Number(data?.used_count || 0);
  }

  async consumeQuota(input: {
    accountId: string;
    ruleKey: string;
    marketCode: string;
    periodStart: string;
    periodEnd: string;
    limit: number;
    observedMinimum: number;
    amount?: number;
  }) {
    const { data, error } = await this.client.rpc(
      "consume_monetization_quota",
      {
        p_account_id: input.accountId,
        p_rule_key: input.ruleKey,
        p_market_code: input.marketCode,
        p_period_start: input.periodStart,
        p_period_end: input.periodEnd,
        p_limit: input.limit,
        p_observed_min: input.observedMinimum,
        p_amount: input.amount || 1,
      },
    );
    if (error) throw error;
    return Number(data);
  }
}
