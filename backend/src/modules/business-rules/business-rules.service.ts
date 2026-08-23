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
} from "@shongre/contracts/monetization";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
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
import { validateCommercialConfiguration } from "./configuration-validator.js";
import { evaluateCommercialRules } from "./rule-evaluator.js";

const CACHE_TTL_MS = 60_000;
const QUOTE_TTL_MS = 30 * 60_000;

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
    | "lines"
  >,
) {
  return {
    accountId: quote.accountId,
    configurationVersionId: quote.configurationVersionId,
    marketCode: quote.marketCode,
    currency: quote.currency,
    listingId: quote.listingId,
    promotionCode: quote.promotionCode,
    lines: quote.lines,
  };
}

function isScopeInContext(
  scope: MonetizationProduct["scope"],
  context: RuleEvaluationContext,
) {
  const dimensions: Array<[string[], string | undefined]> = [
    [scope.marketCodes, context.marketCode],
    [scope.currencies, context.currency],
    [scope.categoryIds, context.categoryId],
    [scope.subtypeIds, context.subtypeId],
    [scope.audiences, context.userType],
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
    marketCode = "FR",
    options: { includeDrafts?: boolean } = {},
  ) {
    const cached = this.cache.get(marketCode);
    if (!options.includeDrafts && cached && cached.expiresAt > Date.now())
      return cached.catalog;
    try {
      const loaded = await this.repository.getActiveCatalog(marketCode);
      if (!loaded)
        throw new Error(`No active commercial version for ${marketCode}`);
      const catalog = monetizationCatalogSchema.parse(loaded);
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
        fallback: lastValid
          ? "last_known_valid"
          : marketCode === "FR"
            ? "signed_baseline"
            : "none",
      });
      if (lastValid) return { ...lastValid, stale: true };
      if (marketCode === "FR")
        return { ...BASELINE_MONETIZATION_CATALOG, stale: true };
      throw new AppError({
        code: "NOT_FOUND",
        message: "Configuration commerciale indisponible.",
      });
    }
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
    if (products.some((product) => !product || product.status !== "active")) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un produit demandé est indisponible.",
      });
    }
    const selected = products as MonetizationProduct[];
    const accountAudience = await this.repository.getAccountAudience(accountId);
    const incompatibleAudience = selected.find(
      (product) =>
        product.audience !== "all" && product.audience !== accountAudience,
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
      const subtotalMinor = price.amount.amountMinor;
      const eligibleForPromotion =
        promotion?.productIds.includes(product.id) || false;
      const discountMinor = !eligibleForPromotion
        ? 0
        : promotion!.discountType === "fixed"
          ? Math.min(subtotalMinor, promotion!.discountValue)
          : Math.min(
              subtotalMinor,
              Math.round((subtotalMinor * promotion!.discountValue) / 10_000),
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
        entitlementSnapshot: structuredClone(product.entitlements),
      };
    });
    const createdAt = new Date().toISOString();
    const snapshot = {
      accountId,
      configurationVersionId: catalog.configurationVersionId,
      marketCode: request.marketCode,
      currency: catalog.currency,
      listingId: request.listingId,
      promotionCode: promotion?.code,
      lines,
    };
    const quote = monetizationQuoteSchema.parse({
      id: deterministicId("quote", `${accountId}:${request.idempotencyKey}`),
      accountId,
      configurationVersionId: catalog.configurationVersionId,
      marketCode: request.marketCode,
      currency: catalog.currency,
      listingId: request.listingId,
      lines,
      subtotalMinor: lines.reduce((sum, line) => sum + line.subtotalMinor, 0),
      discountMinor: lines.reduce((sum, line) => sum + line.discountMinor, 0),
      taxMinor: lines.reduce((sum, line) => sum + line.taxMinor, 0),
      totalMinor: lines.reduce((sum, line) => sum + line.totalMinor, 0),
      promotionCode: promotion?.code,
      snapshotHash: hashSnapshot(snapshot),
      reasonCode: promotion ? "PROMOTION_APPLIED" : "CATALOG_PRICE",
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
  ): Promise<MonetizationOrder> {
    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Clé d’idempotence requise.",
      });
    }
    const quote = await this.repository.getQuote(quoteId);
    if (!quote || quote.accountId !== accountId)
      throw new AppError({ code: "NOT_FOUND", message: "Devis introuvable." });
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
    const provider = config.dataMode === "database" ? "stripe" : "demo";
    let checkout: { id: string; url?: string } = {
      id: deterministicId("checkout", idempotencyKey),
    };
    if (provider === "stripe") {
      checkout = await stripeCheckoutAdapter.createSession({
        idempotencyKey: `checkout:${quote.id}`,
        accountId,
        verticalType: "marketplace",
        marketCode: quote.marketCode,
        quoteId: quote.id,
        snapshotHash: quote.snapshotHash,
        lines: quote.lines.map((line) => {
          const product = quoteCatalog.products.find(
            (candidate) => candidate.id === line.productId,
          );
          const period = line.billingPeriod;
          return {
            name: line.label,
            description: `Shongre — ${line.productId}`,
            amountMinor: line.totalMinor,
            currency: quote.currency,
            quantity: line.quantity,
            recurring:
              product?.kind === "subscription" &&
              (period === "month" || period === "year")
                ? period
                : undefined,
          };
        }),
        mode: recurring ? "subscription" : "payment",
      });
    }
    const createdAt = new Date().toISOString();
    return this.repository.saveOrder(
      monetizationOrderSchema.parse({
        id: deterministicId("order", `${accountId}:${quote.id}`),
        quoteId: quote.id,
        accountId,
        snapshotHash: quote.snapshotHash,
        total: { amountMinor: quote.totalMinor, currency: quote.currency },
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
    marketCode = "FR",
  ): Promise<MonetizationAdminOverview> {
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
      this.repository.countQuotesSince(today.toISOString()),
    ]);
    const publishedVersion = versions.find(
      (version) => version.status === "active",
    );
    if (!publishedVersion)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Aucune version publiée.",
      });
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
      activeSubscriptionCount: subscriptions.filter((entry) =>
        ["trialing", "active", "past_due", "cancellation_pending"].includes(
          entry.status,
        ),
      ).length,
      orders,
      entitlements,
      payments: [],
      invoices: [],
      refunds: [],
      subscriptions,
      creditBalances: [],
      subscriptionEvents: [],
      auditEvents,
    });
  }

  async getActiveEntitlements(accountId: string) {
    const entitlements = await this.repository.listEntitlements(accountId, 200);
    const at = Date.now();
    return entitlements.filter(
      (entry) =>
        entry.status === "active" &&
        (!entry.endsAt || new Date(entry.endsAt).getTime() > at),
    );
  }

  async getSubscriptions(accountId: string) {
    return this.repository.listSubscriptions(accountId, 100);
  }

  async getBillingOverview(accountId: string): Promise<BillingOverview> {
    return billingOverviewSchema.parse(
      await this.repository.getBillingOverview(accountId),
    );
  }

  async getInvoiceDocument(accountId: string, invoiceId: string) {
    const billing = await this.getBillingOverview(accountId);
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
  ): Promise<SubscriptionChangePreview> {
    const request = subscriptionChangeRequestSchema.parse(rawRequest);
    const subscription = (
      await this.repository.listSubscriptions(accountId, 100)
    ).find((entry) => entry.id === request.subscriptionId);
    if (!subscription) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Abonnement introuvable.",
      });
    }
    const catalog = await this.getCatalog("FR");
    const currentProduct = catalog.products.find(
      (entry) => entry.id === subscription.productId,
    );
    const targetProduct = catalog.products.find(
      (entry) => entry.id === request.targetProductId,
    );
    const currentPrice =
      currentProduct?.prices.find((entry) => entry.id === subscription.priceId) ||
      currentProduct?.prices.find(
        (entry) => entry.billingPeriod === subscription.billingPeriod,
      );
    const targetPrice = targetProduct?.prices.find(
      (entry) => entry.id === request.targetPriceId,
    );
    if (!targetProduct || targetProduct.kind !== "subscription" || !targetPrice) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le forfait cible n’est pas disponible.",
      });
    }
    const currentMinor = currentPrice?.amount.amountMinor || 0;
    const isUpgrade = targetPrice.amount.amountMinor > currentMinor;
    const periodStart = new Date(subscription.currentPeriodStart).getTime();
    const periodEnd = new Date(subscription.currentPeriodEnd).getTime();
    const remainingRatio = Math.max(
      0,
      Math.min(1, (periodEnd - Date.now()) / Math.max(1, periodEnd - periodStart)),
    );
    const prorationMinor = isUpgrade
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
  ) {
    const request = subscriptionChangeRequestSchema.parse(rawRequest);
    const preview = await this.previewSubscriptionChange(accountId, request);
    if (config.dataMode === "database") {
      const subscription = (
        await this.repository.listSubscriptions(accountId, 100)
      ).find((entry) => entry.id === request.subscriptionId);
      if (subscription?.providerSubscriptionId) {
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
  ) {
    const request = subscriptionCancellationRequestSchema.parse(rawRequest);
    const subscription = (
      await this.repository.listSubscriptions(accountId, 100)
    ).find((entry) => entry.id === request.subscriptionId);
    if (!subscription) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Abonnement introuvable.",
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
    const current = await this.getCatalog("FR");
    const versions = await this.repository.listVersions("FR");
    const versionNumber =
      Math.max(...versions.map((version) => version.versionNumber), 0) + 1;
    const id = `commercial-fr-v${versionNumber}`;
    const createdAt = new Date().toISOString();
    const catalog = monetizationCatalogSchema.parse({
      ...current,
      configurationVersionId: id,
      versionNumber,
      generatedAt: createdAt,
      products: (patch.products || current.products).map((product) => ({
        ...product,
        versionId: `${id}:${product.id}`,
        prices: product.prices.map((price) => ({
          ...price,
          id: `${id}:${product.id}:${price.billingPeriod}`,
        })),
        status: product.status === "active" ? "draft" : product.status,
      })),
      rules: (patch.rules || current.rules).map((rule) => ({
        ...rule,
        versionId: id,
        status: rule.status === "active" ? "draft" : rule.status,
      })),
      promotions: (patch.promotions || current.promotions).map((promotion) => ({
        ...promotion,
        id: `${id}:${promotion.code.toLowerCase()}`,
        status: promotion.status === "active" ? "draft" : promotion.status,
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
      marketCode: "FR",
      status: "draft",
      reason: patch.reason,
      effectiveFrom: patch.effectiveFrom,
      createdBy: actorId,
      createdAt,
      productCount: catalog.products.length,
      ruleCount: catalog.rules.length,
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
    if (input.reason.trim().length < 8)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Motif détaillé requis.",
      });
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
      catalog.promotions = catalog.promotions.map((promotion) => ({
        ...promotion,
        status: promotion.status === "draft" ? "active" : promotion.status,
      }));
    } else if (
      input.action === "rollback" &&
      ["archived", "disabled"].includes(version.status)
    ) {
      const versionNumber =
        Math.max(...versions.map((candidate) => candidate.versionNumber), 0) +
        1;
      const rollbackId = `commercial-${catalog.marketCode.toLowerCase()}-v${versionNumber}`;
      const createdAt = new Date().toISOString();
      const rollbackCatalog = monetizationCatalogSchema.parse({
        ...catalog,
        configurationVersionId: rollbackId,
        versionNumber,
        generatedAt: createdAt,
        products: catalog.products.map((product) => ({
          ...product,
          versionId: `${rollbackId}:${product.id}`,
          prices: product.prices.map((price) => ({
            ...price,
            id: `${rollbackId}:${product.id}:${price.billingPeriod}`,
          })),
          status: product.status === "disabled" ? "disabled" : "draft",
        })),
        rules: catalog.rules.map((rule) => ({
          ...rule,
          versionId: rollbackId,
          status: rule.status === "disabled" ? "disabled" : "draft",
        })),
        promotions: catalog.promotions.map((promotion) => ({
          ...promotion,
          id: `${rollbackId}:${promotion.code.toLowerCase()}`,
          status: promotion.status === "disabled" ? "disabled" : "draft",
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
        ruleCount: rollbackCatalog.rules.length,
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
