import { createHash, randomUUID } from "node:crypto";
import type {
  CommercialAuditEvent,
  CommercialConfigurationVersion,
  CommercialDraftPatch,
  BillingOverview,
  MonetizationAdminOverview,
  MonetizationCatalog,
  MonetizationOrder,
  MonetizationProduct,
  MonetizationQuote,
  MonetizationSubscription,
  PromotionValidationRequest,
  PromotionValidationResult,
  QuoteLine,
  QuoteRequest,
  RuleEvaluationContext,
  SubscriptionCancellationRequest,
  SubscriptionChangePreview,
  SubscriptionChangeRequest,
} from "@shongre/contracts/monetization";
import {
  commercialDraftPatchSchema,
  commercialChangeReasonSchema,
  complimentaryGrantDecisionInputSchema,
  complimentaryGrantRequestInputSchema,
  monetizationCatalogSchema,
  monetizationAdminOverviewSchema,
  monetizationOrderSchema,
  monetizationQuoteSchema,
  promotionValidationResultSchema,
  quoteRequestSchema,
  promotionValidationRequestSchema,
  ruleEvaluationContextSchema,
  billingOverviewSchema,
  subscriptionCancellationRequestSchema,
  subscriptionChangeRequestSchema,
  subscriptionChangePreviewSchema,
  isCommercialAudienceCompatible,
  isCommercialEntitlementOperational,
  isCommercialProductPurchasable,
} from "@shongre/contracts/monetization";
import {
  isSameBusinessVertical,
  normalizeBusinessVerticalCode,
  normalizeEducationMonetizationCatalog,
} from "@shongre/contracts/business-verticals";
import { resolveAllEffectiveEntitlements } from "@shongre/shared";
import { config } from "../../app/config/index.js";
import {
  BusinessRulesRepository,
  DemoBusinessRulesRepository,
  PostgresBusinessRulesRepository,
} from "../../infrastructure/database/repositories/business-rules.repository.js";
import { stripeCheckoutAdapter } from "../../infrastructure/payments/stripe-checkout-adapter.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMarketCode } from "../../shared/market/market-code.js";
import { validateCommercialConfiguration } from "./configuration-validator.js";
import { evaluateCommercialRules } from "./rule-evaluator.js";

const CACHE_TTL_MS = 60_000;
const QUOTE_TTL_MS = 30 * 60_000;

function currentUtcMonth() {
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

function entitlementQuotaKey(verticalId: string, entitlementKey: string) {
  return `entitlement.${normalizeBusinessVerticalCode(verticalId)}.${entitlementKey}`;
}

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

function hashSnapshot(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function deterministicId(namespace: string, value: string): string {
  return `${namespace}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function quoteHashPayload(
  quote: Pick<
    MonetizationQuote,
    | "accountId"
    | "configurationVersionId"
    | "marketCode"
    | "currency"
    | "listingId"
    | "promotionCode"
    | "promotion"
    | "lines"
    | "subtotalMinor"
    | "discountMinor"
    | "taxMinor"
    | "totalMinor"
    | "amountDueTodayMinor"
    | "nextChargeMinor"
    | "nextChargeAt"
    | "trial"
  >,
) {
  return {
    accountId: quote.accountId,
    configurationVersionId: quote.configurationVersionId,
    marketCode: quote.marketCode,
    currency: quote.currency,
    listingId: quote.listingId,
    promotionCode: quote.promotionCode,
    promotion: quote.promotion,
    lines: quote.lines,
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor,
    taxMinor: quote.taxMinor,
    totalMinor: quote.totalMinor,
    amountDueTodayMinor: quote.amountDueTodayMinor,
    nextChargeMinor: quote.nextChargeMinor,
    nextChargeAt: quote.nextChargeAt,
    trial: quote.trial,
  };
}

function isScopeInContext(
  scope: MonetizationProduct["scope"],
  context: RuleEvaluationContext,
) {
  if (
    context.userType &&
    scope.audiences.length > 0 &&
    !isCommercialAudienceCompatible(scope.audiences, context.userType)
  ) {
    return false;
  }
  const dimensions: Array<[string[], string | undefined]> = [
    [scope.marketCodes, context.marketCode],
    [scope.currencies, context.currency],
    [scope.categoryIds, context.categoryId],
    [scope.subtypeIds, context.subtypeId],
  ];
  return dimensions.every(
    ([allowed, actual]) =>
      allowed.length === 0 ||
      allowed.includes("all") ||
      Boolean(actual && allowed.includes(actual)),
  );
}

function isProductInScope(
  product: MonetizationProduct,
  context: RuleEvaluationContext,
) {
  return isScopeInContext(product.scope, context);
}

export class BusinessRulesService {
  private readonly repository: BusinessRulesRepository;
  private readonly cache = new Map<
    string,
    { catalog: MonetizationCatalog; expiresAt: number }
  >();
  private readonly lastKnownValid = new Map<string, MonetizationCatalog>();

  constructor(repository?: BusinessRulesRepository) {
    this.repository =
      repository ||
      (config.dataMode === "database"
        ? new PostgresBusinessRulesRepository()
        : new DemoBusinessRulesRepository());
  }

  async getCatalog(
    marketCode: string,
    options: { includeDrafts?: boolean } = {},
  ) {
    marketCode = requireMarketCode(marketCode);
    const cached = this.cache.get(marketCode);
    if (!options.includeDrafts && cached && cached.expiresAt > Date.now())
      return cached.catalog;
    try {
      const loaded = await this.repository.getActiveCatalog(marketCode);
      if (!loaded)
        throw new Error(`No active commercial version for ${marketCode}`);
      const catalog = normalizeEducationMonetizationCatalog(
        monetizationCatalogSchema.parse(loaded),
      );
      this.lastKnownValid.set(marketCode, catalog);
      this.cache.set(marketCode, {
        catalog,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return catalog;
    } catch (error) {
      const lastValid = this.lastKnownValid.get(marketCode);
      logger.error("commercial_catalog_load_failed", {
        marketCode,
        error: error instanceof Error ? error.message : "unknown",
        fallback: lastValid ? "last_known_valid" : "none",
      });
      if (lastValid) return { ...lastValid, stale: true };
      throw new AppError({
        code: "NOT_FOUND",
        message: "Configuration commerciale indisponible.",
      });
    }
  }

  async getProfessionalPlanCatalog(marketCode: string) {
    const catalog = await this.getCatalog(marketCode);
    return {
      configurationVersionId: catalog.configurationVersionId,
      versionNumber: catalog.versionNumber,
      marketCode: catalog.marketCode,
      currency: catalog.currency,
      generatedAt: catalog.generatedAt,
      stale: catalog.stale,
      verticals: catalog.verticals
        .filter((vertical) => vertical.status === "active")
        .sort((left, right) => left.sortOrder - right.sortOrder),
      plans: catalog.products
        .filter(
          (product) =>
            product.status === "active" &&
            product.kind === "subscription" &&
            product.commercialProfile.professionalOnly &&
            Boolean(product.commercialProfile.tier),
        )
        .sort(
          (left, right) =>
            left.commercialProfile.displayOrder -
            right.commercialProfile.displayOrder,
        ),
    };
  }

  async createTrialQuote(accountId: string, rawRequest: QuoteRequest) {
    const quote = await this.createQuote(accountId, rawRequest);
    if (!quote.trial) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce compte n’est pas éligible à un nouvel essai.",
        details: { reasonCode: "TRIAL_NOT_ELIGIBLE" },
      });
    }
    return quote;
  }

  private async resolvePromotion(
    accountId: string,
    request: PromotionValidationRequest,
    catalog: MonetizationCatalog,
    accountAudience: RuleEvaluationContext["userType"],
  ): Promise<PromotionValidationResult> {
    const parsed = promotionValidationRequestSchema.parse(request);
    const promotion = catalog.promotions.find(
      (candidate) => candidate.code === parsed.code,
    );
    const invalid = (reasonCode: string): PromotionValidationResult => ({
      valid: false,
      code: parsed.code,
      reasonCode,
      applicableProductIds: [],
    });
    if (!promotion) return invalid("PROMOTION_NOT_FOUND");
    const effectiveAt = new Date();
    if (promotion.status !== "active") return invalid("PROMOTION_DISABLED");
    if (new Date(promotion.startsAt) > effectiveAt)
      return invalid("PROMOTION_NOT_STARTED");
    if (new Date(promotion.endsAt) <= effectiveAt)
      return invalid("PROMOTION_EXPIRED");
    const context = ruleEvaluationContextSchema.parse({
      marketCode: parsed.marketCode,
      currency: catalog.currency,
      categoryId: parsed.categoryId,
      subtypeId: parsed.subtypeId,
      userType: accountAudience,
      publicationChannel: "web",
      promotionCode: parsed.code,
    });
    if (!isScopeInContext(promotion.scope, context))
      return invalid("PROMOTION_SCOPE_MISMATCH");
    const applicableProductIds = parsed.productIds.filter((id) =>
      promotion.productIds.includes(id),
    );
    if (applicableProductIds.length === 0)
      return invalid("PROMOTION_PRODUCT_MISMATCH");
    const applicableProducts = catalog.products.filter((product) =>
      applicableProductIds.includes(product.id),
    );
    if (
      promotion.verticalIds.length > 0 &&
      applicableProducts.some(
        (product) =>
          !product.commercialProfile.verticalId ||
          !promotion.verticalIds.some((verticalId) =>
            isSameBusinessVertical(
              verticalId,
              product.commercialProfile.verticalId,
            ),
          ),
      )
    ) {
      return invalid("PROMOTION_VERTICAL_MISMATCH");
    }
    const targetFamilies = new Set(
      applicableProducts.map((product) => product.commercialProfile.familyId),
    );
    const subscriptionHistory = await this.repository.listSubscriptions(
      accountId,
      200,
    );
    const hasTargetFamilyHistory = subscriptionHistory.some((subscription) => {
      const product = catalog.products.find(
        (candidate) => candidate.id === subscription.productId,
      );
      return Boolean(
        product && targetFamilies.has(product.commercialProfile.familyId),
      );
    });
    if (promotion.eligibleCustomerType === "new" && hasTargetFamilyHistory) {
      return invalid("PROMOTION_NEW_CUSTOMERS_ONLY");
    }
    if (
      promotion.eligibleCustomerType === "existing" &&
      !hasTargetFamilyHistory
    ) {
      return invalid("PROMOTION_EXISTING_CUSTOMERS_ONLY");
    }
    const [totalRedemptions, accountRedemptions] = await Promise.all([
      this.repository.countPromotionRedemptions(promotion.id),
      this.repository.countPromotionRedemptions(promotion.id, accountId),
    ]);
    if (
      promotion.maximumRedemptions !== undefined &&
      totalRedemptions >= promotion.maximumRedemptions
    ) {
      return invalid("PROMOTION_LIMIT_REACHED");
    }
    if (accountRedemptions >= promotion.maximumRedemptionsPerAccount) {
      return invalid("PROMOTION_ACCOUNT_LIMIT_REACHED");
    }
    return promotionValidationResultSchema.parse({
      valid: true,
      code: promotion.code,
      reasonCode: "PROMOTION_VALID",
      promotionId: promotion.id,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      applicableProductIds,
      endsAt: promotion.endsAt,
    });
  }

  async validatePromotion(
    accountId: string,
    rawRequest: PromotionValidationRequest,
  ) {
    const request = promotionValidationRequestSchema.parse(rawRequest);
    const [catalog, accountAudience] = await Promise.all([
      this.getCatalog(request.marketCode),
      this.repository.getAccountAudience(accountId),
    ]);
    return this.resolvePromotion(accountId, request, catalog, accountAudience);
  }

  async evaluate(rawContext: RuleEvaluationContext) {
    const context = ruleEvaluationContextSchema.parse(rawContext);
    const catalog = await this.getCatalog(context.marketCode);
    return evaluateCommercialRules({
      configurationVersionId: catalog.configurationVersionId,
      rules: catalog.rules,
      context,
    });
  }

  private async resolveAccountPolicy(
    accountId: string,
    rawContext: RuleEvaluationContext,
    observedUsage: number | { total: number; category: number } = 0,
  ) {
    const accountAudience = await this.repository.getAccountAudience(accountId);
    const context = ruleEvaluationContextSchema.parse({
      ...rawContext,
      userType: accountAudience,
      effectiveAt: new Date().toISOString(),
      usageLevel: 0,
    });
    const catalog = await this.getCatalog(context.marketCode);
    const preview = evaluateCommercialRules({
      configurationVersionId: catalog.configurationVersionId,
      rules: catalog.rules,
      context,
      usage: 0,
    });
    const quotaExplanation = preview.explanation.find(
      (entry) => entry.matched && typeof entry.outcome?.quotaLimit === "number",
    );
    const quotaRule = quotaExplanation
      ? catalog.rules.find((rule) => rule.id === quotaExplanation.ruleId)
      : undefined;
    if (!quotaRule || typeof quotaRule.outcome.quotaLimit !== "number") {
      return {
        context,
        catalog,
        result: preview,
        quotaRule: undefined,
        periodStart: undefined,
        periodEnd: undefined,
      };
    }
    const observedMinimum =
      typeof observedUsage === "number"
        ? observedUsage
        : quotaRule.scope.categoryIds.length > 0
          ? observedUsage.category
          : observedUsage.total;
    const periodDays = quotaRule.outcome.quotaPeriodDays || 30;
    const periodMs = periodDays * 24 * 60 * 60 * 1000;
    const periodStart = new Date(Math.floor(Date.now() / periodMs) * periodMs);
    const periodEnd = new Date(periodStart.getTime() + periodMs);
    const storedUsage = await this.repository.getQuotaUsage(
      accountId,
      quotaRule.key,
      context.marketCode,
      periodStart.toISOString(),
    );
    const usage = Math.max(storedUsage, observedMinimum);
    const result = evaluateCommercialRules({
      configurationVersionId: catalog.configurationVersionId,
      rules: catalog.rules,
      context: { ...context, usageLevel: usage },
      usage,
    });
    return {
      context,
      catalog,
      result,
      quotaRule,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      observedMinimum,
    };
  }

  async getAccountEligibility(
    accountId: string,
    rawContext: RuleEvaluationContext,
    observedUsage: number | { total: number; category: number } = 0,
  ) {
    return (
      await this.resolveAccountPolicy(accountId, rawContext, observedUsage)
    ).result;
  }

  async authorizePublication(
    accountId: string,
    rawContext: RuleEvaluationContext,
    observedUsage: number | { total: number; category: number } = 0,
  ) {
    const resolved = await this.resolveAccountPolicy(
      accountId,
      rawContext,
      observedUsage,
    );
    if (!resolved.result.eligible) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le quota de publication applicable est atteint.",
        details: { reasonCode: resolved.result.reasonCode },
      });
    }
    if (
      resolved.quotaRule &&
      resolved.periodStart &&
      resolved.periodEnd &&
      typeof resolved.result.quotaLimit === "number"
    ) {
      try {
        const used = await this.repository.consumeQuota({
          accountId,
          ruleKey: resolved.quotaRule.key,
          marketCode: resolved.context.marketCode,
          periodStart: resolved.periodStart,
          periodEnd: resolved.periodEnd,
          limit: resolved.result.quotaLimit,
          observedMinimum: resolved.observedMinimum,
        });
        return {
          ...resolved.result,
          quotaRemaining: Math.max(0, resolved.result.quotaLimit - used),
        };
      } catch {
        throw new AppError({
          code: "CONFLICT",
          message: "Le quota de publication applicable est atteint.",
          details: { reasonCode: "QUOTA_EXHAUSTED" },
        });
      }
    }
    return resolved.result;
  }

  async getEntitlementQuotaUsage(
    accountId: string,
    input: {
      entitlementKey: string;
      verticalId: string;
      marketCode: string;
    },
  ) {
    const { periodStart, periodEnd } = currentUtcMonth();
    const used = await this.repository.getQuotaUsage(
      accountId,
      entitlementQuotaKey(input.verticalId, input.entitlementKey),
      input.marketCode.toUpperCase(),
      periodStart,
    );
    return { used, periodStart, periodEnd };
  }

  /** Atomically consumes a monthly quota declared by the active plan snapshot. */
  async consumeEntitlementQuota(
    accountId: string,
    input: {
      entitlementKey: string;
      verticalId: string;
      marketCode: string;
      limit: number;
      observedMinimum?: number;
      amount?: number;
    },
  ) {
    const { periodStart, periodEnd } = currentUtcMonth();
    try {
      return await this.repository.consumeQuota({
        accountId,
        ruleKey: entitlementQuotaKey(input.verticalId, input.entitlementKey),
        marketCode: input.marketCode.toUpperCase(),
        periodStart,
        periodEnd,
        limit: input.limit,
        observedMinimum: input.observedMinimum || 0,
        amount: input.amount || 1,
      });
    } catch {
      throw new AppError({
        code: "CONFLICT",
        message: "Le quota mensuel inclus dans le forfait est atteint.",
        details: { reasonCode: "MONTHLY_PUBLICATION_QUOTA_REACHED" },
      });
    }
  }

  async createQuote(
    accountId: string,
    rawRequest: QuoteRequest,
  ): Promise<MonetizationQuote> {
    const request = quoteRequestSchema.parse(rawRequest);
    const existing = await this.repository.getQuoteByIdempotency(
      accountId,
      request.idempotencyKey,
    );
    if (existing) return existing;
    const catalog = await this.getCatalog(request.marketCode);
    const products = request.productIds.map((id) =>
      catalog.products.find((product) => product.id === id),
    );
    if (
      products.some(
        (product) => !product || !isCommercialProductPurchasable(product),
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un produit demandé est indisponible.",
      });
    }
    const selected = products as MonetizationProduct[];
    const organizationScoped = selected.some(
      (product) =>
        product.id === "product.facturation" ||
        product.entitlements.some(
          (entitlement) =>
            entitlement.key.startsWith("invoicing.") ||
            entitlement.key.startsWith("prospecting."),
        ),
    );
    if (organizationScoped && !request.organizationId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une organisation cible est requise pour cette offre.",
      });
    }
    if (
      request.organizationId &&
      !(await this.repository.canManageOrganization(
        accountId,
        request.organizationId,
      ))
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "La gestion des abonnements de cette organisation est requise.",
      });
    }
    const selectedSubscriptions = selected.filter(
      (product) => product.kind === "subscription",
    );
    if (selectedSubscriptions.length > 1) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un seul abonnement peut être activé par devis.",
      });
    }
    const accountAudience = await this.repository.getAccountAudience(accountId);
    const incompatibleAudience = selected.find(
      (product) =>
        !isCommercialAudienceCompatible(product.audience, accountAudience),
    );
    if (incompatibleAudience) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Cette offre ne correspond pas au type de compte.",
      });
    }
    const context = ruleEvaluationContextSchema.parse({
      marketCode: request.marketCode,
      currency: catalog.currency,
      categoryId: request.categoryId,
      subtypeId: request.subtypeId,
      userType: accountAudience,
      publicationChannel: "web",
      promotionCode: request.promotionCode,
    });
    if (selected.some((product) => !isProductInScope(product, context))) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Un produit n’est pas disponible dans ce contexte.",
      });
    }
    const selectedIds = new Set(selected.map((product) => product.id));
    for (const product of selected) {
      if (
        product.compatibility.requiresProductIds.some(
          (id) => !selectedIds.has(id),
        )
      ) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `${product.name} nécessite une autre offre.`,
        });
      }
      if (
        product.compatibility.excludesProductIds.some((id) =>
          selectedIds.has(id),
        )
      ) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `${product.name} est incompatible avec une offre sélectionnée.`,
        });
      }
    }

    const effectiveAt = new Date();
    const promotionValidation = request.promotionCode
      ? await this.resolvePromotion(
          accountId,
          {
            code: request.promotionCode,
            productIds: request.productIds,
            marketCode: request.marketCode,
            categoryId: request.categoryId,
            subtypeId: request.subtypeId,
          },
          catalog,
          accountAudience,
        )
      : undefined;
    if (promotionValidation && !promotionValidation.valid) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce code promotionnel ne peut pas être appliqué.",
        details: { reasonCode: promotionValidation.reasonCode },
      });
    }
    const promotion = promotionValidation?.promotionId
      ? catalog.promotions.find(
          (candidate) => candidate.id === promotionValidation.promotionId,
        )
      : undefined;

    const priorSubscriptions = await this.repository.listSubscriptions(
      accountId,
      200,
    );
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
        new Date(policy.campaignStartsAt) > effectiveAt
      )
        return false;
      if (
        policy.campaignEndsAt &&
        new Date(policy.campaignEndsAt) <= effectiveAt
      )
        return false;
      if (!policy.firstTimeCustomersOnly) return true;
      return !priorSubscriptions.some((subscription) => {
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
      ? new Date(effectiveAt.getTime() + trialDays * 86_400_000).toISOString()
      : undefined;

    const lines: QuoteLine[] = selected.map((product) => {
      const requestedPriceId = request.priceIds?.[product.id];
      const price = product.prices.find(
        (candidate) =>
          (!requestedPriceId || candidate.id === requestedPriceId) &&
          (!candidate.effectiveFrom ||
            new Date(candidate.effectiveFrom) <= effectiveAt) &&
          (!candidate.effectiveUntil ||
            new Date(candidate.effectiveUntil) > effectiveAt),
      );
      if (!price)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `${product.name} n’a pas de prix actif.`,
        });
      const economics = catalog.commercialEconomics.find(
        (entry) =>
          entry.productId === product.id &&
          (!entry.priceId || entry.priceId === price.id),
      );
      if (economics && economics.status !== "disabled") {
        if (
          economics.approvalStatus !== "approved" ||
          economics.directCostAmountMinor === undefined ||
          economics.marginFloorBps === undefined
        ) {
          throw new AppError({
            code: "CONFLICT",
            message:
              "La validation des coûts et de la marge de cette offre est incomplète.",
            details: { reasonCode: "COMMERCIAL_ECONOMICS_NOT_APPROVED" },
          });
        }
        const marginBps =
          price.amount.amountMinor === 0
            ? economics.directCostAmountMinor === 0
              ? 10_000
              : -10_000
            : Math.trunc(
                ((price.amount.amountMinor - economics.directCostAmountMinor) *
                  10_000) /
                  price.amount.amountMinor,
              );
        if (marginBps < economics.marginFloorBps) {
          logger.error("monetization_negative_margin_blocked", {
            configurationVersionId: catalog.configurationVersionId,
            productId: product.id,
            priceId: price.id,
            marginBps,
            marginFloorBps: economics.marginFloorBps,
          });
          throw new AppError({
            code: "CONFLICT",
            message: "Cette offre ne respecte pas son seuil de marge approuvé.",
            details: { reasonCode: "COMMERCIAL_MARGIN_FLOOR_NOT_MET" },
          });
        }
      }
      const subtotalMinor = price.amount.amountMinor;
      const eligibleForPromotion =
        promotion?.productIds.includes(product.id) || false;
      const discountMinor = !eligibleForPromotion
        ? 0
        : promotion!.discountType === "fixed"
          ? Math.min(subtotalMinor, promotion!.discountValue)
          : promotion!.discountType === "introductory_price"
            ? Math.max(0, subtotalMinor - promotion!.discountValue)
            : promotion!.discountType === "free_period"
              ? subtotalMinor
              : Math.min(
                  subtotalMinor,
                  Math.round(
                    (subtotalMinor * promotion!.discountValue) / 10_000,
                  ),
                );
      const taxableMinor = subtotalMinor - discountMinor;
      const taxMinor =
        price.priceIncludesTax || price.taxRateBps === 0
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
        subtotalMinor,
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
    const createdAt = new Date().toISOString();
    const subtotalMinor = lines.reduce(
      (sum, line) => sum + line.subtotalMinor,
      0,
    );
    const discountMinor = lines.reduce(
      (sum, line) => sum + line.discountMinor,
      0,
    );
    const taxMinor = lines.reduce((sum, line) => sum + line.taxMinor, 0);
    const totalMinor = lines.reduce((sum, line) => sum + line.totalMinor, 0);
    const quotePayload = {
      accountId,
      organizationId: request.organizationId,
      configurationVersionId: catalog.configurationVersionId,
      marketCode: request.marketCode,
      currency: catalog.currency,
      listingId: request.listingId,
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
      lines,
      subtotalMinor,
      discountMinor,
      taxMinor,
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
    };
    const quote = monetizationQuoteSchema.parse({
      id: deterministicId("quote", `${accountId}:${request.idempotencyKey}`),
      ...quotePayload,
      snapshotHash: hashSnapshot(quoteHashPayload(quotePayload)),
      reasonCode: trialDays
        ? "TRIAL_ELIGIBLE"
        : promotion
          ? "PROMOTION_APPLIED"
          : "CATALOG_PRICE",
      status: "active",
      createdAt,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    });
    const saved = await this.repository.saveQuote(
      quote,
      request.idempotencyKey,
    );
    logger.info("monetization_quote_created", {
      userId: accountId,
      quoteId: saved.id,
      configurationVersionId: saved.configurationVersionId,
      totalMinor: saved.totalMinor,
      currency: saved.currency,
      promotionCode: saved.promotionCode,
    });
    return saved;
  }

  async createCheckout(
    accountId: string,
    quoteId: string,
    idempotencyKey: string,
    marketCode: string,
  ): Promise<MonetizationOrder> {
    marketCode = requireMarketCode(marketCode);
    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Clé d’idempotence requise.",
      });
    }
    const quote = await this.repository.getQuote(quoteId);
    if (!quote || quote.accountId !== accountId)
      throw new AppError({ code: "NOT_FOUND", message: "Devis introuvable." });
    if (quote.marketCode !== marketCode) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Devis introuvable.",
        details: { reasonCode: "QUOTE_MARKET_CONTEXT_MISMATCH" },
      });
    }
    if (hashSnapshot(quoteHashPayload(quote)) !== quote.snapshotHash) {
      logger.error("monetization_quote_snapshot_mismatch", {
        userId: accountId,
        quoteId: quote.id,
        configurationVersionId: quote.configurationVersionId,
      });
      throw new AppError({
        code: "CONFLICT",
        message: "L’intégrité du devis ne peut pas être vérifiée.",
      });
    }
    const existingOrder = await this.repository.getOrderByQuote(quote.id);
    if (existingOrder) return existingOrder;
    if (quote.status !== "active" || new Date(quote.expiresAt) <= new Date()) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce devis a expiré.",
      });
    }

    const quoteCatalog = await this.repository.getCatalogVersion(
      quote.configurationVersionId,
    );
    if (!quoteCatalog)
      throw new AppError({
        code: "CONFLICT",
        message: "La version tarifaire du devis est indisponible.",
      });
    const recurring = quote.lines.some(
      (line) =>
        quoteCatalog.products.find(
          (candidate) => candidate.id === line.productId,
        )?.kind === "subscription",
    );
    const appliedPromotion = quote.promotionCode
      ? quoteCatalog.promotions.find(
          (promotion) => promotion.code === quote.promotionCode,
        )
      : undefined;
    const provider = config.dataMode === "database" ? "stripe" : "demo";
    if (
      provider === "stripe" &&
      appliedPromotion &&
      !appliedPromotion.providerCouponId
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Cette campagne n’est pas encore synchronisée avec le prestataire de paiement.",
        details: { reasonCode: "PROVIDER_CAMPAIGN_NOT_CONFIGURED" },
      });
    }
    if (provider === "stripe") {
      const environment = config.environment.environment;
      const missingMapping = quote.lines.find(
        (line) =>
          !quoteCatalog.providerMappings.some(
            (mapping) =>
              mapping.provider === "stripe" &&
              mapping.environment === environment &&
              mapping.marketCode === quote.marketCode &&
              mapping.internalReferenceType === "price" &&
              mapping.internalReferenceId === line.priceId &&
              mapping.status === "active" &&
              mapping.synchronizationStatus === "synchronized" &&
              Boolean(mapping.externalReferenceId),
          ),
      );
      if (missingMapping) {
        logger.error("monetization_provider_mapping_mismatch", {
          configurationVersionId: quote.configurationVersionId,
          priceId: missingMapping.priceId,
          marketCode: quote.marketCode,
          environment,
        });
        throw new AppError({
          code: "CONFLICT",
          message:
            "Cette tarification n’est pas synchronisée avec le prestataire de paiement.",
          details: { reasonCode: "PROVIDER_PRICE_MAPPING_NOT_SYNCHRONIZED" },
        });
      }
    }
    let checkout: { id: string; url?: string } = {
      id: deterministicId("checkout", idempotencyKey),
    };
    if (provider === "stripe") {
      checkout = await stripeCheckoutAdapter.createSession({
        idempotencyKey: `checkout:${quote.id}`,
        accountId,
        verticalType: "marketplace",
        marketCode: quote.marketCode,
        returnRoute: "/solutions-pro",
        quoteId: quote.id,
        snapshotHash: quote.snapshotHash,
        lines: quote.lines.map((line) => {
          const product = quoteCatalog.products.find(
            (candidate) => candidate.id === line.productId,
          );
          const period = line.billingPeriod;
          const price = product?.prices.find(
            (candidate) => candidate.id === line.priceId,
          );
          const undiscountedTaxMinor = price?.priceIncludesTax
            ? 0
            : Math.round((line.unitAmountMinor * line.taxRateBps) / 10_000);
          return {
            name: line.label,
            description: `Shongre — ${line.productId}`,
            amountMinor: line.unitAmountMinor + undiscountedTaxMinor,
            currency: quote.currency,
            quantity: line.quantity,
            providerPriceId: quoteCatalog.providerMappings.find(
              (mapping) =>
                mapping.provider === "stripe" &&
                mapping.environment === config.environment.environment &&
                mapping.marketCode === quote.marketCode &&
                mapping.internalReferenceType === "price" &&
                mapping.internalReferenceId === line.priceId &&
                mapping.status === "active" &&
                mapping.synchronizationStatus === "synchronized",
            )?.externalReferenceId,
            recurring:
              product?.kind === "subscription" &&
              (period === "month" || period === "year")
                ? period
                : undefined,
          };
        }),
        mode: recurring ? "subscription" : "payment",
        trial: quote.trial
          ? {
              durationDays: quote.trial.durationDays,
              requiresPaymentMethod: quote.trial.requiresPaymentMethod,
            }
          : undefined,
        providerCouponId: appliedPromotion?.providerCouponId,
      });
    }
    const createdAt = new Date().toISOString();
    return this.repository.saveOrder(
      monetizationOrderSchema.parse({
        id: deterministicId("order", `${accountId}:${quote.id}`),
        quoteId: quote.id,
        accountId,
        organizationId: quote.organizationId,
        configurationVersionId: quote.configurationVersionId,
        marketCode: quote.marketCode,
        snapshotHash: quote.snapshotHash,
        total: {
          amountMinor: quote.amountDueTodayMinor,
          currency: quote.currency,
        },
        status: provider === "demo" ? "paid" : "pending",
        provider,
        providerCheckoutId: checkout.id,
        providerCheckoutUrl: checkout.url,
        createdAt,
        updatedAt: createdAt,
      }),
      idempotencyKey,
    );
  }

  async getAdminOverview(
    marketCode: string,
  ): Promise<MonetizationAdminOverview> {
    marketCode = requireMarketCode(marketCode);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [
      catalog,
      versions,
      orders,
      auditEvents,
      entitlements,
      subscriptions,
      quoteCountToday,
    ] = await Promise.all([
      this.getCatalog(marketCode),
      this.repository.listVersions(marketCode),
      this.repository.listOrders(),
      this.repository.listAuditEvents(),
      this.repository.listEntitlements(undefined, 100),
      this.repository.listSubscriptions(undefined, 100),
      this.repository.countQuotesSince(today.toISOString(), marketCode),
    ]);
    const publishedVersion = versions.find(
      (version) => version.status === "active",
    );
    if (!publishedVersion)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Aucune version publiée.",
      });
    const marketSubscriptions = subscriptions.filter(
      (subscription) => subscription.marketCode === marketCode,
    );
    const marketEntitlements = await this.filterEntitlementsForMarket(
      entitlements,
      marketCode,
    );
    const marketOrders = orders.filter(
      (order) => order.marketCode === marketCode,
    );
    const marketVersionIds = new Set(versions.map((version) => version.id));
    const snapshotHasMarket = (snapshot: unknown) =>
      Boolean(
        snapshot &&
        typeof snapshot === "object" &&
        "marketCode" in snapshot &&
        (snapshot as { marketCode?: unknown }).marketCode === marketCode,
      );
    const marketAuditEvents = auditEvents.filter(
      (event) =>
        marketVersionIds.has(event.entityId) ||
        snapshotHasMarket(event.before) ||
        snapshotHasMarket(event.after),
    );
    return monetizationAdminOverviewSchema.parse({
      publishedVersion,
      versions,
      catalog,
      scheduledChanges: versions.filter(
        (version) => version.status === "scheduled",
      ).length,
      conflictCount: versions.reduce(
        (sum, version) =>
          sum +
          version.conflicts.filter(
            (conflict) => conflict.severity === "blocking",
          ).length,
        0,
      ),
      quoteCountToday,
      activeSubscriptionCount: marketSubscriptions.filter((entry) =>
        ["trialing", "active", "past_due", "cancellation_pending"].includes(
          entry.status,
        ),
      ).length,
      orders: marketOrders,
      entitlements: marketEntitlements,
      payments: [],
      invoices: [],
      refunds: [],
      subscriptions: marketSubscriptions,
      creditBalances: [],
      subscriptionEvents: [],
      auditEvents: marketAuditEvents,
    });
  }

  private async filterEntitlementsForMarket<
    T extends { configurationVersionId?: string },
  >(entitlements: T[], marketCode: string): Promise<T[]> {
    const normalizedMarketCode = requireMarketCode(marketCode);
    const configurationVersionIds = [
      ...new Set(
        entitlements
          .map((entry) => entry.configurationVersionId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const catalogs = await Promise.all(
      configurationVersionIds.map((versionId) =>
        this.repository.getCatalogVersion(versionId),
      ),
    );
    const allowedConfigurationVersionIds = new Set(
      catalogs
        .filter(
          (catalog): catalog is MonetizationCatalog =>
            Boolean(catalog) && catalog?.marketCode === normalizedMarketCode,
        )
        .map((catalog) => catalog.configurationVersionId),
    );
    return entitlements.filter(
      (entry) =>
        Boolean(entry.configurationVersionId) &&
        allowedConfigurationVersionIds.has(entry.configurationVersionId!),
    );
  }

  async getActiveEntitlements(accountId: string, marketCode: string) {
    const entitlements = await this.repository.listEntitlements(accountId, 200);
    const at = Date.now();
    const active = entitlements.filter(
      (entry) =>
        entry.status === "active" &&
        (!entry.endsAt || new Date(entry.endsAt).getTime() > at),
    );
    return this.filterEntitlementsForMarket(active, marketCode);
  }

  async getActiveEntitlementsForOrganization(
    organizationId: string,
    marketCode: string,
  ) {
    const entitlements = await this.repository.listOrganizationEntitlements(
      organizationId,
      200,
    );
    const at = Date.now();
    const active = entitlements.filter(
      (entry) =>
        entry.status === "active" &&
        (!entry.endsAt || new Date(entry.endsAt).getTime() > at),
    );
    return this.filterEntitlementsForMarket(active, marketCode);
  }

  async getSubscriptions(accountId: string, marketCode: string) {
    const normalizedMarketCode = requireMarketCode(marketCode);
    return (await this.repository.listSubscriptions(accountId, 100)).filter(
      (subscription) => subscription.marketCode === normalizedMarketCode,
    );
  }

  private async requireManageableSubscription(
    actorId: string,
    subscriptionId: string,
  ): Promise<MonetizationSubscription> {
    const subscription = await this.repository.getSubscription(subscriptionId);
    if (!subscription) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Abonnement introuvable.",
      });
    }
    if (subscription.accountId === actorId) return subscription;
    if (
      subscription.organizationId &&
      (await this.repository.canManageOrganization(
        actorId,
        subscription.organizationId,
      ))
    ) {
      return subscription;
    }
    throw new AppError({
      code: "NOT_FOUND",
      message: "Abonnement introuvable.",
    });
  }

  async getBillingOverview(
    accountId: string,
    marketCode: string,
  ): Promise<BillingOverview> {
    marketCode = requireMarketCode(marketCode);
    const overview = await this.repository.getBillingOverview(accountId);
    const configurationVersionIds = [
      ...new Set(
        [...overview.entitlements, ...overview.subscriptions]
          .map((entry) => entry.configurationVersionId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const catalogs = (
      await Promise.all(
        configurationVersionIds.map((versionId) =>
          this.repository.getCatalogVersion(versionId),
        ),
      )
    ).filter(
      (catalog): catalog is MonetizationCatalog =>
        Boolean(catalog) && catalog?.marketCode === marketCode,
    );
    const allowedConfigurationVersionIds = new Set(
      catalogs.map((catalog) => catalog.configurationVersionId),
    );
    const subscriptions = overview.subscriptions.filter(
      (subscription) => subscription.marketCode === marketCode,
    );
    const hasAmbiguousUsage = overview.subscriptions.some(
      (subscription) => subscription.marketCode !== marketCode,
    );
    const subscriptionIds = new Set(
      subscriptions.map((subscription) => subscription.id),
    );
    const entitlements = overview.entitlements.filter(
      (entitlement) =>
        Boolean(entitlement.configurationVersionId) &&
        allowedConfigurationVersionIds.has(entitlement.configurationVersionId!),
    );
    const orderIds = new Set([
      ...subscriptions.map((subscription) => subscription.sourceOrderId),
      ...entitlements
        .map((entitlement) => entitlement.sourceOrderId)
        .filter((value): value is string => Boolean(value)),
      ...overview.orders
        .filter((order) => order.marketCode === marketCode)
        .map((order) => order.id),
    ]);
    const orders = overview.orders.filter((order) => orderIds.has(order.id));
    const invoices = overview.invoices.filter(
      (invoice) =>
        invoice.marketCode === marketCode ||
        (invoice.orderId ? orderIds.has(invoice.orderId) : false) ||
        (invoice.subscriptionId
          ? subscriptionIds.has(invoice.subscriptionId)
          : false),
    );
    const payments = overview.payments.filter((payment) =>
      orderIds.has(payment.orderId),
    );
    const paymentIds = new Set(payments.map((payment) => payment.id));
    const entitlementUsageKeys = new Set(
      entitlements.map(
        (entitlement) =>
          `${entitlement.verticalId || "general"}:${entitlement.key}`,
      ),
    );
    const creditBalances = overview.creditBalances
      .map((balance) => {
        const transactions = balance.transactions.filter(
          (transaction) =>
            (transaction.sourceType === "subscription" &&
              Boolean(transaction.sourceId) &&
              subscriptionIds.has(transaction.sourceId!)) ||
            (transaction.sourceType === "purchase" &&
              Boolean(transaction.sourceId) &&
              orderIds.has(transaction.sourceId!)),
        );
        const hasUnscopedTransactions = balance.transactions.some(
          (transaction) => !transactions.includes(transaction),
        );
        if (hasUnscopedTransactions) return undefined;
        return {
          ...balance,
          available: transactions.reduce(
            (total, transaction) => total + transaction.quantity,
            0,
          ),
          transactions,
        };
      })
      .filter((balance): balance is NonNullable<typeof balance> =>
        Boolean(balance),
      )
      .filter((balance) => balance.transactions.length > 0);
    const effectiveEntitlements = catalogs.flatMap((catalog) =>
      resolveAllEffectiveEntitlements({
        catalog,
        entitlements: entitlements.filter(
          (entry) =>
            entry.configurationVersionId === catalog.configurationVersionId,
        ),
      }),
    );
    return billingOverviewSchema.parse({
      ...overview,
      currentSubscription: subscriptions.find((subscription) =>
        ["trialing", "active", "past_due", "cancellation_pending"].includes(
          subscription.status,
        ),
      ),
      subscriptions,
      entitlements,
      usage: hasAmbiguousUsage
        ? []
        : overview.usage.filter((usage) =>
            entitlementUsageKeys.has(
              `${usage.verticalId || "general"}:${usage.key}`,
            ),
          ),
      orders,
      payments,
      invoices,
      refunds: overview.refunds.filter(
        (refund) =>
          orderIds.has(refund.orderId) && paymentIds.has(refund.paymentId),
      ),
      creditBalances,
      subscriptionEvents: overview.subscriptionEvents.filter((event) =>
        subscriptionIds.has(event.subscriptionId),
      ),
      effectiveEntitlements,
    });
  }

  async getInvoiceDocument(
    accountId: string,
    invoiceId: string,
    marketCode: string,
  ) {
    const billing = await this.getBillingOverview(accountId, marketCode);
    const invoice = billing.invoices.find((entry) => entry.id === invoiceId);
    if (!invoice) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Facture introuvable.",
      });
    }
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
    const customerName = escape(
      billing.customer?.legalName || billing.customer?.email || accountId,
    );
    return {
      fileName: `${invoice.number}.html`,
      mimeType: "text/html;charset=utf-8",
      content: `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escape(invoice.number)}</title><style>body{font-family:Arial,sans-serif;color:#1c1917;max-width:760px;margin:48px auto;padding:0 24px}header,section{display:flex;justify-content:space-between;gap:32px;margin-bottom:40px}h1{font-size:28px;margin:0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #e7e5e4}.number{text-align:right}.total{font-weight:700;font-size:18px}small{color:#78716c}</style><body><header><div><h1>SHONGRE.</h1><small>Facture</small></div><div><strong>${escape(invoice.number)}</strong><br>${new Date(invoice.issuedAt).toLocaleDateString("fr-FR")}</div></header><section><div><strong>Facturé à</strong><br>${customerName}</div><div><strong>Émetteur</strong><br>Shongre SAS<br>France</div></section><table><tbody><tr><td>Services Shongre</td><td class="number">${format(invoice.subtotal.amountMinor)}</td></tr><tr><td>Remise</td><td class="number">− ${format(invoice.discount.amountMinor)}</td></tr><tr><td>TVA</td><td class="number">${format(invoice.tax.amountMinor)}</td></tr><tr class="total"><td>Total TTC</td><td class="number">${format(invoice.total.amountMinor)}</td></tr></tbody></table><p><small>Statut : ${escape(invoice.status)}.</small></p></body></html>`,
    };
  }

  async previewSubscriptionChange(
    accountId: string,
    rawRequest: SubscriptionChangeRequest,
    marketCode: string,
  ): Promise<SubscriptionChangePreview> {
    marketCode = requireMarketCode(marketCode);
    const request = subscriptionChangeRequestSchema.parse(rawRequest);
    const subscription = await this.requireManageableSubscription(
      accountId,
      request.subscriptionId,
    );
    if (subscription.marketCode !== marketCode) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Abonnement introuvable.",
      });
    }
    if (
      request.expectedSubscriptionUpdatedAt &&
      request.expectedSubscriptionUpdatedAt !== subscription.updatedAt
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cet abonnement a été modifié. Actualisez avant de réessayer.",
        details: { reasonCode: "STALE_SUBSCRIPTION_STATE" },
      });
    }
    if (
      !subscription.configurationVersionId ||
      !subscription.marketCode ||
      !subscription.currency
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "La preuve tarifaire de cet abonnement est incomplète.",
        details: { reasonCode: "SUBSCRIPTION_CATALOG_EVIDENCE_MISSING" },
      });
    }
    const [currentCatalog, targetCatalog] = await Promise.all([
      this.repository.getCatalogVersion(subscription.configurationVersionId),
      this.getCatalog(subscription.marketCode),
    ]);
    if (
      !currentCatalog ||
      currentCatalog.marketCode !== subscription.marketCode ||
      currentCatalog.currency !== subscription.currency ||
      targetCatalog.marketCode !== subscription.marketCode ||
      targetCatalog.currency !== subscription.currency ||
      targetCatalog.stale
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "La configuration commerciale du marché est indisponible.",
        details: { reasonCode: "SUBSCRIPTION_MARKET_CONTEXT_MISMATCH" },
      });
    }
    const currentProduct = currentCatalog.products.find(
      (entry) => entry.id === subscription.productId,
    );
    const targetProduct = targetCatalog.products.find(
      (entry) => entry.id === request.targetProductId,
    );
    const currentPrice =
      currentProduct?.prices.find(
        (entry) => entry.id === subscription.priceId,
      ) ||
      currentProduct?.prices.find(
        (entry) => entry.billingPeriod === subscription.billingPeriod,
      );
    const targetPrice = targetProduct?.prices.find(
      (entry) =>
        entry.id === request.targetPriceId &&
        (!entry.effectiveFrom || new Date(entry.effectiveFrom) <= new Date()) &&
        (!entry.effectiveUntil || new Date(entry.effectiveUntil) > new Date()),
    );
    if (
      !currentProduct ||
      !targetProduct ||
      targetProduct.kind !== "subscription" ||
      !isCommercialProductPurchasable(targetProduct) ||
      !targetPrice ||
      targetPrice.amount.currency !== currentPrice?.amount.currency
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le forfait cible n’est pas disponible.",
      });
    }
    const policy = targetCatalog.subscriptionPolicy;
    const sameProduct = targetProduct.id === currentProduct.id;
    const isConfiguredUpgrade =
      currentProduct.commercialProfile.upgradeProductIds.includes(
        targetProduct.id,
      );
    const isConfiguredDowngrade =
      currentProduct.commercialProfile.downgradeProductIds.includes(
        targetProduct.id,
      );
    if (!sameProduct && !isConfiguredUpgrade && !isConfiguredDowngrade) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette transition de forfait n’est pas autorisée.",
        details: { reasonCode: "PLAN_TRANSITION_NOT_ALLOWED" },
      });
    }
    const currentMinor = currentPrice?.amount.amountMinor || 0;
    const intervalChanged =
      currentPrice?.billingPeriod !== targetPrice.billingPeriod;
    const isUpgrade = isConfiguredUpgrade && !intervalChanged;
    if (
      (isConfiguredUpgrade &&
        !intervalChanged &&
        policy.immediateUpgrade !== "allowed") ||
      (isConfiguredDowngrade && policy.downgradeTiming !== "period_end") ||
      (sameProduct && policy.samePlanRenewalTiming !== "period_end") ||
      (intervalChanged && policy.billingIntervalChangeTiming !== "period_end")
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "La politique de changement de forfait n’est pas configurée.",
        details: { reasonCode: "SUBSCRIPTION_TRANSITION_POLICY_MISSING" },
      });
    }
    const periodStart = new Date(subscription.currentPeriodStart).getTime();
    const periodEnd = new Date(subscription.currentPeriodEnd).getTime();
    const remainingRatio = Math.max(
      0,
      Math.min(
        1,
        (periodEnd - Date.now()) / Math.max(1, periodEnd - periodStart),
      ),
    );
    if (
      isUpgrade &&
      !["linear_remaining_time", "none"].includes(policy.upgradeProration)
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "La règle de prorata de ce changement n’est pas disponible.",
        details: { reasonCode: "SUBSCRIPTION_PRORATION_POLICY_MISSING" },
      });
    }
    const prorationMinor =
      isUpgrade && policy.upgradeProration === "linear_remaining_time"
        ? Math.max(
            0,
            Math.round(
              (targetPrice.amount.amountMinor - currentMinor) * remainingRatio,
            ),
          )
        : 0;
    const taxMinor = Math.round(
      (prorationMinor * targetPrice.taxRateBps) / 10_000,
    );
    const nextTaxMinor = Math.round(
      (targetPrice.amount.amountMinor * targetPrice.taxRateBps) / 10_000,
    );
    return subscriptionChangePreviewSchema.parse({
      subscriptionId: subscription.id,
      targetProductId: targetProduct.id,
      targetPriceId: targetPrice.id,
      targetProductVersionId: targetProduct.versionId,
      targetConfigurationVersionId: targetCatalog.configurationVersionId,
      policyId: policy.id,
      requiresProviderConfirmation: Boolean(
        subscription.providerSubscriptionId,
      ),
      effectiveAt: isUpgrade ? "immediately" : "period_end",
      proration: {
        amountMinor: prorationMinor,
        currency: targetPrice.amount.currency,
      },
      tax: {
        amountMinor: taxMinor,
        currency: targetPrice.amount.currency,
      },
      totalDueNow: {
        amountMinor: prorationMinor + taxMinor,
        currency: targetPrice.amount.currency,
      },
      nextPeriodTotal: {
        amountMinor: targetPrice.amount.amountMinor + nextTaxMinor,
        currency: targetPrice.amount.currency,
      },
      nextBillingAt: subscription.currentPeriodEnd,
    });
  }

  async applySubscriptionChange(
    accountId: string,
    rawRequest: SubscriptionChangeRequest,
    marketCode: string,
  ) {
    marketCode = requireMarketCode(marketCode);
    const request = subscriptionChangeRequestSchema.parse(rawRequest);
    const subscription = await this.requireManageableSubscription(
      accountId,
      request.subscriptionId,
    );
    if (subscription.marketCode !== marketCode) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Abonnement introuvable.",
      });
    }
    const existing = await this.repository.getSubscriptionChangeResult(
      subscription.id,
      request.idempotencyKey,
    );
    if (existing) return existing;
    const preview = await this.previewSubscriptionChange(
      accountId,
      request,
      marketCode,
    );
    if (config.dataMode === "database") {
      if (subscription?.providerSubscriptionId) {
        const catalog = await this.repository.getCatalogVersion(
          preview.targetConfigurationVersionId,
        );
        if (
          catalog?.subscriptionPolicy.providerPlanChange === "not_configured"
        ) {
          throw new AppError({
            code: "CONFLICT",
            message:
              "Le changement de forfait est indisponible tant que le prix prestataire n’est pas synchronisé.",
            details: { reasonCode: "PROVIDER_PLAN_CHANGE_NOT_CONFIGURED" },
          });
        }
        throw new AppError({
          code: "CONFLICT",
          message:
            "Le changement de forfait doit être confirmé via le parcours de paiement sécurisé.",
        });
      }
    }
    const updated = await this.repository.applySubscriptionChange(
      accountId,
      request,
      preview,
    );
    logger.info("monetization_subscription_change_applied", {
      userId: accountId,
      subscriptionId: request.subscriptionId,
      targetProductId: request.targetProductId,
      effectiveAt: preview.effectiveAt,
    });
    return updated;
  }

  async updateSubscriptionCancellation(
    accountId: string,
    rawRequest: SubscriptionCancellationRequest,
    marketCode: string,
  ) {
    marketCode = requireMarketCode(marketCode);
    const request = subscriptionCancellationRequestSchema.parse(rawRequest);
    const subscription = await this.requireManageableSubscription(
      accountId,
      request.subscriptionId,
    );
    if (subscription.marketCode !== marketCode) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Abonnement introuvable.",
      });
    }
    const catalog = subscription.configurationVersionId
      ? await this.repository.getCatalogVersion(
          subscription.configurationVersionId,
        )
      : null;
    if (
      !catalog ||
      catalog.subscriptionPolicy.cancellationTiming !== "period_end"
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "La politique d’annulation de cet abonnement est indisponible.",
        details: { reasonCode: "SUBSCRIPTION_CANCELLATION_POLICY_MISSING" },
      });
    }
    if (config.dataMode === "database") {
      if (!subscription.providerSubscriptionId) {
        throw new AppError({
          code: "CONFLICT",
          message: "Référence prestataire manquante pour cet abonnement.",
        });
      }
      await stripeCheckoutAdapter.updateSubscriptionCancellation({
        providerSubscriptionId: subscription.providerSubscriptionId,
        cancelAtPeriodEnd: request.cancelAtPeriodEnd,
        idempotencyKey: deterministicId(
          "subscription-change",
          `${subscription.id}:${request.cancelAtPeriodEnd}:${subscription.updatedAt}`,
        ),
      });
    }
    const updated = await this.repository.updateSubscriptionCancellation(
      subscription.id,
      accountId,
      request.cancelAtPeriodEnd,
    );
    logger.info("monetization_subscription_cancellation_updated", {
      userId: accountId,
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: request.cancelAtPeriodEnd,
    });
    return updated;
  }

  async activateScheduledConfigurations() {
    const activated = await this.repository.activateDueVersions();
    if (activated > 0) {
      this.cache.clear();
      logger.info("commercial_schedules_activated", { activated });
    }
    return activated;
  }

  async requestComplimentaryGrant(
    actorId: string,
    input: {
      accountId: string;
      productVersionId: string;
      campaignId?: string;
      reason: string;
      startsAt: string;
      endsAt: string;
      idempotencyKey: string;
    },
  ) {
    const parsedInput = complimentaryGrantRequestInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Demande de forfait offert incomplète.",
      });
    }
    input = parsedInput.data;
    if (config.dataMode !== "database") {
      return {
        id: deterministicId(
          "complimentary-request",
          `${actorId}:${input.idempotencyKey}`,
        ),
        status: "pending_approval" as const,
        requestedBy: actorId,
        ...input,
      };
    }
    const client = getSupabaseAdminClient() as any;
    const { data, error } = await client.rpc("request_complimentary_plan", {
      p_account_id: input.accountId,
      p_product_version_id: input.productVersionId,
      p_campaign_id: input.campaignId || null,
      p_reason: input.reason.trim(),
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_requested_by: actorId,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) throw error;
    return { id: String(data), status: "pending_approval" as const };
  }

  async decideComplimentaryGrant(
    actorId: string,
    requestId: string,
    input: {
      decision: "approved" | "rejected";
      reason: string;
      idempotencyKey: string;
    },
  ) {
    const parsedInput = complimentaryGrantDecisionInputSchema.safeParse(input);
    if (!requestId || !parsedInput.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Décision de forfait offert incomplète.",
      });
    }
    input = parsedInput.data;
    if (config.dataMode !== "database") {
      return {
        requestId,
        decision: input.decision,
        decidedBy: actorId,
        grantId:
          input.decision === "approved"
            ? deterministicId("complimentary-grant", requestId)
            : undefined,
      };
    }
    const client = getSupabaseAdminClient() as any;
    const { data, error } = await client.rpc(
      "decide_complimentary_plan_request",
      {
        p_request_id: requestId,
        p_decision: input.decision,
        p_reason: input.reason.trim(),
        p_decided_by: actorId,
        p_idempotency_key: input.idempotencyKey,
      },
    );
    if (error) throw error;
    return {
      requestId,
      decision: input.decision,
      grantId: data ? String(data) : undefined,
    };
  }

  async handleStripeWebhook(event: any, rawBody: string) {
    if (config.dataMode !== "database")
      return { processed: false, reason: "demo_mode" };
    const eventId = String(event?.id || "");
    let eventType = String(event?.type || "");
    const object = event?.data?.object || {};
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    if (
      eventType.startsWith("invoice.") ||
      eventType.startsWith("customer.subscription.")
    ) {
      const subscriptionId = String(
        (eventType.startsWith("customer.subscription.")
          ? object.id
          : undefined) ||
          object.subscription ||
          object.parent?.subscription_details?.subscription ||
          object.lines?.data?.[0]?.parent?.subscription_item_details
            ?.subscription ||
          "",
      );
      if (!eventId || !subscriptionId) {
        return {
          processed: false,
          reason: "subscription_reference_missing",
          eventId,
        };
      }
      const period = object.lines?.data?.[0]?.period || {};
      const isoFromUnix = (value: unknown) =>
        typeof value === "number" && Number.isFinite(value)
          ? new Date(value * 1000).toISOString()
          : null;
      const client = getSupabaseAdminClient() as any;
      const { data, error } = await client.rpc(
        "process_monetization_stripe_subscription_event",
        {
          p_provider_event_id: eventId,
          p_event_type: eventType,
          p_payload_hash: payloadHash,
          p_subscription_id: subscriptionId,
          p_provider_status: object.status ? String(object.status) : null,
          p_period_start: isoFromUnix(
            object.current_period_start ?? period.start,
          ),
          p_period_end: isoFromUnix(object.current_period_end ?? period.end),
          p_cancel_at_period_end:
            typeof object.cancel_at_period_end === "boolean"
              ? object.cancel_at_period_end
              : null,
        },
      );
      if (error) throw error;
      logger.info("monetization_subscription_event_processed", {
        providerEventId: eventId,
        eventType,
        subscriptionId,
        processed: Boolean(data),
      });
      return { processed: Boolean(data), eventId };
    }
    const checkoutId = String(object.id || "");
    if (!eventId || !eventType || !checkoutId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Événement de paiement incomplet.",
      });
    }
    if (
      eventType === "checkout.session.completed" &&
      !["paid", "no_payment"].includes(String(object.payment_status || ""))
    ) {
      eventType = "checkout.session.payment_pending";
    }
    const client = getSupabaseAdminClient() as any;
    const { data, error } = await client.rpc(
      "process_monetization_stripe_event",
      {
        p_provider_event_id: eventId,
        p_event_type: eventType,
        p_payload_hash: payloadHash,
        p_checkout_id: checkoutId,
        p_payment_id: object.payment_intent
          ? String(object.payment_intent)
          : null,
        p_invoice_id: object.invoice ? String(object.invoice) : null,
        p_snapshot_hash: object.metadata?.snapshot_hash || null,
        p_subscription_id: object.subscription
          ? String(object.subscription)
          : null,
      },
    );
    if (error) throw error;
    logger.info("monetization_payment_event_processed", {
      providerEventId: eventId,
      eventType,
      checkoutId,
      processed: Boolean(data),
    });
    return { processed: Boolean(data), eventId };
  }

  async createDraft(
    actorId: string,
    rawPatch: CommercialDraftPatch,
  ): Promise<CommercialConfigurationVersion> {
    const patch = commercialDraftPatchSchema.parse(rawPatch);
    const marketCode = requireMarketCode(patch.marketCode);
    const current = await this.getCatalog(marketCode);
    const versions = await this.repository.listVersions(marketCode);
    const versionNumber =
      Math.max(...versions.map((version) => version.versionNumber), 0) + 1;
    const id = `commercial-${marketCode.toLowerCase()}-v${versionNumber}`;
    const createdAt = new Date().toISOString();
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
      status: product.status === "active" ? ("draft" as const) : product.status,
    }));
    const catalog = monetizationCatalogSchema.parse({
      ...current,
      configurationVersionId: id,
      versionNumber,
      generatedAt: createdAt,
      marketCode,
      verticals: structuredClone(patch.verticals || current.verticals),
      products,
      rules: (patch.rules || current.rules).map((rule) => ({
        ...rule,
        versionId: id,
        status: rule.status === "active" ? "draft" : rule.status,
      })),
      commissionPolicies: (
        patch.commissionPolicies || current.commissionPolicies
      ).map((policy) => ({
        ...policy,
        versionId: id,
        versionNumber,
        status: policy.status === "active" ? "draft" : policy.status,
        rules: policy.rules.map((rule) => ({
          ...rule,
          policyId: policy.id,
          versionId: id,
        })),
      })),
      promotions: (patch.promotions || current.promotions).map((promotion) => ({
        ...promotion,
        id: `${id}:${promotion.code.toLowerCase()}`,
        status: promotion.status === "active" ? "draft" : promotion.status,
      })),
      migrationMappings: structuredClone(
        patch.migrationMappings || current.migrationMappings,
      ),
      priceProtectionPolicies: (
        patch.priceProtectionPolicies || current.priceProtectionPolicies
      ).map((policy) => ({
        ...structuredClone(policy),
        status: policy.status === "active" ? "draft" : policy.status,
      })),
      campaigns: (patch.campaigns || current.campaigns).map((campaign) => ({
        ...structuredClone(campaign),
        status: campaign.status === "active" ? "draft" : campaign.status,
      })),
      commercialEconomics: (
        patch.commercialEconomics || current.commercialEconomics
      ).map((economics) => ({
        ...structuredClone(economics),
        priceId: economics.priceId
          ? priceIdMap.get(economics.priceId) || economics.priceId
          : undefined,
        status: economics.status === "active" ? "draft" : economics.status,
      })),
      providerMappings: (
        patch.providerMappings || current.providerMappings
      ).map((mapping) => ({
        ...structuredClone(mapping),
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
          : mapping.status === "active"
            ? "draft"
            : mapping.status,
      })),
      subscriptionPolicy: structuredClone(
        patch.subscriptionPolicy || current.subscriptionPolicy,
      ),
      paidPlacementPolicies: (
        patch.paidPlacementPolicies || current.paidPlacementPolicies
      ).map((policy) => ({
        ...structuredClone(policy),
        status: policy.status === "active" ? "draft" : policy.status,
      })),
      offerDefinitions: (
        patch.offerDefinitions || current.offerDefinitions
      ).map((offer) => ({
        ...structuredClone(offer),
        status: offer.status === "active" ? "draft" : offer.status,
      })),
      stale: false,
    });
    for (const protectedRule of current.rules.filter(
      (rule) => rule.mandatory,
    )) {
      const candidate = catalog.rules.find(
        (rule) => rule.key === protectedRule.key,
      );
      const invariant = (rule: typeof protectedRule) => ({
        key: rule.key,
        mandatory: rule.mandatory,
        scope: rule.scope,
        conditions: rule.conditions,
        outcome: rule.outcome,
      });
      if (
        !candidate ||
        JSON.stringify(invariant(candidate)) !==
          JSON.stringify(invariant(protectedRule))
      ) {
        throw new AppError({
          code: "FORBIDDEN",
          message: `La règle de conformité ${protectedRule.key} est protégée par le code.`,
        });
      }
    }
    const conflicts = validateCommercialConfiguration(catalog);
    const version: CommercialConfigurationVersion = {
      id,
      setId: "commercial-core",
      versionNumber,
      marketCode,
      status: "draft",
      reason: patch.reason,
      effectiveFrom: patch.effectiveFrom,
      createdBy: actorId,
      createdAt,
      productCount: catalog.products.length,
      ruleCount:
        catalog.rules.length +
        catalog.commissionPolicies.reduce(
          (count, policy) => count + policy.rules.length,
          0,
        ),
      conflicts,
    };
    await this.repository.saveVersion(version, catalog);
    await this.audit(
      actorId,
      "draft.created",
      "configuration_version",
      id,
      patch.reason,
      undefined,
      catalog,
    );
    return version;
  }

  async transitionVersion(input: {
    versionId: string;
    action: "submit" | "approve" | "publish" | "rollback";
    actorId: string;
    reason: string;
  }) {
    const parsedReason = commercialChangeReasonSchema.safeParse(input.reason);
    if (!parsedReason.success)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Motif détaillé requis.",
      });
    input.reason = parsedReason.data;
    const catalog = await this.repository.getCatalogVersion(input.versionId);
    if (!catalog)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Version introuvable.",
      });
    const versions = await this.repository.listVersions(catalog.marketCode);
    const version = versions.find(
      (candidate) => candidate.id === input.versionId,
    );
    if (!version)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Version introuvable.",
      });
    version.conflicts = validateCommercialConfiguration(catalog);
    if (
      ["submit", "approve", "publish"].includes(input.action) &&
      version.conflicts.some((conflict) => conflict.severity === "blocking")
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "La version contient des conflits bloquants à corriger avant publication.",
        details: { conflicts: version.conflicts },
      });
    }
    const before = structuredClone(version);
    if (input.action === "submit" && version.status === "draft")
      version.status = "pending_approval";
    else if (
      input.action === "approve" &&
      version.status === "pending_approval"
    ) {
      if (version.createdBy === input.actorId)
        throw new AppError({
          code: "FORBIDDEN",
          message: "Le créateur ne peut pas approuver sa propre version.",
        });
      version.status = "approved";
      version.approvedBy = input.actorId;
    } else if (input.action === "publish" && version.status === "approved") {
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
    } else if (
      input.action === "rollback" &&
      ["archived", "disabled"].includes(version.status)
    ) {
      const versionNumber =
        Math.max(...versions.map((candidate) => candidate.versionNumber), 0) +
        1;
      const rollbackSource = normalizeEducationMonetizationCatalog(catalog);
      const rollbackId = `commercial-${catalog.marketCode.toLowerCase()}-v${versionNumber}`;
      const createdAt = new Date().toISOString();
      const rollbackPriceIdMap = new Map<string, string>();
      const rollbackProducts = rollbackSource.products.map((product) => ({
        ...product,
        versionId: `${rollbackId}:${product.id}`,
        prices: product.prices.map((price, index) => {
          const nextId = `${rollbackId}:${product.id}:${price.billingPeriod}:${index + 1}`;
          rollbackPriceIdMap.set(price.id, nextId);
          return { ...price, providerPriceId: undefined, id: nextId };
        }),
        status:
          product.status === "disabled"
            ? ("disabled" as const)
            : ("draft" as const),
      }));
      const rollbackCatalog = monetizationCatalogSchema.parse({
        ...rollbackSource,
        configurationVersionId: rollbackId,
        versionNumber,
        generatedAt: createdAt,
        products: rollbackProducts,
        rules: rollbackSource.rules.map((rule) => ({
          ...rule,
          versionId: rollbackId,
          status: rule.status === "disabled" ? "disabled" : "draft",
        })),
        commissionPolicies: rollbackSource.commissionPolicies.map((policy) => ({
          ...policy,
          versionId: rollbackId,
          versionNumber,
          status: policy.status === "disabled" ? "disabled" : "draft",
          rules: policy.rules.map((rule) => ({
            ...rule,
            policyId: policy.id,
            versionId: rollbackId,
          })),
        })),
        promotions: rollbackSource.promotions.map((promotion) => ({
          ...promotion,
          id: `${rollbackId}:${promotion.code.toLowerCase()}`,
          status: promotion.status === "disabled" ? "disabled" : "draft",
        })),
        priceProtectionPolicies: rollbackSource.priceProtectionPolicies.map(
          (policy) => ({
            ...policy,
            status: policy.status === "disabled" ? "disabled" : "draft",
          }),
        ),
        campaigns: rollbackSource.campaigns.map((campaign) => ({
          ...campaign,
          status: campaign.status === "disabled" ? "disabled" : "draft",
        })),
        commercialEconomics: rollbackSource.commercialEconomics.map(
          (economics) => ({
            ...economics,
            priceId: economics.priceId
              ? rollbackPriceIdMap.get(economics.priceId) || economics.priceId
              : undefined,
            status: economics.status === "disabled" ? "disabled" : "draft",
          }),
        ),
        providerMappings: rollbackSource.providerMappings.map((mapping) => ({
          ...mapping,
          internalReferenceId:
            mapping.internalReferenceType === "price"
              ? rollbackPriceIdMap.get(mapping.internalReferenceId) ||
                mapping.internalReferenceId
              : mapping.internalReferenceId,
          externalReferenceId: undefined,
          synchronizationStatus:
            mapping.status === "disabled" ? "disabled" : "missing",
          lastVerifiedAt: undefined,
          evidenceReference: undefined,
          status: mapping.status === "disabled" ? "disabled" : "draft",
        })),
        paidPlacementPolicies: rollbackSource.paidPlacementPolicies.map(
          (policy) => ({
            ...policy,
            status: policy.status === "disabled" ? "disabled" : "draft",
          }),
        ),
        offerDefinitions: rollbackSource.offerDefinitions.map((offer) => ({
          ...offer,
          status: offer.status === "disabled" ? "disabled" : "draft",
        })),
        stale: false,
      });
      const rollbackVersion: CommercialConfigurationVersion = {
        id: rollbackId,
        setId: version.setId,
        versionNumber,
        marketCode: catalog.marketCode,
        status: "draft",
        reason: input.reason,
        createdBy: input.actorId,
        createdAt,
        productCount: rollbackCatalog.products.length,
        ruleCount:
          rollbackCatalog.rules.length +
          rollbackCatalog.commissionPolicies.reduce(
            (count, policy) => count + policy.rules.length,
            0,
          ),
        conflicts: [],
      };
      await this.repository.saveVersion(rollbackVersion, rollbackCatalog);
      await this.audit(
        input.actorId,
        "version.rollback_prepared",
        "configuration_version",
        rollbackId,
        input.reason,
        version,
        rollbackVersion,
      );
      return rollbackVersion;
    } else {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Transition de version invalide.",
      });
    }
    version.reason = input.reason;
    await this.repository.saveVersion(version, catalog);
    if (input.action === "publish") {
      await this.repository.publishVersion(
        version.id,
        input.actorId,
        input.reason,
      );
      this.cache.delete(catalog.marketCode);
      const published = (
        await this.repository.listVersions(catalog.marketCode)
      ).find((candidate) => candidate.id === version.id);
      if (!published)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Version publiée introuvable.",
        });
      await this.audit(
        input.actorId,
        "version.publish",
        "configuration_version",
        published.id,
        input.reason,
        before,
        published,
        published.approvedBy,
      );
      return published;
    }
    await this.audit(
      input.actorId,
      `version.${input.action}`,
      "configuration_version",
      version.id,
      input.reason,
      before,
      version,
      version.approvedBy,
    );
    return version;
  }

  private async audit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    reason: string,
    before?: unknown,
    after?: unknown,
    approvalActorId?: string,
  ) {
    const event: CommercialAuditEvent = {
      id: randomUUID(),
      actorId,
      actorName: actorId,
      action,
      entityType,
      entityId,
      reason,
      before,
      after,
      approvalActorId,
      requestId: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.repository.appendAudit(event);
  }
}

export const businessRulesService = new BusinessRulesService();
