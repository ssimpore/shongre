import { createHash } from "node:crypto";
import type {
  ActiveEntitlement,
  BillingOverview,
  CreditTransaction,
  CommercialAuditEvent,
  CommercialConfigurationVersion,
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationQuote,
  MonetizationSubscription,
  SubscriptionChangePreview,
  SubscriptionChangeRequest,
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
  getBillingOverview(accountId: string): Promise<BillingOverview>;
  applySubscriptionChange(
    accountId: string,
    request: SubscriptionChangeRequest,
    preview: SubscriptionChangePreview,
  ): Promise<MonetizationSubscription>;
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
              verticalId: entitlement.verticalId || line.verticalId,
              mergePolicy: entitlement.mergePolicy,
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
              productVersionId: line.productVersionId,
              priceId: line.priceId,
              sourceOrderId: order.id,
              status:
                quote.trial?.productId === line.productId
                  ? "trialing"
                  : "active",
              providerSubscriptionId: order.providerCheckoutId,
              billingPeriod: line.billingPeriod,
              currentPeriodStart: startsAt,
              currentPeriodEnd:
                quote.trial?.productId === line.productId
                  ? quote.trial.endsAt
                  : periodEnd.toISOString(),
              cancelAtPeriodEnd: false,
              createdAt: startsAt,
              updatedAt: startsAt,
              verticalId: product.commercialProfile.verticalId,
              familyId: product.commercialProfile.familyId,
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

  async getBillingOverview(accountId: string): Promise<BillingOverview> {
    const subscriptions = await this.listSubscriptions(accountId, 100);
    const entitlements = await this.listEntitlements(accountId, 200);
    const accountOrders = [...memory.orders.values()].filter(
      (entry) => entry.accountId === accountId,
    );
    const accountSubscriptions = subscriptions as MonetizationSubscription[];
    const accountEntitlements = entitlements as ActiveEntitlement[];
    const currentSubscription = accountSubscriptions.find((entry) =>
      [
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancellation_pending",
      ].includes(entry.status),
    );
    const limits = accountEntitlements.filter(
      (entry) =>
        ["maxActiveListings", "maxPhotosPerListing", "teamMembers"].includes(
          entry.key,
        ) && typeof entry.value === "number",
    );
    return {
      currentSubscription,
      subscriptions: accountSubscriptions,
      entitlements: accountEntitlements,
      usage: limits.map((entry) => ({
        key: entry.key,
        label: entry.key,
        used: 0,
        limit: Number(entry.value),
        unit: "unités",
        resetsAt: currentSubscription?.currentPeriodEnd,
      })),
      orders: accountOrders,
      payments: [],
      invoices: [],
      refunds: [],
      creditBalances: [],
      subscriptionEvents: [],
      effectiveEntitlements: [],
    };
  }

  async applySubscriptionChange(
    accountId: string,
    request: SubscriptionChangeRequest,
    preview: SubscriptionChangePreview,
  ) {
    const subscription = memory.subscriptions.get(request.subscriptionId);
    if (!subscription || subscription.accountId !== accountId)
      throw new Error("subscription not found");
    if (preview.effectiveAt === "period_end") {
      subscription.scheduledProductId = request.targetProductId;
      subscription.scheduledPriceId = request.targetPriceId;
      subscription.scheduledChangeAt = subscription.currentPeriodEnd;
    } else {
      const catalog = [...memory.catalogs.values()].find((candidate) =>
        candidate.products.some(
          (product) => product.id === request.targetProductId,
        ),
      );
      const targetProduct = catalog?.products.find(
        (product) => product.id === request.targetProductId,
      );
      const targetPrice = targetProduct?.prices.find(
        (price) => price.id === request.targetPriceId,
      );
      if (!targetProduct || !targetPrice)
        throw new Error("target subscription offer not found");
      const previousProductId = subscription.productId;
      const changedAt = now();
      for (const entitlement of memory.entitlements.values()) {
        if (
          entitlement.sourceOrderId === subscription.sourceOrderId &&
          entitlement.productId === previousProductId &&
          ["active", "scheduled"].includes(entitlement.status)
        ) {
          entitlement.status = "revoked";
          entitlement.endsAt = new Date(
            Math.max(
              new Date(changedAt).getTime(),
              new Date(entitlement.startsAt).getTime() + 1,
            ),
          ).toISOString();
        }
      }
      for (const definition of targetProduct.entitlements) {
        const entitlementId = deterministicMemoryId(
          `${subscription.sourceOrderId}:${targetProduct.id}:${definition.key}`,
        );
        memory.entitlements.set(entitlementId, {
          id: entitlementId,
          accountId: subscription.accountId,
          productId: targetProduct.id,
          key: definition.key,
          value: definition.value,
          sourceOrderId: subscription.sourceOrderId,
          startsAt: changedAt,
          endsAt: subscription.currentPeriodEnd,
          status: "active",
          verticalId:
            definition.verticalId || targetProduct.commercialProfile.verticalId,
          mergePolicy: definition.mergePolicy,
        });
      }
      subscription.productId = request.targetProductId;
      subscription.productVersionId = targetProduct.versionId;
      subscription.priceId = request.targetPriceId;
      subscription.billingPeriod = targetPrice.billingPeriod;
      subscription.familyId = targetProduct.commercialProfile.familyId;
      subscription.verticalId = targetProduct.commercialProfile.verticalId;
      subscription.scheduledProductId = undefined;
      subscription.scheduledPriceId = undefined;
      subscription.scheduledChangeAt = undefined;
    }
    subscription.updatedAt = now();
    return structuredClone(subscription);
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
    subscription.status = cancelAtPeriodEnd ? "cancellation_pending" : "active";
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

function subscriptionFromRow(row: any): MonetizationSubscription {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    productId: String(row.product_id),
    productVersionId: row.product_version_id || undefined,
    priceId: row.price_id || undefined,
    sourceOrderId: String(row.source_order_id),
    status: row.status,
    providerSubscriptionId: row.provider_subscription_id || undefined,
    billingPeriod: row.billing_period || undefined,
    currentPeriodStart: String(row.current_period_start),
    currentPeriodEnd: String(row.current_period_end),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    scheduledProductId: row.scheduled_product_id || undefined,
    scheduledPriceId: row.scheduled_price_id || undefined,
    scheduledChangeAt: row.scheduled_change_at || undefined,
    gracePeriodEndsAt: row.grace_period_ends_at || undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
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
      verticalId: row.vertical_id || undefined,
      mergePolicy: row.merge_policy || undefined,
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
    return (data || []).map(subscriptionFromRow);
  }

  async getBillingOverview(accountId: string): Promise<BillingOverview> {
    const [
      customerResult,
      subscriptions,
      entitlements,
      ordersResult,
      paymentsResult,
      invoicesResult,
      refundsResult,
      creditsResult,
      usageResult,
      eventsResult,
    ] = await Promise.all([
      this.client
        .from("monetization_billing_customers")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle(),
      this.listSubscriptions(accountId, 100),
      this.listEntitlements(accountId, 200),
      this.client
        .from("monetization_orders")
        .select("order_snapshot")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(100),
      this.client
        .from("monetization_payments")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(100),
      this.client
        .from("monetization_invoices")
        .select("*")
        .eq("account_id", accountId)
        .order("issued_at", { ascending: false })
        .limit(100),
      this.client
        .from("monetization_refunds")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(100),
      this.client
        .from("monetization_credit_transactions")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(500),
      this.client
        .from("monetization_usage_records")
        .select("*")
        .eq("account_id", accountId)
        .order("recorded_at", { ascending: false })
        .limit(500),
      this.client
        .from("monetization_subscription_events")
        .select("*")
        .eq("account_id", accountId)
        .order("occurred_at", { ascending: false })
        .limit(200),
    ]);
    const results = [
      customerResult,
      ordersResult,
      paymentsResult,
      invoicesResult,
      refundsResult,
      creditsResult,
      usageResult,
      eventsResult,
    ];
    const failure = results.find((result: any) => result.error)?.error;
    if (failure) throw failure;
    const accountSubscriptions = subscriptions as MonetizationSubscription[];
    const accountEntitlements = entitlements as ActiveEntitlement[];
    const currentSubscription = accountSubscriptions.find((entry) =>
      [
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancellation_pending",
      ].includes(entry.status),
    );
    const creditTransactions: CreditTransaction[] = (
      creditsResult.data || []
    ).map((row: any) => ({
      id: String(row.id),
      accountId: String(row.account_id),
      creditType: String(row.credit_type),
      quantity: Number(row.quantity),
      reason: String(row.reason),
      sourceType: row.source_type,
      sourceId: row.source_id || undefined,
      expiresAt: row.expires_at || undefined,
      idempotencyKey: String(row.idempotency_key),
      createdAt: String(row.created_at),
    }));
    const creditTypes = [
      ...new Set(creditTransactions.map((entry) => entry.creditType)),
    ];
    const usageRows = usageResult.data || [];
    const usageByKey = new Map<string, number>();
    for (const row of usageRows) {
      usageByKey.set(
        String(row.usage_key),
        (usageByKey.get(String(row.usage_key)) || 0) + Number(row.quantity),
      );
    }
    const numericLimits = accountEntitlements.filter(
      (entry) => typeof entry.value === "number",
    );
    const customer = customerResult.data;
    return {
      customer: customer
        ? {
            id: String(customer.id),
            accountId: String(customer.account_id),
            legalName: String(customer.legal_name),
            email: String(customer.email),
            taxId: customer.tax_id || undefined,
            taxExempt: Boolean(customer.tax_exempt),
            address: customer.billing_address || undefined,
            providerCustomerId: customer.provider_customer_id || undefined,
            createdAt: String(customer.created_at),
            updatedAt: String(customer.updated_at),
          }
        : undefined,
      currentSubscription,
      subscriptions: accountSubscriptions,
      entitlements: accountEntitlements,
      usage: numericLimits.map((entry) => ({
        key: entry.key,
        label: entry.key,
        used: usageByKey.get(entry.key) || 0,
        limit: Number(entry.value),
        unit: "unités",
        resetsAt: currentSubscription?.currentPeriodEnd,
      })),
      orders: (ordersResult.data || []).map(
        (row: any) => row.order_snapshot as MonetizationOrder,
      ),
      payments: (paymentsResult.data || []).map((row: any) => ({
        id: String(row.id),
        accountId: String(row.account_id),
        orderId: String(row.order_id),
        status: row.status,
        amount: {
          amountMinor: Number(row.amount_minor),
          currency: row.currency,
        },
        provider: row.provider,
        providerPaymentId: row.provider_payment_id || undefined,
        failureCode: row.failure_code || undefined,
        failureMessage: row.failure_message || undefined,
        paidAt: row.paid_at || undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })),
      invoices: (invoicesResult.data || []).map((row: any) => ({
        id: String(row.id),
        accountId: String(row.account_id),
        orderId: row.order_id || undefined,
        subscriptionId: row.subscription_id || undefined,
        number: String(row.invoice_number),
        status: row.status,
        subtotal: {
          amountMinor: Number(row.subtotal_minor),
          currency: row.currency,
        },
        discount: {
          amountMinor: Number(row.discount_minor),
          currency: row.currency,
        },
        tax: { amountMinor: Number(row.tax_minor), currency: row.currency },
        total: { amountMinor: Number(row.total_minor), currency: row.currency },
        amountPaid: {
          amountMinor: Number(row.amount_paid_minor),
          currency: row.currency,
        },
        amountDue: {
          amountMinor: Number(row.amount_due_minor),
          currency: row.currency,
        },
        issuedAt: String(row.issued_at),
        dueAt: row.due_at || undefined,
        paidAt: row.paid_at || undefined,
        receiptUrl: row.receipt_url || undefined,
        providerInvoiceId: row.provider_invoice_id || undefined,
      })),
      refunds: (refundsResult.data || []).map((row: any) => ({
        id: String(row.id),
        accountId: String(row.account_id),
        orderId: String(row.order_id),
        paymentId: String(row.payment_id),
        status: row.status,
        amount: {
          amountMinor: Number(row.amount_minor),
          currency: row.currency,
        },
        reason: String(row.reason),
        providerRefundId: row.provider_refund_id || undefined,
        requestedBy: String(row.requested_by),
        approvedBy: row.approved_by || undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })),
      creditBalances: creditTypes.map((creditType) => {
        const transactions = creditTransactions.filter(
          (entry) => entry.creditType === creditType,
        );
        return {
          accountId,
          creditType,
          available: Math.max(
            0,
            transactions.reduce((sum, entry) => sum + entry.quantity, 0),
          ),
          reserved: 0,
          nextExpiryAt: transactions
            .map((entry) => entry.expiresAt)
            .filter((value): value is string => Boolean(value))
            .sort()[0],
          transactions,
        };
      }),
      subscriptionEvents: (eventsResult.data || []).map((row: any) => ({
        id: String(row.id),
        subscriptionId: String(row.subscription_id),
        accountId: String(row.account_id),
        type: row.event_type,
        fromStatus: row.from_status || undefined,
        toStatus: row.to_status || undefined,
        metadata: row.metadata || {},
        idempotencyKey: String(row.idempotency_key),
        occurredAt: String(row.occurred_at),
      })),
      effectiveEntitlements: [],
    };
  }

  async applySubscriptionChange(
    accountId: string,
    request: SubscriptionChangeRequest,
    preview: SubscriptionChangePreview,
  ) {
    const update =
      preview.effectiveAt === "period_end"
        ? {
            scheduled_product_id: request.targetProductId,
            scheduled_price_id: request.targetPriceId,
            scheduled_change_at: preview.nextBillingAt,
            updated_at: now(),
          }
        : {
            product_id: request.targetProductId,
            price_id: request.targetPriceId,
            scheduled_product_id: null,
            scheduled_price_id: null,
            scheduled_change_at: null,
            updated_at: now(),
          };
    const { data, error } = await this.client
      .from("monetization_subscriptions")
      .update(update)
      .eq("id", request.subscriptionId)
      .eq("account_id", accountId)
      .select("*")
      .single();
    if (error) throw error;
    const { error: eventError } = await this.client
      .from("monetization_subscription_events")
      .insert({
        subscription_id: data.id,
        account_id: data.account_id,
        event_type:
          preview.effectiveAt === "period_end" ? "change_scheduled" : "changed",
        from_status: data.status,
        to_status: data.status,
        metadata: {
          productId: request.targetProductId,
          priceId: request.targetPriceId,
          effectiveAt: preview.effectiveAt,
        },
        idempotency_key: request.idempotencyKey,
      });
    if (eventError && eventError.code !== "23505") throw eventError;
    return subscriptionFromRow(data);
  }

  async updateSubscriptionCancellation(
    subscriptionId: string,
    accountId: string,
    cancelAtPeriodEnd: boolean,
  ) {
    const { data: owned, error: ownershipError } = await this.client
      .from("monetization_subscriptions")
      .select("id,updated_at")
      .eq("id", subscriptionId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (ownershipError) throw ownershipError;
    if (!owned) throw new Error("subscription not found");
    const { data, error } = await this.client.rpc(
      "transition_monetization_subscription",
      {
        p_subscription_id: subscriptionId,
        p_target_status: cancelAtPeriodEnd ? "cancellation_pending" : "active",
        p_event_type: cancelAtPeriodEnd
          ? "cancellation_scheduled"
          : "reactivated",
        p_idempotency_key: `cancellation:${cancelAtPeriodEnd}:${owned.updated_at}`,
        p_metadata: { cancelAtPeriodEnd },
        p_actor_id: accountId,
      },
    );
    if (error) throw error;
    return subscriptionFromRow(data);
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
