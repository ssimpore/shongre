import type {
  ActiveEntitlement,
  BillingOverview,
  CommercialAuditEvent,
  CommercialConfigurationVersion,
  CommercialDraftPatch,
  MonetizationAdminOverview,
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationInvoice,
  MonetizationPayment,
  MonetizationQuote,
  MonetizationRefund,
  MonetizationSubscription,
  PromotionValidationRequest,
  SubscriptionCancellationRequest,
  SubscriptionChangeRequest,
  SubscriptionEvent,
  CreditBalance,
  QuoteRequest,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from "@shongre/contracts/monetization";
import {
  commercialDraftPatchSchema,
  complimentaryGrantDecisionInputSchema,
  complimentaryGrantRequestInputSchema,
  isCommercialAudienceCompatible,
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "@shongre/contracts/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { isSameBusinessVertical } from "@shongre/contracts/business-verticals";
import { colors, palette } from "@shongre/design-tokens";
import {
  getBillingUsagePresentation,
  resolveAllEffectiveEntitlements,
} from "@shongre/shared";
import type {
  BusinessRulesServiceContract,
  ComplimentaryGrantDecisionInput,
  ComplimentaryGrantDecisionResult,
  ComplimentaryGrantRequestInput,
  ComplimentaryGrantRequestResult,
} from "../../contracts/business-rules.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { storageService } from "../../../services/storage.service";
import { DEFAULT_MARKET_CODE } from "../../../configuration/market-baseline";
import {
  requireDemoAnyCapability,
  requireDemoCapability,
} from "./demo-authorization";

const createdAt = BASELINE_MONETIZATION_CATALOG.generatedAt;
const versions: CommercialConfigurationVersion[] = [
  {
    id: BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    setId: "commercial-core",
    versionNumber: BASELINE_MONETIZATION_CATALOG.versionNumber,
    marketCode: "FR",
    status: "active",
    reason: "Publication du catalogue professionnel verticalisé v2",
    effectiveFrom: createdAt,
    createdBy: "Système",
    approvedBy: "Direction commerciale",
    createdAt,
    publishedAt: createdAt,
    productCount: BASELINE_MONETIZATION_CATALOG.products.length,
    ruleCount:
      BASELINE_MONETIZATION_CATALOG.rules.length +
      BASELINE_MONETIZATION_CATALOG.commissionPolicies.reduce(
        (count, policy) => count + policy.rules.length,
        0,
      ),
    conflicts: [],
  },
];
const catalogs = new Map<string, MonetizationCatalog>([
  [
    BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    structuredClone(BASELINE_MONETIZATION_CATALOG),
  ],
]);
const auditEvents: CommercialAuditEvent[] = [];
const quotes = new Map<string, MonetizationQuote>();
const orders = new Map<string, MonetizationOrder>();
const activeEntitlements: ActiveEntitlement[] = [];
const subscriptions: MonetizationSubscription[] = [];
const payments: MonetizationPayment[] = [];
const invoices: MonetizationInvoice[] = [];
const refunds: MonetizationRefund[] = [];
const creditBalances: CreditBalance[] = [];
const subscriptionEvents: SubscriptionEvent[] = [];
const complimentaryRequests = new Map<
  string,
  ComplimentaryGrantRequestResult
>();
const complimentaryDecisions = new Map<
  string,
  ComplimentaryGrantDecisionResult
>();

function currentAccountId() {
  return storageService.getCurrentUser()?.id || "guest";
}

function currentAccountAudience():
  "individual" | "professional" | "organization" {
  const user = storageService.getCurrentUser();
  if (/org|organization|dealer|agency|school/i.test(user?.id || "")) {
    return "organization";
  }
  return user?.accountType === "professional" ? "professional" : "individual";
}

function money(amountMinor: number, currency = "EUR") {
  return { amountMinor, currency };
}

function pushSubscriptionEvent(
  subscription: MonetizationSubscription,
  type: SubscriptionEvent["type"],
  idempotencyKey: string,
  fromStatus?: string,
  toStatus?: string,
) {
  if (
    subscriptionEvents.some((entry) => entry.idempotencyKey === idempotencyKey)
  )
    return;
  subscriptionEvents.unshift({
    id: `subevt_${digest(idempotencyKey).slice(0, 24)}`,
    subscriptionId: subscription.id,
    accountId: subscription.accountId,
    type,
    fromStatus,
    toStatus,
    metadata: {},
    idempotencyKey,
    occurredAt: subscription.updatedAt,
  });
}

function replaceSubscriptionEntitlements(
  subscription: MonetizationSubscription,
  previousProductId: string,
  targetProduct: MonetizationCatalog["products"][number],
  changedAt: string,
) {
  activeEntitlements.forEach((entitlement) => {
    if (
      entitlement.sourceOrderId !== subscription.sourceOrderId ||
      entitlement.productId !== previousProductId ||
      !["active", "scheduled"].includes(entitlement.status)
    )
      return;
    const startsAt = new Date(entitlement.startsAt).getTime();
    const changedAtMs = new Date(changedAt).getTime();
    entitlement.status = "revoked";
    entitlement.endsAt = new Date(
      Math.max(changedAtMs, startsAt + 1),
    ).toISOString();
  });

  targetProduct.entitlements
    .filter(isCommercialEntitlementOperational)
    .forEach((definition) => {
      const existing = activeEntitlements.find(
        (entitlement) =>
          entitlement.sourceOrderId === subscription.sourceOrderId &&
          entitlement.productId === targetProduct.id &&
          entitlement.key === definition.key,
      );
      const next: ActiveEntitlement = {
        id:
          existing?.id ||
          `ent_${digest(`${subscription.sourceOrderId}:${targetProduct.id}:${definition.key}`).slice(0, 24)}`,
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
      };
      if (existing) Object.assign(existing, next);
      else activeEntitlements.push(next);
    });
}

function grantDemoRecurringCredits(
  subscription: MonetizationSubscription,
  definitions: MonetizationCatalog["products"][number]["entitlements"],
) {
  definitions
    .filter(isCommercialEntitlementOperational)
    .forEach((definition) => {
      const recurring = definition.recurringGrant;
      if (!recurring) return;
      const idempotencyKey = `subscription-credit:${subscription.id}:${recurring.creditType}:${subscription.currentPeriodStart}`;
      let balance = creditBalances.find(
        (entry) =>
          entry.accountId === subscription.accountId &&
          entry.creditType === recurring.creditType,
      );
      if (
        balance?.transactions.some(
          (transaction) => transaction.idempotencyKey === idempotencyKey,
        )
      )
        return;
      const transaction = {
        id: `credit_${digest(idempotencyKey).slice(0, 24)}`,
        accountId: subscription.accountId,
        creditType: recurring.creditType,
        quantity: recurring.quantity,
        reason: "Allocation récurrente du forfait",
        sourceType: "subscription" as const,
        sourceId: subscription.id,
        expiresAt: subscription.currentPeriodEnd,
        idempotencyKey,
        createdAt: subscription.currentPeriodStart,
      };
      if (!balance) {
        balance = {
          accountId: subscription.accountId,
          creditType: recurring.creditType,
          available: 0,
          reserved: 0,
          nextExpiryAt: subscription.currentPeriodEnd,
          transactions: [],
        };
        creditBalances.push(balance);
      }
      balance.available += recurring.quantity;
      balance.nextExpiryAt = [
        balance.nextExpiryAt,
        subscription.currentPeriodEnd,
      ]
        .filter((value): value is string => Boolean(value))
        .sort()[0];
      balance.transactions.unshift(transaction);
    });
}

function ensureSeededBilling(accountId: string) {
  const user = storageService.getCurrentUser();
  if (!user || user.id !== accountId || user.accountType !== "professional")
    return;
  if (subscriptions.some((entry) => entry.accountId === accountId)) return;
  const productId =
    user.activePlanId === "free" ? "plan.pro.free" : "plan.pro.business";
  const product = BASELINE_MONETIZATION_CATALOG.products.find(
    (entry) => entry.id === productId,
  );
  const price = product?.prices.find(
    (entry) => entry.billingPeriod === "month",
  );
  if (!product || !price) return;
  const periodStart = "2026-08-01T00:00:00.000Z";
  const periodEnd = "2026-09-01T00:00:00.000Z";
  const orderId = `seed_order_${digest(accountId).slice(0, 16)}`;
  const subscription: MonetizationSubscription = {
    id: `seed_sub_${digest(accountId).slice(0, 16)}`,
    accountId,
    productId,
    productVersionId: product.versionId,
    priceId: price.id,
    sourceOrderId: orderId,
    status: "active",
    providerSubscriptionId: `demo_sub_${digest(accountId).slice(0, 12)}`,
    billingPeriod: "month",
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: periodStart,
    verticalId: product.commercialProfile.verticalId,
    familyId: product.commercialProfile.familyId,
  };
  subscriptions.push(subscription);
  const taxMinor = Math.round(
    (price.amount.amountMinor * price.taxRateBps) / 10_000,
  );
  const totalMinor = price.amount.amountMinor + taxMinor;
  orders.set(orderId, {
    id: orderId,
    quoteId: `seed_quote_${digest(accountId).slice(0, 16)}`,
    accountId,
    snapshotHash: digest(`${accountId}:${productId}:${periodStart}`),
    total: money(totalMinor),
    status: "paid",
    provider: "demo",
    providerCheckoutId: `seed_checkout_${digest(accountId).slice(0, 12)}`,
    createdAt: periodStart,
    updatedAt: periodStart,
  });
  product.entitlements
    .filter(isCommercialEntitlementOperational)
    .forEach((entitlement) => {
      activeEntitlements.push({
        id: `seed_ent_${digest(`${accountId}:${entitlement.key}`).slice(0, 20)}`,
        accountId,
        productId,
        key: entitlement.key,
        value: entitlement.value,
        sourceOrderId: orderId,
        startsAt: periodStart,
        endsAt: periodEnd,
        status: "active",
        verticalId:
          entitlement.verticalId || product.commercialProfile.verticalId,
        mergePolicy: entitlement.mergePolicy,
      });
    });
  const invoiceId = `seed_inv_${digest(accountId).slice(0, 16)}`;
  invoices.push({
    id: invoiceId,
    accountId,
    orderId,
    subscriptionId: subscription.id,
    number: `FAC-2026-${digest(accountId).slice(0, 5).toUpperCase()}`,
    status: "paid",
    subtotal: money(price.amount.amountMinor),
    discount: money(0),
    tax: money(taxMinor),
    total: money(totalMinor),
    amountPaid: money(totalMinor),
    amountDue: money(0),
    issuedAt: periodStart,
    paidAt: periodStart,
  });
  payments.push({
    id: `seed_pay_${digest(accountId).slice(0, 16)}`,
    accountId,
    orderId,
    invoiceId,
    status: "succeeded",
    amount: money(totalMinor),
    provider: "demo",
    providerPaymentId: `demo_pay_${digest(accountId).slice(0, 12)}`,
    paidAt: periodStart,
    createdAt: periodStart,
    updatedAt: periodStart,
  });
  grantDemoRecurringCredits(subscription, product.entitlements);
  pushSubscriptionEvent(
    subscription,
    "activated",
    `seed-subscription:${accountId}`,
    undefined,
    "active",
  );
}

function dimension(values: string[], actual?: string) {
  return (
    values.length === 0 ||
    values.includes("all") ||
    Boolean(actual && values.includes(actual))
  );
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
  async getCatalog(marketCode = DEFAULT_MARKET_CODE) {
    await simulateNetworkDelay();
    const version = versions.find(
      (entry) => entry.marketCode === marketCode && entry.status === "active",
    );
    return structuredClone(
      catalogs.get(version?.id || "") || BASELINE_MONETIZATION_CATALOG,
    );
  }

  async evaluate(
    context: RuleEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    requireDemoAnyCapability([
      "marketplace.customer.access",
      "commercial_rules.read",
    ]);
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
        specificity:
          Object.values(rule.scope).filter((value) => value.length).length *
          100,
        outcome: matched ? rule.outcome : undefined,
        reasonCode: matched ? "MATCHED" : "SCOPE_NOT_MATCHED",
      };
    });
    const quotaLimit =
      typeof outcomes.quotaLimit === "number" ? outcomes.quotaLimit : undefined;
    const quotaRemaining =
      quotaLimit === undefined
        ? undefined
        : Math.max(0, quotaLimit - context.usageLevel);
    const eligible =
      outcomes.eligible !== false &&
      (quotaRemaining === undefined || quotaRemaining > 0);
    return {
      configurationVersionId: catalog.configurationVersionId,
      eligible,
      reasonCode: eligible
        ? String(outcomes.reasonCode || "ELIGIBLE")
        : "QUOTA_EXHAUSTED",
      quotaLimit,
      quotaRemaining,
      durationDays:
        typeof outcomes.durationDays === "number"
          ? outcomes.durationDays
          : undefined,
      outcomes,
      explanation,
    };
  }

  async createQuote(request: QuoteRequest) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const key = `${accountId}:${request.idempotencyKey}`;
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
      ? catalog.promotions.find(
          (entry) => entry.id === promotionValidation.promotionId,
        )
      : undefined;
    const selectedProducts = request.productIds.map((id) => {
      const product = catalog.products.find((entry) => entry.id === id);
      if (!product || !isCommercialProductPurchasable(product))
        throw new Error("Produit indisponible");
      return product;
    });
    const selectedSubscriptions = selectedProducts.filter(
      (product) => product.kind === "subscription",
    );
    if (selectedSubscriptions.length > 1)
      throw new Error("Un seul abonnement peut être activé par devis");
    const accountAudience = currentAccountAudience();
    if (
      selectedProducts.some(
        (product) =>
          !isCommercialAudienceCompatible(product.audience, accountAudience) ||
          !product.scope.marketCodes.includes(request.marketCode) ||
          !product.scope.currencies.includes(catalog.currency) ||
          (product.scope.categoryIds.length > 0 &&
            (!request.categoryId ||
              !product.scope.categoryIds.includes(request.categoryId))),
      )
    ) {
      throw new Error(
        "Cette offre ne correspond pas au compte ou au marché sélectionné",
      );
    }
    const catalogTrialProduct = selectedSubscriptions.find((product) => {
      const policy = product.commercialProfile.trialPolicy;
      if (!policy.enabled || !policy.durationDays) return false;
      if (
        !isCommercialAudienceCompatible(
          policy.eligibleAudiences,
          accountAudience,
        )
      )
        return false;
      if (!policy.eligibleMarketCodes.includes(request.marketCode))
        return false;
      if (
        policy.campaignStartsAt &&
        new Date(policy.campaignStartsAt) > new Date()
      )
        return false;
      if (
        policy.campaignEndsAt &&
        new Date(policy.campaignEndsAt) <= new Date()
      )
        return false;
      if (!policy.firstTimeCustomersOnly) return true;
      return !subscriptions
        .filter((entry) => entry.accountId === accountId)
        .some((subscription) => {
          const priorProduct = catalog.products.find(
            (candidate) => candidate.id === subscription.productId,
          );
          return (
            priorProduct?.commercialProfile.familyId ===
            product.commercialProfile.familyId
          );
        });
    });
    const promotionalTrialProduct = promotion?.freePeriodDays
      ? selectedSubscriptions.find((product) =>
          promotion.productIds.includes(product.id),
        )
      : undefined;
    const trialProduct = promotionalTrialProduct || catalogTrialProduct;
    const trialDays =
      promotion?.freePeriodDays ||
      trialProduct?.commercialProfile.trialPolicy.durationDays;
    const trialEndsAt = trialDays
      ? new Date(Date.now() + trialDays * 86_400_000).toISOString()
      : undefined;
    const lines = request.productIds.map((id) => {
      const product = selectedProducts.find((entry) => entry.id === id)!;
      const price = product.prices.find(
        (candidate) =>
          !request.priceIds?.[product.id] ||
          candidate.id === request.priceIds[product.id],
      );
      if (!price) throw new Error("Prix indisponible");
      const discountMinor = !promotion?.productIds.includes(product.id)
        ? 0
        : promotion.discountType === "fixed"
          ? Math.min(price.amount.amountMinor, promotion.discountValue)
          : promotion.discountType === "introductory_price"
            ? Math.max(0, price.amount.amountMinor - promotion.discountValue)
            : promotion.discountType === "free_period"
              ? price.amount.amountMinor
              : Math.min(
                  price.amount.amountMinor,
                  Math.round(
                    (price.amount.amountMinor * promotion.discountValue) /
                      10_000,
                  ),
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
        entitlementSnapshot: structuredClone(
          product.entitlements.filter(isCommercialEntitlementOperational),
        ),
        verticalId: product.commercialProfile.verticalId,
        trialDays: product.id === trialProduct?.id ? trialDays : undefined,
      };
    });
    const now = new Date().toISOString();
    const totalMinor = lines.reduce((sum, line) => sum + line.totalMinor, 0);
    const quote: MonetizationQuote = {
      id: `quote_${digest(key).slice(0, 24)}`,
      accountId,
      configurationVersionId: catalog.configurationVersionId,
      marketCode: request.marketCode,
      currency: catalog.currency,
      lines,
      subtotalMinor: lines.reduce((sum, line) => sum + line.subtotalMinor, 0),
      discountMinor: lines.reduce((sum, line) => sum + line.discountMinor, 0),
      taxMinor: lines.reduce((sum, line) => sum + line.taxMinor, 0),
      totalMinor,
      amountDueTodayMinor: trialDays ? 0 : totalMinor,
      nextChargeMinor: totalMinor,
      nextChargeAt: trialEndsAt,
      trial:
        trialProduct && trialDays && trialEndsAt
          ? {
              productId: trialProduct.id,
              durationDays: trialDays,
              endsAt: trialEndsAt,
              requiresPaymentMethod:
                trialProduct.commercialProfile.trialPolicy
                  .requiresPaymentMethod,
              autoConverts:
                trialProduct.commercialProfile.trialPolicy.autoConverts,
            }
          : undefined,
      snapshotHash: digest(JSON.stringify(lines)),
      promotionCode: promotion?.code,
      promotion: promotion
        ? {
            id: promotion.id,
            code: promotion.code,
            name: promotion.name,
            freePeriodDays: promotion.freePeriodDays,
            durationBillingPeriods: promotion.durationBillingPeriods,
            endsAt: promotion.endsAt,
          }
        : undefined,
      reasonCode: trialDays
        ? "TRIAL_ELIGIBLE"
        : promotion
          ? "PROMOTION_APPLIED"
          : "CATALOG_PRICE",
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      createdAt: now,
    };
    quotes.set(key, quote);
    quotes.set(quote.id, quote);
    return structuredClone(quote);
  }

  async createCheckout(quoteId: string, idempotencyKey: string) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    const orderKey = `${accountId}:${idempotencyKey}`;
    const existing = orders.get(orderKey);
    if (existing) return structuredClone(existing);
    const quote = quotes.get(quoteId);
    if (!quote) throw new Error("Devis introuvable");
    if (quote.accountId !== accountId)
      throw new Error("Ce devis appartient à un autre compte");
    const now = new Date().toISOString();
    const order: MonetizationOrder = {
      id: `order_${digest(orderKey).slice(0, 24)}`,
      quoteId,
      accountId: quote.accountId,
      snapshotHash: quote.snapshotHash,
      total: {
        amountMinor: quote.amountDueTodayMinor,
        currency: quote.currency,
      },
      status: "paid",
      provider: "demo",
      providerCheckoutId: `demo_${digest(orderKey).slice(0, 16)}`,
      createdAt: now,
      updatedAt: now,
    };
    orders.set(orderKey, order);
    orders.set(order.id, order);
    const catalog = catalogs.get(quote.configurationVersionId);
    quote.lines.forEach((line) => {
      const product = catalog?.products.find(
        (entry) => entry.id === line.productId,
      );
      const price = product?.prices.find((entry) => entry.id === line.priceId);
      const periodEnd = new Date(now);
      if (line.billingPeriod === "year")
        periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
      else if (line.billingPeriod === "month")
        periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      const endsAt = price?.durationDays
        ? new Date(Date.now() + price.durationDays * 86_400_000).toISOString()
        : line.billingPeriod === "once"
          ? undefined
          : periodEnd.toISOString();
      line.entitlementSnapshot
        .filter(isCommercialEntitlementOperational)
        .forEach((entitlement) => {
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
            verticalId: entitlement.verticalId || line.verticalId,
            mergePolicy: entitlement.mergePolicy,
          });
        });
      if (product?.kind === "subscription") {
        const id = `sub_${digest(`${order.id}:${line.productId}`).slice(0, 24)}`;
        if (!subscriptions.some((entry) => entry.id === id)) {
          const subscription: MonetizationSubscription = {
            id,
            accountId: quote.accountId,
            productId: line.productId,
            productVersionId: line.productVersionId,
            priceId: line.priceId,
            sourceOrderId: order.id,
            status:
              quote.trial?.productId === line.productId ? "trialing" : "active",
            providerSubscriptionId: order.providerCheckoutId,
            billingPeriod: line.billingPeriod,
            currentPeriodStart: now,
            currentPeriodEnd:
              quote.trial?.productId === line.productId
                ? quote.trial.endsAt
                : periodEnd.toISOString(),
            cancelAtPeriodEnd: false,
            createdAt: now,
            updatedAt: now,
            verticalId: product.commercialProfile.verticalId,
            familyId: product.commercialProfile.familyId,
          };
          subscriptions.push(subscription);
          grantDemoRecurringCredits(subscription, product.entitlements);
          pushSubscriptionEvent(
            subscriptions[subscriptions.length - 1],
            quote.trial?.productId === line.productId
              ? "trial_started"
              : "activated",
            `checkout:${order.id}:subscription:${line.productId}`,
            "incomplete",
            quote.trial?.productId === line.productId ? "trialing" : "active",
          );
        }
      }
    });
    const invoiceId = `inv_${digest(order.id).slice(0, 24)}`;
    invoices.push({
      id: invoiceId,
      accountId: quote.accountId,
      orderId: order.id,
      subscriptionId: subscriptions.find(
        (entry) => entry.sourceOrderId === order.id,
      )?.id,
      number: `FAC-${new Date(now).getUTCFullYear()}-${digest(order.id).slice(0, 6).toUpperCase()}`,
      status: quote.amountDueTodayMinor === 0 ? "open" : "paid",
      subtotal: money(quote.subtotalMinor, quote.currency),
      discount: money(quote.discountMinor, quote.currency),
      tax: money(quote.taxMinor, quote.currency),
      total: money(quote.amountDueTodayMinor, quote.currency),
      amountPaid: money(quote.amountDueTodayMinor, quote.currency),
      amountDue: money(0, quote.currency),
      issuedAt: now,
      paidAt: quote.amountDueTodayMinor === 0 ? undefined : now,
    });
    payments.push({
      id: `pay_${digest(order.id).slice(0, 24)}`,
      accountId: quote.accountId,
      orderId: order.id,
      invoiceId,
      status: "succeeded",
      amount: money(quote.amountDueTodayMinor, quote.currency),
      provider: "demo",
      providerPaymentId: order.providerCheckoutId,
      paidAt: quote.amountDueTodayMinor === 0 ? undefined : now,
      createdAt: now,
      updatedAt: now,
    });
    quote.status = "consumed";
    return structuredClone(order);
  }

  async validatePromotion(request: PromotionValidationRequest) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const catalog = await this.getCatalog(request.marketCode);
    const promotion = catalog.promotions.find(
      (entry) => entry.code === request.code.toUpperCase(),
    );
    const applicableProductIds = promotion
      ? request.productIds.filter((id) => promotion.productIds.includes(id))
      : [];
    const active =
      promotion &&
      promotion.status === "active" &&
      new Date(promotion.startsAt) <= new Date() &&
      new Date(promotion.endsAt) > new Date();
    const targetFamilies = new Set(
      catalog.products
        .filter((product) => applicableProductIds.includes(product.id))
        .map((product) => product.commercialProfile.familyId),
    );
    const hasTargetHistory = subscriptions
      .filter((subscription) => subscription.accountId === currentAccountId())
      .some((subscription) => {
        const product = catalog.products.find(
          (candidate) => candidate.id === subscription.productId,
        );
        return Boolean(
          product && targetFamilies.has(product.commercialProfile.familyId),
        );
      });
    const customerCompatible =
      promotion?.eligibleCustomerType === "new"
        ? !hasTargetHistory
        : promotion?.eligibleCustomerType === "existing"
          ? hasTargetHistory
          : true;
    const verticalCompatible = Boolean(
      promotion &&
      (promotion.verticalIds.length === 0 ||
        catalog.products
          .filter((product) => applicableProductIds.includes(product.id))
          .every(
            (product) =>
              product.commercialProfile.verticalId &&
              promotion.verticalIds.some((verticalId) =>
                isSameBusinessVertical(
                  verticalId,
                  product.commercialProfile.verticalId,
                ),
              ),
          )),
    );
    const valid = Boolean(
      active &&
      applicableProductIds.length > 0 &&
      customerCompatible &&
      verticalCompatible,
    );
    return {
      valid,
      code: request.code.toUpperCase(),
      reasonCode: !promotion
        ? "PROMOTION_NOT_FOUND"
        : promotion.status !== "active"
          ? "PROMOTION_DISABLED"
          : applicableProductIds.length === 0
            ? "PROMOTION_PRODUCT_MISMATCH"
            : !customerCompatible
              ? promotion.eligibleCustomerType === "new"
                ? "PROMOTION_NEW_CUSTOMERS_ONLY"
                : "PROMOTION_EXISTING_CUSTOMERS_ONLY"
              : !verticalCompatible
                ? "PROMOTION_VERTICAL_MISMATCH"
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
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    return structuredClone(
      activeEntitlements.filter(
        (entry) => entry.accountId === accountId && entry.status === "active",
      ),
    );
  }

  async getSubscriptions() {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    return structuredClone(
      subscriptions.filter((entry) => entry.accountId === accountId),
    );
  }

  async getBillingOverview(): Promise<BillingOverview> {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    const user = storageService.getCurrentUser();
    ensureSeededBilling(accountId);
    const accountSubscriptions = subscriptions.filter(
      (entry) => entry.accountId === accountId,
    );
    const accountEntitlements = activeEntitlements.filter(
      (entry) => entry.accountId === accountId && entry.status === "active",
    );
    const currentSubscription = accountSubscriptions.find((entry) =>
      [
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancellation_pending",
      ].includes(entry.status),
    );
    const effectiveEntitlements = resolveAllEffectiveEntitlements({
      catalog: BASELINE_MONETIZATION_CATALOG,
      entitlements: accountEntitlements,
    });
    const usage = effectiveEntitlements.flatMap((entry) => {
      const presentation = getBillingUsagePresentation(entry.key);
      if (!presentation || typeof entry.value !== "number") return [];
      const sampleUsed = /Photo|Media|Video|Tour/i.test(entry.key)
        ? 8
        : /Team|Members|Seats|Locations/i.test(entry.key)
          ? 1
          : /Credits/i.test(entry.key)
            ? 0
            : /Monthly/i.test(entry.key)
              ? 18
              : 12;
      return [
        {
          key: entry.key,
          label: presentation.label,
          used: Math.min(sampleUsed, entry.value),
          limit: entry.value,
          unit: presentation.unit,
          resetsAt: currentSubscription?.currentPeriodEnd,
          verticalId: entry.verticalId,
        },
      ];
    });
    return {
      customer: user
        ? {
            id: `billing_${digest(accountId).slice(0, 20)}`,
            accountId,
            legalName: user.companyName || user.name,
            email: user.email,
            taxId: user.vatNumber,
            taxExempt: false,
            address:
              user.businessAddress && user.postalCode && user.city
                ? {
                    line1: user.businessAddress,
                    postalCode: user.postalCode,
                    city: user.city,
                    countryCode: user.country || DEFAULT_MARKET_CODE,
                  }
                : undefined,
            providerCustomerId: `demo_customer_${digest(accountId).slice(0, 12)}`,
            createdAt: user.createdAt,
            updatedAt: currentSubscription?.updatedAt || user.createdAt,
          }
        : undefined,
      currentSubscription: currentSubscription
        ? structuredClone(currentSubscription)
        : undefined,
      subscriptions: structuredClone(accountSubscriptions),
      entitlements: structuredClone(accountEntitlements),
      usage,
      orders: [
        ...new Map(
          [...orders.values()]
            .filter((entry) => entry.accountId === accountId)
            .map((entry) => [entry.id, entry]),
        ).values(),
      ].map((entry) => structuredClone(entry)),
      payments: structuredClone(
        payments.filter((entry) => entry.accountId === accountId),
      ),
      invoices: structuredClone(
        invoices.filter((entry) => entry.accountId === accountId),
      ),
      refunds: structuredClone(
        refunds.filter((entry) => entry.accountId === accountId),
      ),
      creditBalances: structuredClone(
        creditBalances.filter((entry) => entry.accountId === accountId),
      ),
      subscriptionEvents: structuredClone(
        subscriptionEvents.filter((entry) => entry.accountId === accountId),
      ),
      effectiveEntitlements,
    };
  }

  async getInvoiceDocument(invoiceId: string) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const invoice = invoices.find(
      (entry) => entry.id === invoiceId && entry.accountId === accountId,
    );
    if (!invoice) throw new Error("Facture introuvable");
    const user = storageService.getCurrentUser();
    const format = (amountMinor: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: invoice.total.currency,
      }).format(amountMinor / 100);
    const escape = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const legalName = escape(user?.companyName || user?.name || accountId);
    return {
      fileName: `${invoice.number}.html`,
      mimeType: "text/html;charset=utf-8",
      content: `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escape(invoice.number)}</title><style>body{font-family:Arial,sans-serif;color:${colors.text.primary};max-width:760px;margin:48px auto;padding:0 24px}header,section{display:flex;justify-content:space-between;gap:32px;margin-bottom:40px}h1{font-size:28px;margin:0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid ${palette["stone-200"]}}.number{text-align:right}.total{font-weight:700;font-size:18px}small{color:${colors.text.muted}}</style><body><header><div><h1>SHONGRE.</h1><small>Facture commerciale de démonstration</small></div><div><strong>${escape(invoice.number)}</strong><br>${new Date(invoice.issuedAt).toLocaleDateString("fr-FR")}</div></header><section><div><strong>Facturé à</strong><br>${legalName}<br>${escape(user?.businessAddress || "Adresse de facturation du compte")}<br>${escape(`${user?.postalCode || ""} ${user?.city || ""}`.trim())}</div><div><strong>Émetteur</strong><br>Shongre SAS<br>France</div></section><table><thead><tr><th>Description</th><th class="number">Montant</th></tr></thead><tbody><tr><td>Services Shongre — commande ${escape(invoice.orderId || "—")}</td><td class="number">${format(invoice.subtotal.amountMinor)}</td></tr><tr><td>Remise</td><td class="number">− ${format(invoice.discount.amountMinor)}</td></tr><tr><td>TVA</td><td class="number">${format(invoice.tax.amountMinor)}</td></tr><tr class="total"><td>Total TTC</td><td class="number">${format(invoice.total.amountMinor)}</td></tr></tbody></table><p><small>Statut : ${escape(invoice.status)}. Document produit par le service de démonstration Shongre ; aucun paiement réel n’a été débité.</small></p></body></html>`,
    };
  }

  async previewSubscriptionChange(request: SubscriptionChangeRequest) {
    requireDemoCapability("subscription.manage.own");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const subscription = subscriptions.find(
      (entry) =>
        entry.id === request.subscriptionId && entry.accountId === accountId,
    );
    if (!subscription) throw new Error("Abonnement introuvable");
    const catalog = await this.getCatalog("FR");
    const currentProduct = catalog.products.find(
      (entry) => entry.id === subscription.productId,
    );
    const targetProduct = catalog.products.find(
      (entry) => entry.id === request.targetProductId,
    );
    const currentPrice = currentProduct?.prices.find(
      (entry) => entry.id === subscription.priceId,
    );
    const targetPrice = targetProduct?.prices.find(
      (entry) => entry.id === request.targetPriceId,
    );
    if (!currentProduct || !targetProduct || !targetPrice)
      throw new Error("Offre indisponible");
    const sameProduct = currentProduct.id === targetProduct.id;
    const isUpgrade =
      currentProduct.commercialProfile.upgradeProductIds.includes(
        targetProduct.id,
      );
    const isDowngrade =
      currentProduct.commercialProfile.downgradeProductIds.includes(
        targetProduct.id,
      );
    if (!sameProduct && !isUpgrade && !isDowngrade)
      throw new Error("PLAN_TRANSITION_NOT_ALLOWED");
    const currentAmount = currentPrice?.amount.amountMinor || 0;
    const prorationMinor = isUpgrade
      ? Math.round((targetPrice.amount.amountMinor - currentAmount) / 2)
      : 0;
    const taxMinor = Math.round(
      (prorationMinor * targetPrice.taxRateBps) / 10_000,
    );
    const nextTaxMinor = Math.round(
      (targetPrice.amount.amountMinor * targetPrice.taxRateBps) / 10_000,
    );
    return {
      subscriptionId: subscription.id,
      targetProductId: targetProduct.id,
      targetPriceId: targetPrice.id,
      effectiveAt: isUpgrade ? "immediately" : "period_end",
      proration: money(prorationMinor, targetPrice.amount.currency),
      tax: money(taxMinor, targetPrice.amount.currency),
      totalDueNow: money(
        prorationMinor + taxMinor,
        targetPrice.amount.currency,
      ),
      nextPeriodTotal: money(
        targetPrice.amount.amountMinor + nextTaxMinor,
        targetPrice.amount.currency,
      ),
      nextBillingAt: subscription.currentPeriodEnd,
    } as const;
  }

  async applySubscriptionChange(request: SubscriptionChangeRequest) {
    requireDemoCapability("subscription.manage.own");
    const preview = await this.previewSubscriptionChange(request);
    await simulateNetworkDelay();
    const subscription = subscriptions.find(
      (entry) => entry.id === request.subscriptionId,
    )!;
    const before = subscription.status;
    if (preview.effectiveAt === "period_end") {
      subscription.scheduledProductId = request.targetProductId;
      subscription.scheduledPriceId = request.targetPriceId;
      subscription.scheduledChangeAt = subscription.currentPeriodEnd;
      subscription.updatedAt = new Date().toISOString();
      pushSubscriptionEvent(
        subscription,
        "change_scheduled",
        request.idempotencyKey,
        before,
        before,
      );
    } else {
      const previousProductId = subscription.productId;
      const changedAt = new Date().toISOString();
      const target = BASELINE_MONETIZATION_CATALOG.products.find(
        (entry) => entry.id === request.targetProductId,
      );
      const targetPrice = target?.prices.find(
        (entry) => entry.id === request.targetPriceId,
      );
      if (!target || !targetPrice) throw new Error("Offre indisponible");
      subscription.productId = request.targetProductId;
      subscription.productVersionId = target.versionId;
      subscription.priceId = request.targetPriceId;
      subscription.billingPeriod = targetPrice.billingPeriod;
      subscription.verticalId = target.commercialProfile.verticalId;
      subscription.familyId = target.commercialProfile.familyId;
      subscription.scheduledProductId = undefined;
      subscription.scheduledPriceId = undefined;
      subscription.scheduledChangeAt = undefined;
      subscription.updatedAt = changedAt;
      replaceSubscriptionEntitlements(
        subscription,
        previousProductId,
        target,
        changedAt,
      );
      grantDemoRecurringCredits(subscription, target.entitlements);
      pushSubscriptionEvent(
        subscription,
        "changed",
        request.idempotencyKey,
        before,
        subscription.status,
      );
    }
    return structuredClone(subscription);
  }

  async updateSubscriptionCancellation(
    request: SubscriptionCancellationRequest,
  ) {
    requireDemoCapability("subscription.manage.own");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const subscription = subscriptions.find(
      (entry) =>
        entry.id === request.subscriptionId && entry.accountId === accountId,
    );
    if (!subscription) throw new Error("Abonnement introuvable");
    const previousStatus = subscription.status;
    subscription.cancelAtPeriodEnd = request.cancelAtPeriodEnd;
    subscription.status = request.cancelAtPeriodEnd
      ? "cancellation_pending"
      : "active";
    subscription.updatedAt = new Date().toISOString();
    pushSubscriptionEvent(
      subscription,
      request.cancelAtPeriodEnd ? "cancellation_scheduled" : "reactivated",
      `cancellation:${subscription.id}:${request.cancelAtPeriodEnd}`,
      previousStatus,
      subscription.status,
    );
    return structuredClone(subscription);
  }

  async getAdminOverview(marketCode = DEFAULT_MARKET_CODE) {
    requireDemoCapability("monetization.manage");
    await simulateNetworkDelay();
    const catalog = await this.getCatalog(marketCode);
    const marketVersions = versions.filter(
      (version) => version.marketCode === marketCode,
    );
    return {
      publishedVersion: marketVersions.find(
        (version) => version.status === "active",
      )!,
      versions: structuredClone(marketVersions),
      catalog,
      scheduledChanges: marketVersions.filter(
        (version) => version.status === "scheduled",
      ).length,
      conflictCount: marketVersions
        .flatMap((version) => version.conflicts)
        .filter((entry) => entry.severity === "blocking").length,
      quoteCountToday: quotes.size / 2,
      activeSubscriptionCount: subscriptions.filter((entry) =>
        ["active", "trialing", "past_due", "cancellation_pending"].includes(
          entry.status,
        ),
      ).length,
      orders: [
        ...new Map(
          [...orders.values()].map((entry) => [entry.id, entry]),
        ).values(),
      ].map((order) => structuredClone(order)),
      entitlements: structuredClone(activeEntitlements),
      payments: structuredClone(payments),
      invoices: structuredClone(invoices),
      refunds: structuredClone(refunds),
      subscriptions: structuredClone(subscriptions),
      creditBalances: structuredClone(creditBalances),
      subscriptionEvents: structuredClone(subscriptionEvents),
      auditEvents: structuredClone(auditEvents),
    } satisfies MonetizationAdminOverview;
  }

  async requestComplimentaryGrant(input: ComplimentaryGrantRequestInput) {
    requireDemoCapability("monetization.complimentary_grants.request");
    await simulateNetworkDelay();
    const parsed = complimentaryGrantRequestInputSchema.safeParse(input);
    if (!parsed.success)
      throw new Error("Demande de forfait offert incomplète");
    input = parsed.data;
    const actorId = currentAccountId();
    const requestKey = `${actorId}:${input.idempotencyKey}`;
    const existing = complimentaryRequests.get(requestKey);
    if (existing) return structuredClone(existing);
    const result: ComplimentaryGrantRequestResult = {
      ...input,
      id: `complimentary_request_${digest(requestKey).slice(0, 20)}`,
      status: "pending_approval",
      requestedBy: actorId,
      reason: input.reason.trim(),
    };
    complimentaryRequests.set(requestKey, result);
    complimentaryRequests.set(result.id, result);
    return structuredClone(result);
  }

  async decideComplimentaryGrant(
    requestId: string,
    input: ComplimentaryGrantDecisionInput,
  ) {
    requireDemoCapability("monetization.complimentary_grants.create");
    await simulateNetworkDelay();
    const parsed = complimentaryGrantDecisionInputSchema.safeParse(input);
    if (!parsed.success)
      throw new Error("Décision de forfait offert incomplète");
    input = parsed.data;
    const request = complimentaryRequests.get(requestId);
    if (!request) throw new Error("Demande de forfait offert introuvable");
    const actorId = currentAccountId();
    if (request.requestedBy === actorId)
      throw new Error("Une deuxième personne doit approuver la demande");
    const priorDecision = complimentaryDecisions.get(requestId);
    if (priorDecision) return structuredClone(priorDecision);
    const decisionKey = `${requestId}:${input.idempotencyKey}`;
    const existing = complimentaryDecisions.get(decisionKey);
    if (existing) return structuredClone(existing);
    const grantId =
      input.decision === "approved"
        ? `complimentary_grant_${digest(requestId).slice(0, 20)}`
        : undefined;
    const result: ComplimentaryGrantDecisionResult = {
      requestId,
      decision: input.decision,
      decidedBy: actorId,
      grantId,
    };
    complimentaryDecisions.set(decisionKey, result);
    complimentaryDecisions.set(requestId, result);
    if (grantId) {
      const product = BASELINE_MONETIZATION_CATALOG.products.find(
        (candidate) => candidate.versionId === request.productVersionId,
      );
      if (!product) throw new Error("Version de forfait introuvable");
      product.entitlements
        .filter(isCommercialEntitlementOperational)
        .forEach((definition) => {
          const id = `complimentary_entitlement_${digest(`${grantId}:${definition.key}`).slice(0, 20)}`;
          activeEntitlements.push({
            id,
            accountId: request.accountId,
            productId: product.id,
            key: definition.key,
            value: definition.value,
            startsAt: request.startsAt,
            endsAt: request.endsAt,
            status:
              new Date(request.startsAt) <= new Date() ? "active" : "scheduled",
            verticalId:
              definition.verticalId || product.commercialProfile.verticalId,
            mergePolicy: definition.mergePolicy,
          });
        });
    }
    return structuredClone(result);
  }

  async createDraft(patch: CommercialDraftPatch) {
    requireDemoAnyCapability(["commercial_rules.edit", "commissions.manage"]);
    await simulateNetworkDelay();
    patch = commercialDraftPatchSchema.parse(patch);
    const current = await this.getCatalog("FR");
    const number =
      Math.max(...versions.map((version) => version.versionNumber)) + 1;
    const id = `commercial-fr-v${number}`;
    const now = new Date().toISOString();
    const catalog: MonetizationCatalog = {
      ...structuredClone(current),
      configurationVersionId: id,
      versionNumber: number,
      generatedAt: now,
      verticals: structuredClone(patch.verticals || current.verticals),
      products: structuredClone(patch.products || current.products).map(
        (product) => ({
          ...product,
          versionId: `${id}:${product.id}`,
          prices: product.prices.map((price) => ({
            ...price,
            id: `${id}:${product.id}:${price.billingPeriod}`,
          })),
          status: product.status === "disabled" ? "disabled" : "draft",
        }),
      ),
      rules: structuredClone(patch.rules || current.rules).map((rule) => ({
        ...rule,
        versionId: id,
        status: "draft",
      })),
      commissionPolicies: structuredClone(
        patch.commissionPolicies || current.commissionPolicies,
      ).map((policy) => ({
        ...policy,
        versionId: id,
        versionNumber: number,
        status: policy.status === "disabled" ? "disabled" : "draft",
        rules: policy.rules.map((rule) => ({
          ...rule,
          policyId: policy.id,
          versionId: id,
        })),
      })),
      promotions: structuredClone(patch.promotions || current.promotions).map(
        (promotion) => ({
          ...promotion,
          id: `${id}:${promotion.code.toLowerCase()}`,
          status: promotion.status === "disabled" ? "disabled" : "draft",
        }),
      ),
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
      ruleCount:
        catalog.rules.length +
        catalog.commissionPolicies.reduce(
          (count, policy) => count + policy.rules.length,
          0,
        ),
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

  async transitionVersion(
    versionId: string,
    action: "submit" | "approve" | "publish" | "rollback",
    reason: string,
  ) {
    requireDemoAnyCapability(
      action === "submit"
        ? ["commercial_rules.edit", "commissions.manage"]
        : action === "approve"
          ? ["commercial_rules.approve", "commissions.manage"]
          : ["commercial_rules.publish", "commissions.publish"],
    );
    await simulateNetworkDelay();
    const version = versions.find((entry) => entry.id === versionId);
    if (!version) throw new Error("Version introuvable");
    if (action === "submit" && version.status === "draft")
      version.status = "pending_approval";
    else if (action === "approve" && version.status === "pending_approval") {
      version.status = "approved";
      version.approvedBy = "finance-demo";
    } else if (action === "publish" && version.status === "approved") {
      const scheduled = Boolean(
        version.effectiveFrom &&
        version.effectiveFrom > new Date().toISOString(),
      );
      if (!scheduled) {
        versions
          .filter((entry) => entry.status === "active")
          .forEach((entry) => {
            entry.status = "archived";
          });
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
      catalog.commissionPolicies = catalog.commissionPolicies.map((policy) => ({
        ...policy,
        status: policy.status === "draft" ? "active" : policy.status,
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
        commissionPolicies: source.commissionPolicies,
        promotions: source.promotions,
      });
    } else throw new Error("Transition invalide");
    version.reason = reason;
    return structuredClone(version);
  }
}

export const demoBusinessRulesService = new DemoBusinessRulesService();
