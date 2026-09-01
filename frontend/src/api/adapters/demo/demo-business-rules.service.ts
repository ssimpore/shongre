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
  ProfessionalCatalogPresentation,
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
import { getCountryConfig, type MarketContext } from "@shongre/contracts";
import {
  commercialDraftPatchSchema,
  complimentaryGrantDecisionInputSchema,
  complimentaryGrantRequestInputSchema,
  isCommercialAudienceCompatible,
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "@shongre/contracts/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { PROPOSED_MONETIZATION_DRAFT_CATALOG } from "@shongre/contracts/monetization-proposed-catalog";
import { isSameBusinessVertical } from "@shongre/contracts/business-verticals";
import { colors, palette } from "@shongre/design-tokens";
import {
  getBillingUsagePresentation,
  resolveAllEffectiveEntitlements,
  selectProfessionalCatalogPresentation,
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
import {
  requireDemoAnyCapability,
  requireDemoCapability,
} from "./demo-authorization";

const createdAt = BASELINE_MONETIZATION_CATALOG.generatedAt;
const DEMO_COMMERCIAL_NOW = "2026-08-28T12:00:00.000Z";
const DEMO_COMMERCIAL_NOW_MS = Date.parse(DEMO_COMMERCIAL_NOW);
const versions: CommercialConfigurationVersion[] = [
  {
    id: PROPOSED_MONETIZATION_DRAFT_CATALOG.configurationVersionId,
    setId: "commercial-core",
    versionNumber: PROPOSED_MONETIZATION_DRAFT_CATALOG.versionNumber,
    marketCode: "FR",
    status: "draft",
    reason:
      "Brouillon cible Starter, Growth et Performance avec migration et garde-fous",
    createdBy: "Système — configuration revue",
    createdAt: PROPOSED_MONETIZATION_DRAFT_CATALOG.generatedAt,
    productCount: PROPOSED_MONETIZATION_DRAFT_CATALOG.products.length,
    ruleCount:
      PROPOSED_MONETIZATION_DRAFT_CATALOG.rules.length +
      PROPOSED_MONETIZATION_DRAFT_CATALOG.commissionPolicies.reduce(
        (count, policy) => count + policy.rules.length,
        0,
      ),
    conflicts: [
      {
        code: "MIGRATION_SHADOW_QUOTE_INCOMPLETE",
        severity: "blocking",
        entityIds: PROPOSED_MONETIZATION_DRAFT_CATALOG.migrationMappings.map(
          (mapping) => mapping.id,
        ),
        message: "Les devis fantômes de migration restent à comparer.",
      },
      {
        code: "CAMPAIGN_ENROLLMENT_WINDOW_MISSING",
        severity: "blocking",
        entityIds: ["campaign-founding-professional"],
        message:
          "La fenêtre d’inscription Founding Professional reste à valider.",
      },
      {
        code: "ECONOMICS_APPROVAL_REQUIRED",
        severity: "blocking",
        entityIds: PROPOSED_MONETIZATION_DRAFT_CATALOG.commercialEconomics.map(
          (entry) => entry.id,
        ),
        message: "Les coûts directs et seuils de marge restent à approuver.",
      },
      {
        code: "PROVIDER_MAPPING_NOT_SYNCHRONIZED",
        severity: "blocking",
        entityIds: PROPOSED_MONETIZATION_DRAFT_CATALOG.providerMappings.map(
          (entry) => entry.id,
        ),
        message: "Les prix cibles ne sont pas synchronisés avec Stripe.",
      },
    ],
  },
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
    PROPOSED_MONETIZATION_DRAFT_CATALOG.configurationVersionId,
    structuredClone(PROPOSED_MONETIZATION_DRAFT_CATALOG),
  ],
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
const subscriptionChangeResults = new Map<string, MonetizationSubscription>();
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

function money(amountMinor: number, currency: string) {
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
        organizationId: subscription.organizationId,
        productId: targetProduct.id,
        productVersionId: targetProduct.versionId,
        configurationVersionId: subscription.configurationVersionId,
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
    configurationVersionId:
      BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    marketCode: BASELINE_MONETIZATION_CATALOG.marketCode,
    currency: BASELINE_MONETIZATION_CATALOG.currency,
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
    configurationVersionId:
      BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    marketCode: BASELINE_MONETIZATION_CATALOG.marketCode,
    snapshotHash: digest(`${accountId}:${productId}:${periodStart}`),
    total: money(totalMinor, BASELINE_MONETIZATION_CATALOG.currency),
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
        productVersionId: product.versionId,
        configurationVersionId:
          BASELINE_MONETIZATION_CATALOG.configurationVersionId,
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
    configurationVersionId:
      BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    marketCode: BASELINE_MONETIZATION_CATALOG.marketCode,
    number: `FAC-2026-${digest(accountId).slice(0, 5).toUpperCase()}`,
    status: "paid",
    subtotal: money(
      price.amount.amountMinor,
      BASELINE_MONETIZATION_CATALOG.currency,
    ),
    discount: money(0, BASELINE_MONETIZATION_CATALOG.currency),
    tax: money(taxMinor, BASELINE_MONETIZATION_CATALOG.currency),
    total: money(totalMinor, BASELINE_MONETIZATION_CATALOG.currency),
    amountPaid: money(totalMinor, BASELINE_MONETIZATION_CATALOG.currency),
    amountDue: money(0, BASELINE_MONETIZATION_CATALOG.currency),
    issuedAt: periodStart,
    paidAt: periodStart,
  });
  payments.push({
    id: `seed_pay_${digest(accountId).slice(0, 16)}`,
    accountId,
    orderId,
    invoiceId,
    status: "succeeded",
    amount: money(totalMinor, BASELINE_MONETIZATION_CATALOG.currency),
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

function applyDueScheduledChanges(accountId: string) {
  const changedAt = DEMO_COMMERCIAL_NOW;
  subscriptions
    .filter(
      (subscription) =>
        subscription.accountId === accountId &&
        subscription.scheduledChangeAt &&
        subscription.scheduledChangeAt <= changedAt,
    )
    .forEach((subscription) => {
      const catalog = subscription.scheduledConfigurationVersionId
        ? catalogs.get(subscription.scheduledConfigurationVersionId)
        : undefined;
      const target = catalog?.products.find(
        (product) => product.id === subscription.scheduledProductId,
      );
      const targetPrice = target?.prices.find(
        (price) => price.id === subscription.scheduledPriceId,
      );
      if (!catalog || !target || !targetPrice) return;
      const previousProductId = subscription.productId;
      const effectiveAt = subscription.scheduledChangeAt!;
      subscription.productId = target.id;
      subscription.productVersionId = target.versionId;
      subscription.configurationVersionId = catalog.configurationVersionId;
      subscription.marketCode = catalog.marketCode;
      subscription.currency = catalog.currency;
      subscription.priceId = targetPrice.id;
      subscription.billingPeriod = targetPrice.billingPeriod;
      subscription.verticalId = target.commercialProfile.verticalId;
      subscription.familyId = target.commercialProfile.familyId;
      subscription.scheduledProductId = undefined;
      subscription.scheduledProductVersionId = undefined;
      subscription.scheduledConfigurationVersionId = undefined;
      subscription.scheduledPriceId = undefined;
      subscription.scheduledChangeAt = undefined;
      subscription.updatedAt = changedAt;
      replaceSubscriptionEntitlements(
        subscription,
        previousProductId,
        target,
        effectiveAt,
      );
      grantDemoRecurringCredits(subscription, target.entitlements);
      pushSubscriptionEvent(
        subscription,
        "changed",
        `maintenance:change:${effectiveAt}`,
        subscription.status,
        subscription.status,
      );
    });
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

function requireDemoMarketContext(
  marketContext: MarketContext,
  operation: "read" | "paid" | "admin" = "read",
) {
  const country = marketContext.countryCode
    ? getCountryConfig(marketContext.countryCode)
    : undefined;
  const validKind =
    operation === "admin"
      ? ["market", "coming_soon"].includes(marketContext.kind)
      : marketContext.kind === "market";
  if (
    !validKind ||
    !country?.enabled ||
    marketContext.country?.code !== country.code ||
    marketContext.currency !== country.currency ||
    marketContext.timezone !== country.timezone ||
    !marketContext.locale ||
    !country.supportedLocales.includes(marketContext.locale)
  ) {
    throw new Error("Contexte commercial du marché invalide");
  }
  if (
    operation === "paid" &&
    (!country.monetization.enabled ||
      !country.marketplace.enabled ||
      !country.capabilities.payments ||
      !["active", "beta"].includes(country.launchStatus))
  ) {
    throw new Error("Opérations payantes indisponibles sur ce marché");
  }
  return country;
}

export class DemoBusinessRulesService implements BusinessRulesServiceContract {
  private async getCatalogByMarketCode(marketCode: string) {
    await simulateNetworkDelay();
    const version = versions.find(
      (entry) => entry.marketCode === marketCode && entry.status === "active",
    );
    const catalog = catalogs.get(version?.id || "");
    if (!catalog) throw new Error("Configuration commerciale indisponible.");
    return structuredClone(catalog);
  }

  async getCatalog(marketContext: MarketContext) {
    const country = requireDemoMarketContext(marketContext);
    const catalog = await this.getCatalogByMarketCode(country.marketCode);
    if (catalog.currency !== country.currency) {
      throw new Error("Le catalogue ne correspond pas au marché sélectionné");
    }
    return catalog;
  }

  async getProfessionalCatalogPresentation(
    marketContext: MarketContext,
  ): Promise<ProfessionalCatalogPresentation> {
    const activeCatalog = await this.getCatalog(marketContext);
    const candidates = versions.flatMap((version) => {
      if (version.id === activeCatalog.configurationVersionId) return [];
      const catalog = catalogs.get(version.id);
      return catalog ? [{ version, catalog: structuredClone(catalog) }] : [];
    });
    return selectProfessionalCatalogPresentation(activeCatalog, candidates);
  }

  async evaluate(
    marketContext: MarketContext,
    context: RuleEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    requireDemoAnyCapability([
      "marketplace.customer.access",
      "commercial_rules.read",
    ]);
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext, "admin");
    if (context.marketCode !== country.marketCode) {
      throw new Error("Le marché simulé ne correspond pas au contexte actif");
    }
    const catalog = await this.getCatalogByMarketCode(context.marketCode);
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

  async createQuote(marketContext: MarketContext, request: QuoteRequest) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const country = requireDemoMarketContext(marketContext, "paid");
    if (request.marketCode !== country.marketCode) {
      throw new Error("Le marché du devis ne correspond pas au contexte actif");
    }
    const key = `${accountId}:${country.marketCode}:${request.idempotencyKey}`;
    const existing = quotes.get(key);
    if (existing) return structuredClone(existing);
    const catalog = await this.getCatalogByMarketCode(request.marketCode);
    const promotionValidation = request.promotionCode
      ? await this.validatePromotion(marketContext, {
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
        Date.parse(policy.campaignStartsAt) > DEMO_COMMERCIAL_NOW_MS
      )
        return false;
      if (
        policy.campaignEndsAt &&
        Date.parse(policy.campaignEndsAt) <= DEMO_COMMERCIAL_NOW_MS
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
      ? new Date(DEMO_COMMERCIAL_NOW_MS + trialDays * 86_400_000).toISOString()
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
    const now = DEMO_COMMERCIAL_NOW;
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
      expiresAt: new Date(DEMO_COMMERCIAL_NOW_MS + 30 * 60_000).toISOString(),
      createdAt: now,
    };
    quotes.set(key, quote);
    quotes.set(quote.id, quote);
    return structuredClone(quote);
  }

  async createCheckout(
    marketContext: MarketContext,
    quoteId: string,
    idempotencyKey: string,
  ) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const accountId = currentAccountId();
    const quote = quotes.get(quoteId);
    if (!quote) throw new Error("Devis introuvable");
    if (quote.accountId !== accountId)
      throw new Error("Ce devis appartient à un autre compte");
    const country = requireDemoMarketContext(marketContext, "paid");
    if (
      quote.marketCode !== country.marketCode ||
      quote.currency !== country.currency
    ) {
      throw new Error("Le devis ne correspond pas au marché actif");
    }
    const orderKey = `${accountId}:${country.marketCode}:${idempotencyKey}`;
    const existing = orders.get(orderKey);
    if (existing) return structuredClone(existing);
    if (/provider[-_:]?outage/i.test(idempotencyKey)) {
      throw new Error("Le service de paiement simulé est indisponible.");
    }
    const now = DEMO_COMMERCIAL_NOW;
    const scenarioStatus: MonetizationOrder["status"] =
      /requires[-_:]?action/i.test(idempotencyKey)
        ? "requires_action"
        : /fail(?:ed|ure)?/i.test(idempotencyKey)
          ? "failed"
          : /abandon(?:ed)?|cancel(?:led)?/i.test(idempotencyKey)
            ? "cancelled"
            : /pending/i.test(idempotencyKey)
              ? "pending"
              : "paid";
    const order: MonetizationOrder = {
      id: `order_${digest(orderKey).slice(0, 24)}`,
      quoteId,
      accountId: quote.accountId,
      organizationId: quote.organizationId,
      configurationVersionId: quote.configurationVersionId,
      marketCode: quote.marketCode,
      snapshotHash: quote.snapshotHash,
      total: {
        amountMinor: quote.amountDueTodayMinor,
        currency: quote.currency,
      },
      status: scenarioStatus,
      provider: "demo",
      providerCheckoutId: `demo_${digest(orderKey).slice(0, 16)}`,
      createdAt: now,
      updatedAt: now,
    };
    orders.set(orderKey, order);
    orders.set(order.id, order);
    const catalog = catalogs.get(quote.configurationVersionId);
    if (!catalog) throw new Error("Version tarifaire indisponible");
    if (scenarioStatus !== "paid") {
      payments.push({
        id: `pay_${digest(order.id).slice(0, 24)}`,
        accountId: quote.accountId,
        orderId: order.id,
        status:
          scenarioStatus === "requires_action"
            ? "requires_action"
            : scenarioStatus === "failed"
              ? "failed"
              : scenarioStatus === "cancelled"
                ? "cancelled"
                : "pending",
        amount: money(quote.amountDueTodayMinor, quote.currency),
        provider: "demo",
        providerPaymentId: order.providerCheckoutId,
        failureCode:
          scenarioStatus === "failed" ? "DEMO_PAYMENT_FAILED" : undefined,
        failureMessage:
          scenarioStatus === "failed"
            ? "Le paiement simulé a échoué."
            : undefined,
        createdAt: now,
        updatedAt: now,
      });
      return structuredClone(order);
    }
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
        ? new Date(
            DEMO_COMMERCIAL_NOW_MS + price.durationDays * 86_400_000,
          ).toISOString()
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
            organizationId: quote.organizationId,
            productId: line.productId,
            productVersionId: line.productVersionId,
            configurationVersionId: quote.configurationVersionId,
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
            organizationId: quote.organizationId,
            productId: line.productId,
            productVersionId: line.productVersionId,
            configurationVersionId: quote.configurationVersionId,
            marketCode: quote.marketCode,
            currency: quote.currency,
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
      configurationVersionId: quote.configurationVersionId,
      marketCode: quote.marketCode,
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

  async validatePromotion(
    marketContext: MarketContext,
    request: PromotionValidationRequest,
  ) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext, "paid");
    if (request.marketCode !== country.marketCode) {
      throw new Error("La promotion ne correspond pas au marché actif");
    }
    const catalog = await this.getCatalogByMarketCode(request.marketCode);
    const promotion = catalog.promotions.find(
      (entry) => entry.code === request.code.toUpperCase(),
    );
    const applicableProductIds = promotion
      ? request.productIds.filter((id) => promotion.productIds.includes(id))
      : [];
    const active =
      promotion &&
      promotion.status === "active" &&
      Date.parse(promotion.startsAt) <= DEMO_COMMERCIAL_NOW_MS &&
      Date.parse(promotion.endsAt) > DEMO_COMMERCIAL_NOW_MS;
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

  async getActiveEntitlements(marketContext: MarketContext) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext);
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    return structuredClone(
      activeEntitlements.filter(
        (entry) =>
          entry.accountId === accountId &&
          entry.status === "active" &&
          Boolean(
            entry.configurationVersionId &&
            catalogs.get(entry.configurationVersionId)?.marketCode ===
              country.marketCode,
          ),
      ),
    );
  }

  async getSubscriptions(marketContext: MarketContext) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext);
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    return structuredClone(
      subscriptions.filter(
        (entry) =>
          entry.accountId === accountId &&
          entry.marketCode === country.marketCode,
      ),
    );
  }

  async getBillingOverview(
    marketContext: MarketContext,
  ): Promise<BillingOverview> {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext);
    const accountId = currentAccountId();
    const user = storageService.getCurrentUser();
    ensureSeededBilling(accountId);
    applyDueScheduledChanges(accountId);
    const accountSubscriptions = subscriptions.filter(
      (entry) =>
        entry.accountId === accountId &&
        entry.marketCode === country.marketCode,
    );
    const accountEntitlements = activeEntitlements.filter(
      (entry) =>
        entry.accountId === accountId &&
        entry.status === "active" &&
        Boolean(
          entry.configurationVersionId &&
          catalogs.get(entry.configurationVersionId)?.marketCode ===
            country.marketCode,
        ),
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
    const effectiveEntitlements = [
      ...new Set(
        accountEntitlements
          .map((entry) => entry.configurationVersionId)
          .filter((value): value is string => Boolean(value)),
      ),
    ].flatMap((versionId) => {
      const catalog = catalogs.get(versionId);
      return catalog
        ? resolveAllEffectiveEntitlements({
            catalog,
            entitlements: accountEntitlements.filter(
              (entry) => entry.configurationVersionId === versionId,
            ),
            at: new Date(DEMO_COMMERCIAL_NOW),
          })
        : [];
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
              user.businessAddress &&
              user.postalCode &&
              user.city &&
              (user.country || currentSubscription?.marketCode)
                ? {
                    line1: user.businessAddress,
                    postalCode: user.postalCode,
                    city: user.city,
                    countryCode:
                      user.country || currentSubscription!.marketCode!,
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
            .filter(
              (entry) =>
                entry.accountId === accountId &&
                entry.marketCode === country.marketCode,
            )
            .map((entry) => [entry.id, entry]),
        ).values(),
      ].map((entry) => structuredClone(entry)),
      payments: structuredClone(
        payments.filter(
          (entry) =>
            entry.accountId === accountId &&
            orders.get(entry.orderId)?.marketCode === country.marketCode,
        ),
      ),
      invoices: structuredClone(
        invoices.filter(
          (entry) =>
            entry.accountId === accountId &&
            entry.marketCode === country.marketCode,
        ),
      ),
      refunds: structuredClone(
        refunds.filter(
          (entry) =>
            entry.accountId === accountId &&
            orders.get(entry.orderId)?.marketCode === country.marketCode,
        ),
      ),
      creditBalances: structuredClone(
        creditBalances
          .filter((entry) => entry.accountId === accountId)
          .map((entry) => ({
            ...entry,
            transactions: entry.transactions.filter((transaction) => {
              if (!transaction.sourceId) return false;
              return (
                orders.get(transaction.sourceId)?.marketCode ===
                  country.marketCode ||
                subscriptions.find(
                  (subscription) =>
                    subscription.id === transaction.sourceId &&
                    subscription.marketCode === country.marketCode,
                ) !== undefined
              );
            }),
            reserved: 0,
          }))
          .map((entry) => ({
            ...entry,
            available: Math.max(
              0,
              entry.transactions.reduce(
                (total, transaction) => total + transaction.quantity,
                0,
              ),
            ),
          }))
          .filter((entry) => entry.transactions.length > 0),
      ),
      subscriptionEvents: structuredClone(
        subscriptionEvents.filter(
          (entry) =>
            entry.accountId === accountId &&
            subscriptions.find(
              (subscription) =>
                subscription.id === entry.subscriptionId &&
                subscription.marketCode === country.marketCode,
            ) !== undefined,
        ),
      ),
      effectiveEntitlements,
    };
  }

  async getInvoiceDocument(marketContext: MarketContext, invoiceId: string) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext);
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const invoice = invoices.find(
      (entry) =>
        entry.id === invoiceId &&
        entry.accountId === accountId &&
        entry.marketCode === country.marketCode,
    );
    if (!invoice) throw new Error("Facture introuvable");
    const user = storageService.getCurrentUser();
    const format = (amountMinor: number) =>
      new Intl.NumberFormat(marketContext.locale!, {
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

  async previewSubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ) {
    requireDemoCapability("subscription.manage.own");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext, "paid");
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const subscription = subscriptions.find(
      (entry) =>
        entry.id === request.subscriptionId &&
        entry.accountId === accountId &&
        entry.marketCode === country.marketCode,
    );
    if (!subscription) throw new Error("Abonnement introuvable");
    if (
      request.expectedSubscriptionUpdatedAt &&
      request.expectedSubscriptionUpdatedAt !== subscription.updatedAt
    ) {
      throw new Error("STALE_SUBSCRIPTION_STATE");
    }
    if (
      !subscription.configurationVersionId ||
      !subscription.marketCode ||
      !subscription.currency
    ) {
      throw new Error("SUBSCRIPTION_CATALOG_EVIDENCE_MISSING");
    }
    const currentCatalog = catalogs.get(subscription.configurationVersionId);
    const catalog = await this.getCatalogByMarketCode(subscription.marketCode);
    if (
      !currentCatalog ||
      currentCatalog.marketCode !== catalog.marketCode ||
      currentCatalog.currency !== catalog.currency ||
      catalog.currency !== subscription.currency
    ) {
      throw new Error("SUBSCRIPTION_MARKET_CONTEXT_MISMATCH");
    }
    const currentProduct = currentCatalog.products.find(
      (entry) => entry.id === subscription.productId,
    );
    const targetProduct = catalog.products.find(
      (entry) => entry.id === request.targetProductId,
    );
    const currentPrice = currentProduct?.prices.find(
      (entry) => entry.id === subscription.priceId,
    );
    const targetPrice = targetProduct?.prices.find(
      (entry) =>
        entry.id === request.targetPriceId &&
        (!entry.effectiveFrom ||
          Date.parse(entry.effectiveFrom) <= DEMO_COMMERCIAL_NOW_MS) &&
        (!entry.effectiveUntil ||
          Date.parse(entry.effectiveUntil) > DEMO_COMMERCIAL_NOW_MS),
    );
    if (
      !currentProduct ||
      !targetProduct ||
      !isCommercialProductPurchasable(targetProduct) ||
      !targetPrice
    )
      throw new Error("Offre indisponible");
    const policy = catalog.subscriptionPolicy;
    const sameProduct = currentProduct.id === targetProduct.id;
    const configuredUpgrade =
      currentProduct.commercialProfile.upgradeProductIds.includes(
        targetProduct.id,
      );
    const isDowngrade =
      currentProduct.commercialProfile.downgradeProductIds.includes(
        targetProduct.id,
      );
    if (!sameProduct && !configuredUpgrade && !isDowngrade)
      throw new Error("PLAN_TRANSITION_NOT_ALLOWED");
    const currentAmount = currentPrice?.amount.amountMinor || 0;
    const intervalChanged =
      currentPrice?.billingPeriod !== targetPrice.billingPeriod;
    const isUpgrade = configuredUpgrade && !intervalChanged;
    if (
      (isUpgrade && policy.immediateUpgrade !== "allowed") ||
      (isDowngrade && policy.downgradeTiming !== "period_end") ||
      (sameProduct && policy.samePlanRenewalTiming !== "period_end") ||
      (intervalChanged &&
        policy.billingIntervalChangeTiming !== "period_end") ||
      (isUpgrade &&
        !["linear_remaining_time", "none"].includes(policy.upgradeProration))
    ) {
      throw new Error("SUBSCRIPTION_TRANSITION_POLICY_MISSING");
    }
    const periodStart = new Date(subscription.currentPeriodStart).getTime();
    const periodEnd = new Date(subscription.currentPeriodEnd).getTime();
    const remainingRatio = Math.max(
      0,
      Math.min(
        1,
        (periodEnd - DEMO_COMMERCIAL_NOW_MS) /
          Math.max(1, periodEnd - periodStart),
      ),
    );
    const prorationMinor =
      isUpgrade && policy.upgradeProration === "linear_remaining_time"
        ? Math.max(
            0,
            Math.round(
              (targetPrice.amount.amountMinor - currentAmount) * remainingRatio,
            ),
          )
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
      targetProductVersionId: targetProduct.versionId,
      targetConfigurationVersionId: catalog.configurationVersionId,
      policyId: policy.id,
      requiresProviderConfirmation: false,
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

  async applySubscriptionChange(
    marketContext: MarketContext,
    request: SubscriptionChangeRequest,
  ) {
    requireDemoCapability("subscription.manage.own");
    const accountId = currentAccountId();
    const country = requireDemoMarketContext(marketContext, "paid");
    const resultKey = `${accountId}:${country.marketCode}:${request.idempotencyKey}`;
    const existingResult = subscriptionChangeResults.get(resultKey);
    if (existingResult) return structuredClone(existingResult);
    const preview = await this.previewSubscriptionChange(
      marketContext,
      request,
    );
    await simulateNetworkDelay();
    const subscription = subscriptions.find(
      (entry) =>
        entry.id === request.subscriptionId &&
        entry.marketCode === country.marketCode,
    )!;
    if (
      request.expectedSubscriptionUpdatedAt &&
      request.expectedSubscriptionUpdatedAt !== subscription.updatedAt
    ) {
      throw new Error("STALE_SUBSCRIPTION_STATE");
    }
    const previousUpdatedAt = subscription.updatedAt;
    const before = subscription.status;
    if (preview.effectiveAt === "period_end") {
      subscription.scheduledProductId = request.targetProductId;
      subscription.scheduledProductVersionId = preview.targetProductVersionId;
      subscription.scheduledConfigurationVersionId =
        preview.targetConfigurationVersionId;
      subscription.scheduledPriceId = request.targetPriceId;
      subscription.scheduledChangeAt = subscription.currentPeriodEnd;
      pushSubscriptionEvent(
        subscription,
        "change_scheduled",
        request.idempotencyKey,
        before,
        before,
      );
    } else {
      const previousProductId = subscription.productId;
      const changedAt = DEMO_COMMERCIAL_NOW;
      const catalog = catalogs.get(preview.targetConfigurationVersionId);
      const target = catalog?.products.find(
        (entry) => entry.id === request.targetProductId,
      );
      const targetPrice = target?.prices.find(
        (entry) => entry.id === request.targetPriceId,
      );
      if (!catalog || !target || !targetPrice)
        throw new Error("Offre indisponible");
      subscription.productId = request.targetProductId;
      subscription.productVersionId = target.versionId;
      subscription.configurationVersionId = catalog.configurationVersionId;
      subscription.marketCode = catalog.marketCode;
      subscription.currency = catalog.currency;
      subscription.priceId = request.targetPriceId;
      subscription.billingPeriod = targetPrice.billingPeriod;
      subscription.verticalId = target.commercialProfile.verticalId;
      subscription.familyId = target.commercialProfile.familyId;
      subscription.scheduledProductId = undefined;
      subscription.scheduledProductVersionId = undefined;
      subscription.scheduledConfigurationVersionId = undefined;
      subscription.scheduledPriceId = undefined;
      subscription.scheduledChangeAt = undefined;
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
    subscription.updatedAt = new Date(
      Math.max(
        DEMO_COMMERCIAL_NOW_MS,
        new Date(previousUpdatedAt).getTime() + 1,
      ),
    ).toISOString();
    const result = structuredClone(subscription);
    subscriptionChangeResults.set(resultKey, result);
    return result;
  }

  async updateSubscriptionCancellation(
    marketContext: MarketContext,
    request: SubscriptionCancellationRequest,
  ) {
    requireDemoCapability("subscription.manage.own");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext, "paid");
    const accountId = currentAccountId();
    ensureSeededBilling(accountId);
    const subscription = subscriptions.find(
      (entry) =>
        entry.id === request.subscriptionId &&
        entry.accountId === accountId &&
        entry.marketCode === country.marketCode,
    );
    if (!subscription) throw new Error("Abonnement introuvable");
    const catalog = subscription.configurationVersionId
      ? catalogs.get(subscription.configurationVersionId)
      : undefined;
    if (
      !catalog ||
      catalog.subscriptionPolicy.cancellationTiming !== "period_end"
    ) {
      throw new Error("SUBSCRIPTION_CANCELLATION_POLICY_MISSING");
    }
    const previousStatus = subscription.status;
    subscription.cancelAtPeriodEnd = request.cancelAtPeriodEnd;
    subscription.status = request.cancelAtPeriodEnd
      ? "cancellation_pending"
      : "active";
    subscription.updatedAt = new Date(
      Math.max(DEMO_COMMERCIAL_NOW_MS, Date.parse(subscription.updatedAt) + 1),
    ).toISOString();
    pushSubscriptionEvent(
      subscription,
      request.cancelAtPeriodEnd ? "cancellation_scheduled" : "reactivated",
      `cancellation:${subscription.id}:${request.cancelAtPeriodEnd}`,
      previousStatus,
      subscription.status,
    );
    return structuredClone(subscription);
  }

  async getAdminOverview(marketContext: MarketContext) {
    requireDemoCapability("monetization.manage");
    await simulateNetworkDelay();
    const country = requireDemoMarketContext(marketContext, "admin");
    const marketCode = country.marketCode;
    const catalog = await this.getCatalogByMarketCode(marketCode);
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
      quoteCountToday: [
        ...new Map(
          [...quotes.values()]
            .filter((entry) => entry.marketCode === marketCode)
            .map((entry) => [entry.id, entry]),
        ).values(),
      ].length,
      activeSubscriptionCount: subscriptions.filter(
        (entry) =>
          entry.marketCode === marketCode &&
          ["active", "trialing", "past_due", "cancellation_pending"].includes(
            entry.status,
          ),
      ).length,
      orders: [
        ...new Map(
          [...orders.values()]
            .filter((entry) => entry.marketCode === marketCode)
            .map((entry) => [entry.id, entry]),
        ).values(),
      ].map((order) => structuredClone(order)),
      entitlements: structuredClone(
        activeEntitlements.filter(
          (entry) =>
            entry.configurationVersionId &&
            catalogs.get(entry.configurationVersionId)?.marketCode ===
              marketCode,
        ),
      ),
      payments: structuredClone(
        payments.filter(
          (entry) => orders.get(entry.orderId)?.marketCode === marketCode,
        ),
      ),
      invoices: structuredClone(
        invoices.filter((entry) => entry.marketCode === marketCode),
      ),
      refunds: structuredClone(
        refunds.filter(
          (entry) => orders.get(entry.orderId)?.marketCode === marketCode,
        ),
      ),
      subscriptions: structuredClone(
        subscriptions.filter((entry) => entry.marketCode === marketCode),
      ),
      creditBalances: [],
      subscriptionEvents: structuredClone(
        subscriptionEvents.filter(
          (entry) =>
            subscriptions.find(
              (subscription) =>
                subscription.id === entry.subscriptionId &&
                subscription.marketCode === marketCode,
            ) !== undefined,
        ),
      ),
      auditEvents: structuredClone(
        auditEvents.filter((entry) =>
          marketVersions.some((version) => entry.entityId.includes(version.id)),
        ),
      ),
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
      const catalog = [...catalogs.values()].find((candidate) =>
        candidate.products.some(
          (product) => product.versionId === request.productVersionId,
        ),
      );
      const product = catalog?.products.find(
        (candidate) => candidate.versionId === request.productVersionId,
      );
      if (!catalog || !product)
        throw new Error("Version de forfait introuvable");
      product.entitlements
        .filter(isCommercialEntitlementOperational)
        .forEach((definition) => {
          const id = `complimentary_entitlement_${digest(`${grantId}:${definition.key}`).slice(0, 20)}`;
          activeEntitlements.push({
            id,
            accountId: request.accountId,
            productId: product.id,
            productVersionId: product.versionId,
            configurationVersionId: catalog.configurationVersionId,
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
    const marketCode = patch.marketCode;
    const current = await this.getCatalogByMarketCode(marketCode);
    const number =
      Math.max(
        ...versions
          .filter((version) => version.marketCode === marketCode)
          .map((version) => version.versionNumber),
        0,
      ) + 1;
    const id = `commercial-${marketCode.toLowerCase()}-v${number}`;
    const now = new Date().toISOString();
    const sourceProducts = structuredClone(patch.products || current.products);
    const priceIdMap = new Map<string, string>();
    const products = sourceProducts.map((product) => ({
      ...product,
      versionId: `${id}:${product.id}`,
      prices: product.prices.map((price, index) => {
        const nextId = `${id}:${product.id}:${price.billingPeriod}:${index + 1}`;
        priceIdMap.set(price.id, nextId);
        return {
          ...price,
          providerPriceId: undefined,
          id: nextId,
        };
      }),
      status:
        product.status === "disabled"
          ? ("disabled" as const)
          : ("draft" as const),
    }));
    const catalog: MonetizationCatalog = {
      ...structuredClone(current),
      configurationVersionId: id,
      versionNumber: number,
      generatedAt: now,
      marketCode,
      verticals: structuredClone(patch.verticals || current.verticals),
      products,
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
      migrationMappings: structuredClone(
        patch.migrationMappings || current.migrationMappings,
      ),
      priceProtectionPolicies: structuredClone(
        patch.priceProtectionPolicies || current.priceProtectionPolicies,
      ).map((policy) => ({
        ...policy,
        status: policy.status === "disabled" ? "disabled" : "draft",
      })),
      campaigns: structuredClone(patch.campaigns || current.campaigns).map(
        (campaign) => ({
          ...campaign,
          status: campaign.status === "disabled" ? "disabled" : "draft",
        }),
      ),
      commercialEconomics: structuredClone(
        patch.commercialEconomics || current.commercialEconomics,
      ).map((economics) => ({
        ...economics,
        priceId: economics.priceId
          ? priceIdMap.get(economics.priceId) || economics.priceId
          : undefined,
        status: economics.status === "disabled" ? "disabled" : "draft",
      })),
      providerMappings: structuredClone(
        patch.providerMappings || current.providerMappings,
      ).map((mapping) => ({
        ...mapping,
        internalReferenceId:
          mapping.internalReferenceType === "price"
            ? priceIdMap.get(mapping.internalReferenceId) ||
              mapping.internalReferenceId
            : mapping.internalReferenceId,
        externalReferenceId: patch.providerMappings
          ? mapping.externalReferenceId
          : undefined,
        synchronizationStatus: patch.providerMappings
          ? mapping.synchronizationStatus
          : mapping.status === "disabled"
            ? "disabled"
            : "missing",
        lastVerifiedAt: patch.providerMappings
          ? mapping.lastVerifiedAt
          : undefined,
        evidenceReference: patch.providerMappings
          ? mapping.evidenceReference
          : undefined,
        status: patch.providerMappings
          ? mapping.status
          : mapping.status === "disabled"
            ? "disabled"
            : "draft",
      })),
      subscriptionPolicy: structuredClone(
        patch.subscriptionPolicy || current.subscriptionPolicy,
      ),
      paidPlacementPolicies: structuredClone(
        patch.paidPlacementPolicies || current.paidPlacementPolicies,
      ).map((policy) => ({
        ...policy,
        status: policy.status === "disabled" ? "disabled" : "draft",
      })),
      offerDefinitions: structuredClone(
        patch.offerDefinitions || current.offerDefinitions,
      ).map((offer) => ({
        ...offer,
        status: offer.status === "disabled" ? "disabled" : "draft",
      })),
    };
    const version: CommercialConfigurationVersion = {
      id,
      setId: "commercial-core",
      versionNumber: number,
      marketCode,
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
      catalog.priceProtectionPolicies = catalog.priceProtectionPolicies.map(
        (policy) => ({
          ...policy,
          status: policy.status === "draft" ? "active" : policy.status,
        }),
      );
      catalog.campaigns = catalog.campaigns.map((campaign) => ({
        ...campaign,
        status: campaign.status === "draft" ? "active" : campaign.status,
      }));
      catalog.commercialEconomics = catalog.commercialEconomics.map(
        (economics) => ({
          ...economics,
          status: economics.status === "draft" ? "active" : economics.status,
        }),
      );
      catalog.providerMappings = catalog.providerMappings.map((mapping) => ({
        ...mapping,
        status: mapping.status === "draft" ? "active" : mapping.status,
      }));
      catalog.paidPlacementPolicies = catalog.paidPlacementPolicies.map(
        (policy) => ({
          ...policy,
          status: policy.status === "draft" ? "active" : policy.status,
        }),
      );
      catalog.offerDefinitions = catalog.offerDefinitions.map((offer) => ({
        ...offer,
        status: offer.status === "draft" ? "active" : offer.status,
      }));
    } else if (action === "rollback" && version.status === "archived") {
      const source = catalogs.get(version.id)!;
      return this.createDraft({
        marketCode: source.marketCode,
        reason,
        products: source.products,
        rules: source.rules,
        commissionPolicies: source.commissionPolicies,
        promotions: source.promotions,
        migrationMappings: source.migrationMappings,
        priceProtectionPolicies: source.priceProtectionPolicies,
        campaigns: source.campaigns,
        commercialEconomics: source.commercialEconomics,
        providerMappings: source.providerMappings,
        subscriptionPolicy: source.subscriptionPolicy,
        paidPlacementPolicies: source.paidPlacementPolicies,
        offerDefinitions: source.offerDefinitions,
      });
    } else throw new Error("Transition invalide");
    version.reason = reason;
    return structuredClone(version);
  }
}

export const demoBusinessRulesService = new DemoBusinessRulesService();
