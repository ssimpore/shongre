import type {
  ActiveEntitlement,
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationQuote,
  QuoteRequest,
} from "@shongre/contracts/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";
import {
  classifyBillingProduct,
  type BillingProductClass,
} from "@/features/billing/billing-policy";

export type { BillingProductClass } from "@/features/billing/billing-policy";

export interface EntitlementSnapshot {
  source: "backend";
  featuredCredits: number;
  bumpCredits: number;
  storeEnabled: boolean;
}

export interface BillingService {
  getCatalog(marketCode?: string): Promise<MonetizationCatalog>;
  createQuote(request: QuoteRequest): Promise<MonetizationQuote>;
  createCheckout(quoteId: string, idempotencyKey: string): Promise<MonetizationOrder>;
  restoreEntitlements(): Promise<EntitlementSnapshot>;
  classify(
    productClass: BillingProductClass,
  ): "external-payment-eligible" | "store-policy-review-required";
}

const demoQuotes = new Map<string, MonetizationQuote>();
const demoEntitlements: ActiveEntitlement[] = [];

function demoHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(8);
}

async function createDemoQuote(request: QuoteRequest): Promise<MonetizationQuote> {
  const existing = demoQuotes.get(request.idempotencyKey);
  if (existing) return structuredClone(existing);
  const now = new Date();
  const promotion = request.promotionCode
    ? BASELINE_MONETIZATION_CATALOG.promotions.find(
        (entry) =>
          entry.code === request.promotionCode?.toUpperCase() &&
          entry.status === "active" &&
          new Date(entry.startsAt) <= now &&
          new Date(entry.endsAt) > now,
      )
    : undefined;
  if (request.promotionCode && !promotion) throw new Error("PROMOTION_DISABLED");
  const lines = request.productIds.map((id) => {
    const product = BASELINE_MONETIZATION_CATALOG.products.find((entry) => entry.id === id);
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
    const taxMinor = price.priceIncludesTax
      ? 0
      : Math.round((taxableMinor * price.taxRateBps) / 10_000);
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
      entitlementSnapshot: product.entitlements,
    };
  });
  const createdAt = new Date().toISOString();
  const quote: MonetizationQuote = {
    id: `quote_${demoHash(request.idempotencyKey).slice(0, 24)}`,
    accountId: "mobile-demo-account",
    configurationVersionId: BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    marketCode: request.marketCode,
    currency: BASELINE_MONETIZATION_CATALOG.currency,
    lines,
    subtotalMinor: lines.reduce((sum, line) => sum + line.subtotalMinor, 0),
    discountMinor: lines.reduce((sum, line) => sum + line.discountMinor, 0),
    taxMinor: lines.reduce((sum, line) => sum + line.taxMinor, 0),
    totalMinor: lines.reduce((sum, line) => sum + line.totalMinor, 0),
    snapshotHash: demoHash(JSON.stringify(lines)),
    promotionCode: promotion?.code,
    reasonCode: promotion ? "PROMOTION_APPLIED" : "CATALOG_PRICE",
    status: "active",
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    createdAt,
  };
  demoQuotes.set(request.idempotencyKey, quote);
  demoQuotes.set(quote.id, quote);
  return structuredClone(quote);
}

export const billingService: BillingService = {
  async getCatalog(marketCode = "FR") {
    if (mobileEnvironment.dataMode === "demo") {
      return structuredClone(BASELINE_MONETIZATION_CATALOG);
    }
    return apiRequest<MonetizationCatalog>(
      `/business-rules/catalog?marketCode=${encodeURIComponent(marketCode)}`,
    );
  },

  async createQuote(request) {
    if (mobileEnvironment.dataMode === "demo") return createDemoQuote(request);
    return apiRequest<MonetizationQuote>("/monetization/quotes", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async createCheckout(quoteId, idempotencyKey) {
    if (mobileEnvironment.dataMode !== "demo") {
      return apiRequest<MonetizationOrder>("/monetization/checkouts", {
        method: "POST",
        body: JSON.stringify({ quoteId, idempotencyKey }),
      });
    }
    const quote = demoQuotes.get(quoteId);
    if (!quote) throw new Error("Devis introuvable");
    const now = new Date().toISOString();
    const order: MonetizationOrder = {
      id: `order_${demoHash(idempotencyKey).slice(0, 24)}`,
      quoteId,
      accountId: quote.accountId,
      snapshotHash: quote.snapshotHash,
      total: { amountMinor: quote.totalMinor, currency: quote.currency },
      status: "paid",
      provider: "demo",
      providerCheckoutId: `demo_${demoHash(idempotencyKey).slice(0, 16)}`,
      createdAt: now,
      updatedAt: now,
    };
    quote.lines.forEach((line) => {
      line.entitlementSnapshot.forEach((entitlement) => {
        const id = `ent_${demoHash(`${order.id}:${line.productId}:${entitlement.key}`).slice(0, 24)}`;
        if (demoEntitlements.some((entry) => entry.id === id)) return;
        demoEntitlements.push({
          id,
          accountId: quote.accountId,
          productId: line.productId,
          key: entitlement.key,
          value: entitlement.value,
          sourceOrderId: order.id,
          startsAt: now,
          status: "active",
        });
      });
    });
    return order;
  },

  async restoreEntitlements() {
    const entitlements = mobileEnvironment.dataMode === "demo"
      ? demoEntitlements
      : await apiRequest<ActiveEntitlement[]>("/monetization/entitlements");
    const numeric = (key: string) =>
      entitlements
        .filter((entry) => entry.status === "active" && entry.key === key)
        .reduce((sum, entry) => sum + (typeof entry.value === "number" ? entry.value : 0), 0);
    return {
      source: "backend",
      featuredCredits: numeric("featuredCredits"),
      bumpCredits: numeric("searchBumpCredits") + numeric("monthlyBumpCredits"),
      storeEnabled: entitlements.some(
        (entry) => entry.status === "active" && entry.key === "storefrontCustomization" && entry.value === true,
      ),
    };
  },

  classify(productClass) {
    return classifyBillingProduct(productClass);
  },
};
