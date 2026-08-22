import type {
  ActiveEntitlement,
  CommercialAuditEvent,
  CommercialConfigurationVersion,
  CommercialDraftPatch,
  MonetizationAdminOverview,
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationQuote,
  MonetizationSubscription,
  PromotionValidationRequest,
  SubscriptionCancellationRequest,
  QuoteRequest,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from "@shongre/contracts/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import type { BusinessRulesServiceContract } from "../../contracts/business-rules.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";

const createdAt = "2026-08-22T00:00:00.000Z";
const versions: CommercialConfigurationVersion[] = [
  {
    id: BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    setId: "commercial-core",
    versionNumber: 1,
    marketCode: "FR",
    status: "active",
    reason: "Backfill initial du catalogue commercial audité",
    effectiveFrom: createdAt,
    createdBy: "Système",
    approvedBy: "Direction commerciale",
    createdAt,
    publishedAt: createdAt,
    productCount: BASELINE_MONETIZATION_CATALOG.products.length,
    ruleCount: BASELINE_MONETIZATION_CATALOG.rules.length,
    conflicts: [],
  },
];
const catalogs = new Map<string, MonetizationCatalog>([
  [BASELINE_MONETIZATION_CATALOG.configurationVersionId, structuredClone(BASELINE_MONETIZATION_CATALOG)],
]);
const auditEvents: CommercialAuditEvent[] = [];
const quotes = new Map<string, MonetizationQuote>();
const orders = new Map<string, MonetizationOrder>();
const activeEntitlements: ActiveEntitlement[] = [];
const subscriptions: MonetizationSubscription[] = [];

function dimension(values: string[], actual?: string) {
  return values.length === 0 || values.includes("all") || Boolean(actual && values.includes(actual));
}

function digest(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(8);
}

export class DemoBusinessRulesService implements BusinessRulesServiceContract {
  async getCatalog(marketCode = "FR") {
    await simulateNetworkDelay();
    const version = versions.find((entry) => entry.marketCode === marketCode && entry.status === "active");
    return structuredClone(catalogs.get(version?.id || "") || BASELINE_MONETIZATION_CATALOG);
  }

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    await simulateNetworkDelay();
    const catalog = await this.getCatalog(context.marketCode);
    const ordered = [...catalog.rules].sort((a, b) => b.priority - a.priority);
    const outcomes: Record<string, string | number | boolean> = {};
    const explanation = ordered.map((rule) => {
      const matched =
        rule.status === "active" &&
        dimension(rule.scope.marketCodes, context.marketCode) &&
        dimension(rule.scope.currencies, context.currency) &&
        dimension(rule.scope.categoryIds, context.categoryId) &&
        dimension(rule.scope.subtypeIds, context.subtypeId) &&
        dimension(rule.scope.audiences, context.userType) &&
        dimension(rule.scope.publicationChannels, context.publicationChannel) &&
        rule.conditions.length === 0;
      if (matched) {
        Object.entries(rule.outcome).forEach(([key, value]) => {
          if (value !== undefined && !(key in outcomes)) outcomes[key] = value;
        });
      }
      return {
        ruleId: rule.id,
        ruleKey: rule.key,
        ruleName: rule.name,
        matched,
        priority: rule.priority,
        specificity: Object.values(rule.scope).filter((value) => value.length).length * 100,
        outcome: matched ? rule.outcome : undefined,
        reasonCode: matched ? "MATCHED" : "SCOPE_NOT_MATCHED",
      };
    });
    const quotaLimit = typeof outcomes.quotaLimit === "number" ? outcomes.quotaLimit : undefined;
    const quotaRemaining = quotaLimit === undefined ? undefined : Math.max(0, quotaLimit - context.usageLevel);
    const eligible = outcomes.eligible !== false && (quotaRemaining === undefined || quotaRemaining > 0);
    return {
      configurationVersionId: catalog.configurationVersionId,
      eligible,
      reasonCode: eligible ? String(outcomes.reasonCode || "ELIGIBLE") : "QUOTA_EXHAUSTED",
      quotaLimit,
      quotaRemaining,
      durationDays: typeof outcomes.durationDays === "number" ? outcomes.durationDays : undefined,
      outcomes,
      explanation,
    };
  }

  async createQuote(request: QuoteRequest) {
    await simulateNetworkDelay();
    const key = `demo-account:${request.idempotencyKey}`;
    const existing = quotes.get(key);
    if (existing) return structuredClone(existing);
    const catalog = await this.getCatalog(request.marketCode);
    const promotionValidation = request.promotionCode
      ? await this.validatePromotion({
          code: request.promotionCode,
          productIds: request.productIds,
          marketCode: request.marketCode,
          categoryId: request.categoryId,
          subtypeId: request.subtypeId,
        })
      : undefined;
    if (promotionValidation && !promotionValidation.valid) {
      throw new Error(promotionValidation.reasonCode);
    }
    const promotion = promotionValidation?.promotionId
      ? catalog.promotions.find((entry) => entry.id === promotionValidation.promotionId)
      : undefined;
    const lines = request.productIds.map((id) => {
      const product = catalog.products.find((entry) => entry.id === id);
      if (!product) throw new Error("Produit indisponible");
      const price = product.prices.find((candidate) =>
        !request.priceIds?.[product.id] || candidate.id === request.priceIds[product.id],
      );
      if (!price) throw new Error("Prix indisponible");
      const discountMinor = !promotion?.productIds.includes(product.id)
        ? 0
        : promotion.discountType === "fixed"
          ? Math.min(price.amount.amountMinor, promotion.discountValue)
          : Math.min(
              price.amount.amountMinor,
              Math.round((price.amount.amountMinor * promotion.discountValue) / 10_000),
            );
      const taxableMinor = price.amount.amountMinor - discountMinor;
      const taxMinor = price.priceIncludesTax ? 0 : Math.round((taxableMinor * price.taxRateBps) / 10_000);
      return {
        productId: product.id,
        productVersionId: product.versionId,
        priceId: price.id,
        billingPeriod: price.billingPeriod,
        label: product.name,
        quantity: 1,
        unitAmountMinor: price.amount.amountMinor,
        subtotalMinor: price.amount.amountMinor,
        discountMinor,
        taxMinor,
        totalMinor: taxableMinor + taxMinor,
        taxRateBps: price.taxRateBps,
        entitlementSnapshot: structuredClone(product.entitlements),
      };
    });
    const now = new Date().toISOString();
    const quote: MonetizationQuote = {
      id: `quote_${digest(key).slice(0, 24)}`,
      accountId: "demo-account",
      configurationVersionId: catalog.configurationVersionId,
      marketCode: request.marketCode,
      currency: catalog.currency,
      lines,
      subtotalMinor: lines.reduce((sum, line) => sum + line.subtotalMinor, 0),
      discountMinor: lines.reduce((sum, line) => sum + line.discountMinor, 0),
      taxMinor: lines.reduce((sum, line) => sum + line.taxMinor, 0),
      totalMinor: lines.reduce((sum, line) => sum + line.totalMinor, 0),
      snapshotHash: digest(JSON.stringify(lines)),
      promotionCode: promotion?.code,
      reasonCode: promotion ? "PROMOTION_APPLIED" : "CATALOG_PRICE",
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      createdAt: now,
    };
    quotes.set(key, quote);
    quotes.set(quote.id, quote);
    return structuredClone(quote);
  }

  async createCheckout(quoteId: string, idempotencyKey: string) {
    await simulateNetworkDelay();
    const existing = orders.get(idempotencyKey);
    if (existing) return structuredClone(existing);
    const quote = quotes.get(quoteId);
    if (!quote) throw new Error("Devis introuvable");
    const now = new Date().toISOString();
    const order: MonetizationOrder = {
      id: `order_${digest(idempotencyKey).slice(0, 24)}`,
      quoteId,
      accountId: quote.accountId,
      snapshotHash: quote.snapshotHash,
      total: { amountMinor: quote.totalMinor, currency: quote.currency },
      status: "paid",
      provider: "demo",
      providerCheckoutId: `demo_${digest(idempotencyKey).slice(0, 16)}`,
      createdAt: now,
      updatedAt: now,
    };
    orders.set(idempotencyKey, order);
    const catalog = catalogs.get(quote.configurationVersionId);
    quote.lines.forEach((line) => {
      const product = catalog?.products.find((entry) => entry.id === line.productId);
      const price = product?.prices.find((entry) => entry.id === line.priceId);
      const periodEnd = new Date(now);
      if (line.billingPeriod === "year") periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
      else if (line.billingPeriod === "month") periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      const endsAt = price?.durationDays
        ? new Date(Date.now() + price.durationDays * 86_400_000).toISOString()
        : line.billingPeriod === "once"
          ? undefined
          : periodEnd.toISOString();
      line.entitlementSnapshot.forEach((entitlement) => {
        const id = `ent_${digest(`${order.id}:${line.productId}:${entitlement.key}`).slice(0, 24)}`;
        if (activeEntitlements.some((entry) => entry.id === id)) return;
        activeEntitlements.push({
          id,
          accountId: quote.accountId,
          productId: line.productId,
          key: entitlement.key,
          value: entitlement.value,
          sourceOrderId: order.id,
          startsAt: now,
          endsAt,
          status: "active",
        });
      });
      if (product?.kind === "subscription") {
        const id = `sub_${digest(`${order.id}:${line.productId}`).slice(0, 24)}`;
        if (!subscriptions.some((entry) => entry.id === id)) {
          subscriptions.push({
            id,
            accountId: quote.accountId,
            productId: line.productId,
            sourceOrderId: order.id,
            status: "active",
            providerSubscriptionId: order.providerCheckoutId,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd.toISOString(),
            cancelAtPeriodEnd: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });
    return structuredClone(order);
  }

  async validatePromotion(request: PromotionValidationRequest) {
    await simulateNetworkDelay();
    const catalog = await this.getCatalog(request.marketCode);
    const promotion = catalog.promotions.find((entry) => entry.code === request.code.toUpperCase());
    const applicableProductIds = promotion
      ? request.productIds.filter((id) => promotion.productIds.includes(id))
      : [];
    const active = promotion && promotion.status === "active" &&
      new Date(promotion.startsAt) <= new Date() && new Date(promotion.endsAt) > new Date();
    const valid = Boolean(active && applicableProductIds.length > 0);
    return {
      valid,
      code: request.code.toUpperCase(),
      reasonCode: !promotion
        ? "PROMOTION_NOT_FOUND"
        : promotion.status !== "active"
          ? "PROMOTION_DISABLED"
          : applicableProductIds.length === 0
            ? "PROMOTION_PRODUCT_MISMATCH"
            : valid
              ? "PROMOTION_VALID"
              : "PROMOTION_EXPIRED",
      promotionId: valid ? promotion?.id : undefined,
      discountType: valid ? promotion?.discountType : undefined,
      discountValue: valid ? promotion?.discountValue : undefined,
      applicableProductIds,
      endsAt: valid ? promotion?.endsAt : undefined,
    } as const;
  }

  async getActiveEntitlements() {
    await simulateNetworkDelay();
    return structuredClone(activeEntitlements.filter((entry) => entry.status === "active"));
  }

  async getSubscriptions() {
    await simulateNetworkDelay();
    return structuredClone(subscriptions);
  }

  async updateSubscriptionCancellation(request: SubscriptionCancellationRequest) {
    await simulateNetworkDelay();
    const subscription = subscriptions.find((entry) => entry.id === request.subscriptionId);
    if (!subscription) throw new Error("Abonnement introuvable");
    subscription.cancelAtPeriodEnd = request.cancelAtPeriodEnd;
    subscription.updatedAt = new Date().toISOString();
    return structuredClone(subscription);
  }

  async getAdminOverview(marketCode = "FR") {
    await simulateNetworkDelay();
    const catalog = await this.getCatalog(marketCode);
    const marketVersions = versions.filter((version) => version.marketCode === marketCode);
    return {
      publishedVersion: marketVersions.find((version) => version.status === "active")!,
      versions: structuredClone(marketVersions),
      catalog,
      scheduledChanges: marketVersions.filter((version) => version.status === "scheduled").length,
      conflictCount: marketVersions.flatMap((version) => version.conflicts).filter((entry) => entry.severity === "blocking").length,
      quoteCountToday: quotes.size / 2,
      activeSubscriptionCount: subscriptions.filter((entry) => ["active", "trialing", "past_due"].includes(entry.status)).length,
      orders: [...orders.values()].map((order) => structuredClone(order)),
      entitlements: structuredClone(activeEntitlements),
      auditEvents: structuredClone(auditEvents),
    } satisfies MonetizationAdminOverview;
  }

  async createDraft(patch: CommercialDraftPatch) {
    await simulateNetworkDelay();
    const current = await this.getCatalog("FR");
    const number = Math.max(...versions.map((version) => version.versionNumber)) + 1;
    const id = `commercial-fr-v${number}`;
    const now = new Date().toISOString();
    const catalog: MonetizationCatalog = {
      ...structuredClone(current),
      configurationVersionId: id,
      versionNumber: number,
      generatedAt: now,
      products: structuredClone(patch.products || current.products).map((product) => ({
        ...product,
        versionId: `${id}:${product.id}`,
        prices: product.prices.map((price) => ({ ...price, id: `${id}:${product.id}:${price.billingPeriod}` })),
        status: product.status === "disabled" ? "disabled" : "draft",
      })),
      rules: structuredClone(patch.rules || current.rules).map((rule) => ({ ...rule, versionId: id, status: "draft" })),
      promotions: structuredClone(patch.promotions || current.promotions).map((promotion) => ({
        ...promotion,
        id: `${id}:${promotion.code.toLowerCase()}`,
        status: promotion.status === "disabled" ? "disabled" : "draft",
      })),
    };
    const version: CommercialConfigurationVersion = {
      id,
      setId: "commercial-core",
      versionNumber: number,
      marketCode: "FR",
      status: "draft",
      reason: patch.reason,
      effectiveFrom: patch.effectiveFrom,
      createdBy: "admin-demo",
      createdAt: now,
      productCount: catalog.products.length,
      ruleCount: catalog.rules.length,
      conflicts: [],
    };
    versions.unshift(version);
    catalogs.set(id, catalog);
    auditEvents.unshift({
      id: `audit-${number}`,
      actorId: "admin-demo",
      actorName: "Admin Démo",
      action: "draft.created",
      entityType: "configuration_version",
      entityId: id,
      reason: patch.reason,
      requestId: `request-${number}`,
      createdAt: now,
    });
    return structuredClone(version);
  }

  async transitionVersion(versionId: string, action: "submit" | "approve" | "publish" | "rollback", reason: string) {
    await simulateNetworkDelay();
    const version = versions.find((entry) => entry.id === versionId);
    if (!version) throw new Error("Version introuvable");
    if (action === "submit" && version.status === "draft") version.status = "pending_approval";
    else if (action === "approve" && version.status === "pending_approval") {
      version.status = "approved";
      version.approvedBy = "finance-demo";
    } else if (action === "publish" && version.status === "approved") {
      const scheduled = Boolean(version.effectiveFrom && version.effectiveFrom > new Date().toISOString());
      if (!scheduled) {
        versions.filter((entry) => entry.status === "active").forEach((entry) => { entry.status = "archived"; });
      }
      version.status = scheduled ? "scheduled" : "active";
      version.publishedAt = scheduled ? undefined : new Date().toISOString();
      const catalog = catalogs.get(version.id)!;
      catalog.products = catalog.products.map((product) => ({
        ...product,
        status: product.status === "draft" ? "active" : product.status,
      }));
      catalog.rules = catalog.rules.map((rule) => ({
        ...rule,
        status: rule.status === "draft" ? "active" : rule.status,
      }));
      catalog.promotions = catalog.promotions.map((promotion) => ({
        ...promotion,
        status: promotion.status === "draft" ? "active" : promotion.status,
      }));
    } else if (action === "rollback" && version.status === "archived") {
      const source = catalogs.get(version.id)!;
      return this.createDraft({
        reason,
        products: source.products,
        rules: source.rules,
        promotions: source.promotions,
      });
    }
    else throw new Error("Transition invalide");
    version.reason = reason;
    return structuredClone(version);
  }
}

export const demoBusinessRulesService = new DemoBusinessRulesService();
