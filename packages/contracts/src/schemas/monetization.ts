import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";

export const commercialConfigurationStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "active",
  "disabled",
  "archived",
]);
export type CommercialConfigurationStatus = z.infer<
  typeof commercialConfigurationStatusSchema
>;

export const monetizationProductKindSchema = z.enum([
  "standard_listing",
  "additional_listing",
  "premium_option",
  "subscription",
  "pack",
  "credit_pack",
  "service_fee",
  "commission",
  "verification_service",
  "sponsored_placement",
]);
export type MonetizationProductKind = z.infer<
  typeof monetizationProductKindSchema
>;

export const commercialAudienceSchema = z.enum([
  "guest",
  "individual",
  "professional",
  "organization",
  "all",
]);

export const commercialRuleFieldSchema = z.enum([
  "marketCode",
  "countryCode",
  "currency",
  "categoryId",
  "subcategoryId",
  "typeId",
  "subtypeId",
  "userType",
  "planId",
  "verificationStatus",
  "kycStatus",
  "listingType",
  "publicationChannel",
  "customerSegment",
  "promotionCode",
  "usageLevel",
  "featureFlag",
  "experimentCohort",
  "effectiveAt",
]);
export type CommercialRuleField = z.infer<typeof commercialRuleFieldSchema>;

export const commercialRuleOperatorSchema = z.enum([
  "eq",
  "not_eq",
  "in",
  "not_in",
  "gte",
  "lte",
  "between",
  "contains",
]);
export type CommercialRuleOperator = z.infer<
  typeof commercialRuleOperatorSchema
>;

const commercialScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const commercialConditionSchema = z
  .object({
    field: commercialRuleFieldSchema,
    operator: commercialRuleOperatorSchema,
    value: z.union([
      commercialScalarSchema,
      z.array(commercialScalarSchema).min(1),
    ]),
  })
  .strict();
export type CommercialCondition = z.infer<typeof commercialConditionSchema>;

export const commercialScopeSchema = z
  .object({
    marketCodes: z.array(marketCodeSchema).default([]),
    currencies: z.array(z.string().length(3)).default([]),
    categoryIds: z.array(z.string().min(1)).default([]),
    subcategoryIds: z.array(z.string().min(1)).default([]),
    typeIds: z.array(z.string().min(1)).default([]),
    subtypeIds: z.array(z.string().min(1)).default([]),
    audiences: z.array(commercialAudienceSchema).default([]),
    planIds: z.array(z.string().min(1)).default([]),
    customerSegments: z.array(z.string().min(1)).default([]),
    publicationChannels: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type CommercialScope = z.infer<typeof commercialScopeSchema>;

export const commercialRuleOutcomeSchema = z
  .object({
    eligible: z.boolean().optional(),
    reasonCode: z.string().regex(/^[A-Z0-9_]+$/).optional(),
    quotaLimit: z.number().int().nonnegative().optional(),
    quotaPeriodDays: z.number().int().positive().optional(),
    durationDays: z.number().int().positive().optional(),
    baseAmountMinor: z.number().int().nonnegative().optional(),
    minimumAmountMinor: z.number().int().nonnegative().optional(),
    maximumAmountMinor: z.number().int().nonnegative().optional(),
    fixedAdjustmentMinor: z.number().int().optional(),
    percentageAdjustmentBps: z.number().int().min(-10_000).max(10_000).optional(),
    feeRateBps: z.number().int().min(0).max(10_000).optional(),
    commissionRateBps: z.number().int().min(0).max(10_000).optional(),
    fixedFeeMinor: z.number().int().nonnegative().optional(),
    taxRateBps: z.number().int().min(0).max(10_000).optional(),
    entitlementKey: z.string().min(1).optional(),
    entitlementValue: commercialScalarSchema.optional(),
  })
  .strict();
export type CommercialRuleOutcome = z.infer<
  typeof commercialRuleOutcomeSchema
>;

export const commercialRuleSchema = z.object({
  id: z.string().min(1),
  setId: z.string().min(1),
  versionId: z.string().min(1),
  key: z.string().regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1),
  description: z.string(),
  priority: z.number().int().min(0).max(100_000),
  mandatory: z.boolean().default(false),
  scope: commercialScopeSchema,
  conditions: z.array(commercialConditionSchema).max(24),
  outcome: commercialRuleOutcomeSchema,
  status: commercialConfigurationStatusSchema,
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
});
export type CommercialRule = z.infer<typeof commercialRuleSchema>;

export const monetizationPriceSchema = z.object({
  id: z.string().min(1),
  amount: moneySchema.extend({ amountMinor: z.number().int().nonnegative() }),
  billingPeriod: z.enum(["once", "month", "year"]),
  taxRateBps: z.number().int().min(0).max(10_000),
  priceIncludesTax: z.boolean(),
  durationDays: z.number().int().positive().optional(),
  trialDays: z.number().int().nonnegative().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
});
export type MonetizationPrice = z.infer<typeof monetizationPriceSchema>;

export const monetizationEntitlementSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.union([commercialScalarSchema, z.array(z.string())]),
  unit: z.string().optional(),
});
export type MonetizationEntitlement = z.infer<
  typeof monetizationEntitlementSchema
>;

export const monetizationProductSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  code: z.string().regex(/^[a-z0-9_.-]+$/),
  kind: monetizationProductKindSchema,
  name: z.string().min(1),
  description: z.string(),
  audience: commercialAudienceSchema,
  scope: commercialScopeSchema,
  prices: z.array(monetizationPriceSchema).min(1),
  entitlements: z.array(monetizationEntitlementSchema),
  compatibility: z.object({
    requiresProductIds: z.array(z.string()).default([]),
    excludesProductIds: z.array(z.string()).default([]),
    maximumQuantity: z.number().int().positive().default(1),
  }),
  status: commercialConfigurationStatusSchema,
  recommended: z.boolean(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
  sourceConsumers: z.array(z.string()).default([]),
});
export type MonetizationProduct = z.infer<typeof monetizationProductSchema>;

export const promotionSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(3).max(40).transform((value) => value.toUpperCase()),
  name: z.string().min(1),
  status: commercialConfigurationStatusSchema,
  scope: commercialScopeSchema,
  productIds: z.array(z.string()).min(1),
  discountType: z.enum(["fixed", "percentage"]),
  discountValue: z.number().int().nonnegative(),
  stackingPolicy: z.enum(["exclusive", "best_only", "stackable"]),
  maximumRedemptions: z.number().int().positive().optional(),
  maximumRedemptionsPerAccount: z.number().int().positive().default(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});
export type Promotion = z.infer<typeof promotionSchema>;

export const ruleEvaluationContextSchema = z.object({
  marketCode: marketCodeSchema.default("FR"),
  countryCode: marketCodeSchema.optional(),
  currency: z.string().length(3).default("EUR"),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  typeId: z.string().optional(),
  subtypeId: z.string().optional(),
  userType: commercialAudienceSchema.default("guest"),
  planId: z.string().optional(),
  verificationStatus: z.string().optional(),
  kycStatus: z.string().optional(),
  listingType: z.string().optional(),
  publicationChannel: z.string().default("web"),
  customerSegment: z.string().optional(),
  promotionCode: z.string().optional(),
  usageLevel: z.number().int().nonnegative().default(0),
  featureFlags: z.array(z.string()).default([]),
  experimentCohort: z.string().optional(),
  effectiveAt: z.string().datetime().optional(),
});
export type RuleEvaluationContext = z.infer<
  typeof ruleEvaluationContextSchema
>;

export const ruleExplanationSchema = z.object({
  ruleId: z.string(),
  ruleKey: z.string(),
  ruleName: z.string(),
  matched: z.boolean(),
  priority: z.number().int(),
  specificity: z.number().int(),
  outcome: commercialRuleOutcomeSchema.optional(),
  reasonCode: z.string(),
});
export type RuleExplanation = z.infer<typeof ruleExplanationSchema>;

export const ruleEvaluationResultSchema = z.object({
  configurationVersionId: z.string(),
  eligible: z.boolean(),
  reasonCode: z.string(),
  quotaLimit: z.number().int().nonnegative().optional(),
  quotaRemaining: z.number().int().nonnegative().optional(),
  durationDays: z.number().int().positive().optional(),
  outcomes: z.record(z.string(), commercialScalarSchema),
  explanation: z.array(ruleExplanationSchema),
});
export type RuleEvaluationResult = z.infer<
  typeof ruleEvaluationResultSchema
>;

export const monetizationCatalogSchema = z.object({
  configurationVersionId: z.string(),
  versionNumber: z.number().int().positive(),
  marketCode: marketCodeSchema,
  currency: z.string().length(3),
  generatedAt: z.string().datetime(),
  products: z.array(monetizationProductSchema),
  promotions: z.array(promotionSchema),
  rules: z.array(commercialRuleSchema),
  stale: z.boolean().default(false),
});
export type MonetizationCatalog = z.infer<typeof monetizationCatalogSchema>;

export const quoteRequestSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(20),
  priceIds: z.record(z.string(), z.string().min(1)).optional(),
  listingId: z.string().optional(),
  marketCode: marketCodeSchema,
  categoryId: z.string().optional(),
  subtypeId: z.string().optional(),
  promotionCode: z.string().max(40).optional(),
  idempotencyKey: z.string().min(8).max(200),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const quoteLineSchema = z.object({
  productId: z.string(),
  productVersionId: z.string(),
  priceId: z.string(),
  billingPeriod: z.enum(["once", "month", "year"]),
  label: z.string(),
  quantity: z.number().int().positive(),
  unitAmountMinor: z.number().int().nonnegative(),
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  taxRateBps: z.number().int().min(0).max(10_000),
  entitlementSnapshot: z.array(monetizationEntitlementSchema),
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const monetizationQuoteSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  configurationVersionId: z.string(),
  marketCode: marketCodeSchema,
  currency: z.string().length(3),
  lines: z.array(quoteLineSchema).min(1),
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  promotionCode: z.string().optional(),
  snapshotHash: z.string().length(64),
  reasonCode: z.string(),
  status: z.enum(["active", "consumed", "expired", "cancelled"]),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type MonetizationQuote = z.infer<typeof monetizationQuoteSchema>;

export const monetizationOrderSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  accountId: z.string(),
  snapshotHash: z.string().length(64),
  total: moneySchema,
  status: z.enum([
    "created",
    "pending",
    "requires_action",
    "paid",
    "failed",
    "cancelled",
    "partially_refunded",
    "refunded",
  ]),
  provider: z.enum(["demo", "stripe"]),
  providerCheckoutId: z.string().optional(),
  providerCheckoutUrl: z.string().url().optional(),
  providerPaymentId: z.string().optional(),
  invoiceId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MonetizationOrder = z.infer<typeof monetizationOrderSchema>;

export const activeEntitlementSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  productId: z.string(),
  key: z.string(),
  value: z.union([commercialScalarSchema, z.array(z.string())]),
  sourceOrderId: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  status: z.enum(["scheduled", "active", "consumed", "expired", "revoked"]),
});
export type ActiveEntitlement = z.infer<typeof activeEntitlementSchema>;

export const monetizationSubscriptionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  productId: z.string(),
  sourceOrderId: z.string(),
  status: z.enum([
    "trialing",
    "active",
    "past_due",
    "paused",
    "cancelled",
    "expired",
  ]),
  providerSubscriptionId: z.string().optional(),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MonetizationSubscription = z.infer<
  typeof monetizationSubscriptionSchema
>;

export const subscriptionCancellationRequestSchema = z.object({
  subscriptionId: z.string().min(1),
  cancelAtPeriodEnd: z.boolean(),
});
export type SubscriptionCancellationRequest = z.infer<
  typeof subscriptionCancellationRequestSchema
>;

export const promotionValidationRequestSchema = z.object({
  code: z.string().min(3).max(40).transform((value) => value.toUpperCase()),
  productIds: z.array(z.string().min(1)).min(1).max(20),
  marketCode: marketCodeSchema,
  categoryId: z.string().optional(),
  subtypeId: z.string().optional(),
});
export type PromotionValidationRequest = z.infer<
  typeof promotionValidationRequestSchema
>;

export const promotionValidationResultSchema = z.object({
  valid: z.boolean(),
  code: z.string(),
  reasonCode: z.string(),
  promotionId: z.string().optional(),
  discountType: z.enum(["fixed", "percentage"]).optional(),
  discountValue: z.number().int().nonnegative().optional(),
  applicableProductIds: z.array(z.string()),
  endsAt: z.string().datetime().optional(),
});
export type PromotionValidationResult = z.infer<
  typeof promotionValidationResultSchema
>;

export const configurationConflictSchema = z.object({
  code: z.string(),
  severity: z.enum(["warning", "blocking"]),
  entityIds: z.array(z.string()),
  message: z.string(),
});
export type ConfigurationConflict = z.infer<
  typeof configurationConflictSchema
>;

export const commercialConfigurationVersionSchema = z.object({
  id: z.string(),
  setId: z.string(),
  versionNumber: z.number().int().positive(),
  marketCode: marketCodeSchema,
  status: commercialConfigurationStatusSchema,
  reason: z.string(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  productCount: z.number().int().nonnegative(),
  ruleCount: z.number().int().nonnegative(),
  conflicts: z.array(configurationConflictSchema),
});
export type CommercialConfigurationVersion = z.infer<
  typeof commercialConfigurationVersionSchema
>;

export const commercialAuditEventSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  reason: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  approvalActorId: z.string().optional(),
  requestId: z.string(),
  ipPrefix: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type CommercialAuditEvent = z.infer<
  typeof commercialAuditEventSchema
>;

export const monetizationAdminOverviewSchema = z.object({
  publishedVersion: commercialConfigurationVersionSchema,
  versions: z.array(commercialConfigurationVersionSchema),
  catalog: monetizationCatalogSchema,
  scheduledChanges: z.number().int().nonnegative(),
  conflictCount: z.number().int().nonnegative(),
  quoteCountToday: z.number().int().nonnegative(),
  activeSubscriptionCount: z.number().int().nonnegative(),
  orders: z.array(monetizationOrderSchema),
  entitlements: z.array(activeEntitlementSchema),
  auditEvents: z.array(commercialAuditEventSchema),
});
export type MonetizationAdminOverview = z.infer<
  typeof monetizationAdminOverviewSchema
>;

export const commercialDraftPatchSchema = z.object({
  reason: z.string().min(8).max(500),
  effectiveFrom: z.string().datetime().optional(),
  products: z.array(monetizationProductSchema).optional(),
  rules: z.array(commercialRuleSchema).optional(),
  promotions: z.array(promotionSchema).optional(),
});
export type CommercialDraftPatch = z.infer<
  typeof commercialDraftPatchSchema
>;
