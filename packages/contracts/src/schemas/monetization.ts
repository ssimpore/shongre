import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";

/** Shared commercial editor constraints; schemas, UI, and services consume one policy. */
export const MONETIZATION_ADMIN_CONSTRAINTS = {
  nonNegativeInteger: { min: 0, step: 1 },
  positiveInteger: { min: 1, step: 1 },
  basisPoints: { min: 0, max: 10_000, step: 1 },
  signedBasisPoints: { min: -10_000, max: 10_000, step: 1 },
  priority: { min: 0, max: 100_000, step: 1 },
  percentageMajor: { min: 1, max: 100, step: 1 },
  percentageBpsMax: 10_000,
  percentageToBps: 100,
  moneyMajor: { min: 0, step: 0.01 },
  moneyMajorToMinor: 100,
  moneyMinor: { min: 0, step: 1 },
  trialDurationDays: { min: 1, default: 30, step: 1 },
  sortOrderIncrement: 10,
  promotionCode: { minLength: 3, maxLength: 40 },
  changeReason: { minLength: 8, maxLength: 500 },
  complimentaryRequestReason: { minLength: 12, maxLength: 500 },
  complimentaryDecisionReason: { minLength: 8, maxLength: 500 },
} as const;

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
export type CommercialAudience = z.infer<typeof commercialAudienceSchema>;

/** Organizations are professional accounts with an organization scope. */
export function isCommercialAudienceCompatible(
  allowed: CommercialAudience | CommercialAudience[],
  actual: CommercialAudience,
) {
  const audiences = Array.isArray(allowed) ? allowed : [allowed];
  return (
    audiences.includes("all") ||
    audiences.includes(actual) ||
    (actual === "organization" && audiences.includes("professional"))
  );
}

/**
 * Stable, admin-configurable vertical identifier.
 *
 * Known verticals are seeded in the commercial catalog, but the contract must
 * not require a frontend/backend release when an administrator adds a new one.
 */
export const businessVerticalCodeSchema = z
  .string()
  .min(2)
  .max(30)
  .regex(/^[a-z][a-z0-9_-]*$/);
export type BusinessVerticalCode = z.infer<typeof businessVerticalCodeSchema>;

export const businessVerticalSchema = z.object({
  id: businessVerticalCodeSchema,
  name: z.string().min(1),
  description: z.string(),
  categoryIds: z.array(z.string().min(1)),
  capabilityKeys: z.array(z.string().min(1)),
  status: z.enum(["active", "disabled", "archived"]),
  sortOrder: z.number().int().nonnegative(),
});
export type BusinessVertical = z.infer<typeof businessVerticalSchema>;

export const entitlementMergePolicySchema = z.enum([
  "boolean_or",
  "max",
  "additive",
  "override",
]);
export type EntitlementMergePolicy = z.infer<
  typeof entitlementMergePolicySchema
>;

export const commercialFeatureAvailabilitySchema = z.enum([
  "enabled",
  "beta",
  "maintenance",
  "disabled",
]);
export type CommercialFeatureAvailability = z.infer<
  typeof commercialFeatureAvailabilitySchema
>;

export const commercialFeatureTypeSchema = z.enum([
  "boolean",
  "integer_quota",
  "additive_quota",
  "level",
  "monetary_credit",
  "scoped_permission",
]);
export type CommercialFeatureType = z.infer<typeof commercialFeatureTypeSchema>;

export const commercialFeatureImplementationStatusSchema = z.enum([
  "ready",
  "incomplete",
  "external_dependency",
]);
export type CommercialFeatureImplementationStatus = z.infer<
  typeof commercialFeatureImplementationStatusSchema
>;

export const trialPolicySchema = z.object({
  enabled: z.boolean(),
  durationDays: z.number().int().positive().optional(),
  requiresPaymentMethod: z.boolean(),
  firstTimeCustomersOnly: z.boolean(),
  autoConverts: z.boolean(),
  eligibleAudiences: z.array(commercialAudienceSchema),
  eligibleMarketCodes: z.array(marketCodeSchema),
  campaignStartsAt: z.string().datetime().optional(),
  campaignEndsAt: z.string().datetime().optional(),
});
export type TrialPolicy = z.infer<typeof trialPolicySchema>;

export const commercialPlanProfileSchema = z.object({
  planType: z.enum(["free", "generic", "vertical", "addon", "bundle"]),
  familyId: z.string().regex(/^[a-z0-9_.-]+$/),
  verticalId: businessVerticalCodeSchema.optional(),
  tier: z
    .enum(["free", "essential", "business", "premium", "enterprise", "custom"])
    .optional(),
  professionalOnly: z.boolean(),
  targetCategoryIds: z.array(z.string().min(1)),
  countryAvailability: z.array(marketCodeSchema),
  trialPolicy: trialPolicySchema,
  upgradeProductIds: z.array(z.string().min(1)),
  downgradeProductIds: z.array(z.string().min(1)),
  compatibleAddonIds: z.array(z.string().min(1)),
  requiresBusinessVerification: z.boolean(),
  financeCategory: z.enum([
    "generic_subscription",
    "auto_subscription",
    "immo_subscription",
    "employment_subscription",
    "education_subscription",
    // Read compatibility for finalized catalog/invoice snapshots published
    // before the business vertical became Education.
    "courses_subscription",
    "addon",
    "promotion",
    "marketplace_service",
  ]),
  displayOrder: z.number().int().nonnegative(),
});
export type CommercialPlanProfile = z.infer<typeof commercialPlanProfileSchema>;

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

const commercialScalarSchema = z.union([z.string(), z.number(), z.boolean()]);

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
    verticalIds: z.array(businessVerticalCodeSchema).default([]),
  })
  .strict();
export type CommercialScope = z.infer<typeof commercialScopeSchema>;

export const commercialRuleOutcomeSchema = z
  .object({
    eligible: z.boolean().optional(),
    reasonCode: z
      .string()
      .regex(/^[A-Z0-9_]+$/)
      .optional(),
    quotaLimit: z.number().int().nonnegative().optional(),
    quotaPeriodDays: z.number().int().positive().optional(),
    durationDays: z.number().int().positive().optional(),
    baseAmountMinor: z.number().int().nonnegative().optional(),
    minimumAmountMinor: z.number().int().nonnegative().optional(),
    maximumAmountMinor: z.number().int().nonnegative().optional(),
    fixedAdjustmentMinor: z.number().int().optional(),
    percentageAdjustmentBps: z
      .number()
      .int()
      .min(MONETIZATION_ADMIN_CONSTRAINTS.signedBasisPoints.min)
      .max(MONETIZATION_ADMIN_CONSTRAINTS.signedBasisPoints.max)
      .optional(),
    feeRateBps: z
      .number()
      .int()
      .min(MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min)
      .max(MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max)
      .optional(),
    fixedFeeMinor: z.number().int().nonnegative().optional(),
    taxRateBps: z
      .number()
      .int()
      .min(MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min)
      .max(MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max)
      .optional(),
    entitlementKey: z.string().min(1).optional(),
    entitlementValue: commercialScalarSchema.optional(),
  })
  .strict();
export type CommercialRuleOutcome = z.infer<typeof commercialRuleOutcomeSchema>;

export const commercialRuleSchema = z.object({
  id: z.string().min(1),
  setId: z.string().min(1),
  versionId: z.string().min(1),
  key: z.string().regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1),
  description: z.string(),
  priority: z
    .number()
    .int()
    .min(MONETIZATION_ADMIN_CONSTRAINTS.priority.min)
    .max(MONETIZATION_ADMIN_CONSTRAINTS.priority.max),
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
  providerPriceId: z.string().min(1).optional(),
  amount: moneySchema.extend({ amountMinor: z.number().int().nonnegative() }),
  billingPeriod: z.enum(["once", "month", "year"]),
  taxRateBps: z
    .number()
    .int()
    .min(MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.min)
    .max(MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max),
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
  description: z.string().default(""),
  value: z.union([commercialScalarSchema, z.array(z.string())]),
  unit: z.string().optional(),
  featureType: commercialFeatureTypeSchema.default("scoped_permission"),
  availability: commercialFeatureAvailabilitySchema.default("enabled"),
  implementationStatus:
    commercialFeatureImplementationStatusSchema.default("ready"),
  dependencies: z.array(z.string().min(1)).default([]),
  adminHelpText: z.string().default(""),
  mergePolicy: entitlementMergePolicySchema,
  verticalId: businessVerticalCodeSchema.optional(),
  categoryIds: z.array(z.string().min(1)),
  recurringGrant: z
    .object({
      creditType: z.string().min(1),
      quantity: z.number().int().positive(),
      resetPeriod: z.enum(["month", "year", "billing_period"]),
    })
    .optional(),
});
export type MonetizationEntitlement = z.infer<
  typeof monetizationEntitlementSchema
>;

/**
 * Only enabled and explicitly-labelled beta capabilities can be granted or
 * advertised. Maintenance and disabled definitions remain in versioned
 * configuration for history and safe operational recovery.
 */
export function isCommercialEntitlementOperational(
  entitlement: Pick<
    MonetizationEntitlement,
    "availability" | "implementationStatus"
  >,
) {
  return (
    entitlement.implementationStatus === "ready" &&
    (entitlement.availability === "enabled" ||
      entitlement.availability === "beta")
  );
}

export function hasCommercialEntitlementValue(
  value: MonetizationEntitlement["value"],
) {
  if (value === false || value === 0 || value === "") return false;
  return !Array.isArray(value) || value.length > 0;
}

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
  commercialProfile: commercialPlanProfileSchema,
});
export type MonetizationProduct = z.infer<typeof monetizationProductSchema>;

/**
 * An active product whose paid outcomes are all suspended must not enter a
 * catalog or checkout. Products without entitlements, such as a pure delivery
 * fee, remain purchasable because the service itself is the priced outcome.
 */
export function isCommercialProductPurchasable(
  product: Pick<MonetizationProduct, "status" | "entitlements">,
) {
  return (
    product.status === "active" &&
    (product.entitlements.length === 0 ||
      product.entitlements.some(
        (entitlement) =>
          isCommercialEntitlementOperational(entitlement) &&
          hasCommercialEntitlementValue(entitlement.value),
      ))
  );
}

export const commercialChangeReasonSchema = z
  .string()
  .trim()
  .min(MONETIZATION_ADMIN_CONSTRAINTS.changeReason.minLength)
  .max(MONETIZATION_ADMIN_CONSTRAINTS.changeReason.maxLength);

export const promotionSchema = z.object({
  id: z.string().min(1),
  code: z
    .string()
    .min(MONETIZATION_ADMIN_CONSTRAINTS.promotionCode.minLength)
    .max(MONETIZATION_ADMIN_CONSTRAINTS.promotionCode.maxLength)
    .transform((value) => value.toUpperCase()),
  name: z.string().min(1),
  status: commercialConfigurationStatusSchema,
  scope: commercialScopeSchema,
  productIds: z.array(z.string()).min(1),
  discountType: z.enum([
    "fixed",
    "percentage",
    "introductory_price",
    "free_period",
  ]),
  discountValue: z.number().int().nonnegative(),
  stackingPolicy: z.enum(["exclusive", "best_only", "stackable"]),
  maximumRedemptions: z.number().int().positive().optional(),
  maximumRedemptionsPerAccount: z.number().int().positive().default(1),
  activationMode: z.enum(["coupon", "automatic", "admin_grant"]),
  eligibleCustomerType: z.enum(["new", "existing", "all"]),
  freePeriodDays: z.number().int().positive().optional(),
  durationBillingPeriods: z.number().int().positive().optional(),
  minimumCommitmentPeriods: z.number().int().nonnegative().default(0),
  campaignId: z.string().min(1).optional(),
  providerCouponId: z.string().min(1).optional(),
  verticalIds: z.array(businessVerticalCodeSchema),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});
export type Promotion = z.infer<typeof promotionSchema>;

export const complimentaryGrantRequestInputSchema = z
  .object({
    accountId: z.string().min(1),
    productVersionId: z.string().min(1),
    campaignId: z.string().min(1).optional(),
    reason: z
      .string()
      .trim()
      .min(MONETIZATION_ADMIN_CONSTRAINTS.complimentaryRequestReason.minLength)
      .max(MONETIZATION_ADMIN_CONSTRAINTS.complimentaryRequestReason.maxLength),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    idempotencyKey: z.string().min(8).max(200),
  })
  .refine((input) => input.endsAt > input.startsAt, {
    path: ["endsAt"],
    message: "The complimentary grant must end after it starts.",
  });
export type ComplimentaryGrantRequestInput = z.infer<
  typeof complimentaryGrantRequestInputSchema
>;

export const complimentaryGrantDecisionInputSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z
    .string()
    .trim()
    .min(MONETIZATION_ADMIN_CONSTRAINTS.complimentaryDecisionReason.minLength)
    .max(MONETIZATION_ADMIN_CONSTRAINTS.complimentaryDecisionReason.maxLength),
  idempotencyKey: z.string().min(8).max(200),
});
export type ComplimentaryGrantDecisionInput = z.infer<
  typeof complimentaryGrantDecisionInputSchema
>;

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
export type RuleEvaluationContext = z.infer<typeof ruleEvaluationContextSchema>;

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
export type RuleEvaluationResult = z.infer<typeof ruleEvaluationResultSchema>;

/**
 * Canonical platform-commission vocabulary.
 *
 * Commission policies live in the same immutable commercial catalogue as
 * products, promotions and entitlements. This avoids a second source of truth
 * while keeping rich transaction-fee semantics out of the generic rule
 * outcome bag above.
 */
export const commissionTransactionTypeSchema = z.enum([
  "marketplace_order",
  "course_booking",
  "service_booking",
  "vehicle_transaction",
  "property_service",
  "employment_service",
]);
export type CommissionTransactionType = z.infer<
  typeof commissionTransactionTypeSchema
>;

export const commissionEarningEventSchema = z.enum([
  "payment_succeeded",
  "order_completed",
  "service_completed",
  "payout_released",
  "lead_qualified",
  "booking_completed",
]);
export type CommissionEarningEvent = z.infer<
  typeof commissionEarningEventSchema
>;

export const commissionBaseSchema = z.enum([
  "item_subtotal",
  "subtotal_after_discount",
  "total_excluding_tax",
  "total_including_tax",
  "platform_collected_amount",
]);
export type CommissionBase = z.infer<typeof commissionBaseSchema>;

export const commissionRoundingModeSchema = z.enum([
  "half_up",
  "half_even",
  "down",
  "up",
]);
export type CommissionRoundingMode = z.infer<
  typeof commissionRoundingModeSchema
>;

export const commissionTaxTreatmentSchema = z.object({
  mode: z.enum(["exclusive", "inclusive", "exempt"]),
  rateBps: z.number().int().min(0).max(10_000),
});
export type CommissionTaxTreatment = z.infer<
  typeof commissionTaxTreatmentSchema
>;

export const commissionAllocationSchema = z
  .object({
    sellerBps: z.number().int().min(0).max(10_000),
    buyerBps: z.number().int().min(0).max(10_000),
    platformAbsorbedBps: z.number().int().min(0).max(10_000),
  })
  .superRefine((allocation, context) => {
    if (
      allocation.sellerBps +
        allocation.buyerBps +
        allocation.platformAbsorbedBps !==
      10_000
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Commission allocation must total exactly 10,000 bps.",
      });
    }
  });
export type CommissionAllocation = z.infer<typeof commissionAllocationSchema>;

const commissionModelBounds = {
  minimumMinor: z.number().int().nonnegative().optional(),
  maximumMinor: z.number().int().nonnegative().optional(),
};

export const commissionTierSchema = z.object({
  fromMinor: z.number().int().nonnegative(),
  toMinor: z.number().int().positive().optional(),
  rateBps: z.number().int().min(0).max(10_000),
  fixedMinor: z.number().int().nonnegative().default(0),
});
export type CommissionTier = z.infer<typeof commissionTierSchema>;

export const commissionModelSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("percentage"),
    rateBps: z.number().int().min(0).max(10_000),
    ...commissionModelBounds,
  }),
  z.object({
    type: z.literal("fixed"),
    fixedMinor: z.number().int().nonnegative(),
    ...commissionModelBounds,
  }),
  z.object({
    type: z.literal("combined"),
    rateBps: z.number().int().min(0).max(10_000),
    fixedMinor: z.number().int().nonnegative(),
    ...commissionModelBounds,
  }),
  z.object({
    type: z.literal("tiered"),
    tierMode: z.enum(["progressive", "cliff"]),
    basis: z
      .enum(["transaction_amount", "historical_volume"])
      .default("transaction_amount"),
    volumePeriod: z.enum(["month", "quarter", "year", "lifetime"]).optional(),
    tiers: z.array(commissionTierSchema).min(1),
    ...commissionModelBounds,
  }),
  z.object({
    type: z.literal("threshold"),
    thresholdMinor: z.number().int().nonnegative(),
    appliesWhen: z.enum(["at_or_above", "above", "below"]),
    rateBps: z.number().int().min(0).max(10_000).default(0),
    fixedMinor: z.number().int().nonnegative().default(0),
    ...commissionModelBounds,
  }),
  z.object({
    type: z.literal("flat_category"),
    fixedMinor: z.number().int().nonnegative(),
    ...commissionModelBounds,
  }),
]);
export type CommissionModel = z.infer<typeof commissionModelSchema>;

export const commissionAdjustmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("percentage_discount"),
    discountBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    type: z.literal("fixed_discount"),
    amountMinor: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal("full_waiver") }),
  z.object({
    type: z.literal("rate_override"),
    rateBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    type: z.literal("fixed_override"),
    amountMinor: z.number().int().nonnegative(),
  }),
]);
export type CommissionAdjustment = z.infer<typeof commissionAdjustmentSchema>;

export const commissionScopeSchema = z.object({
  countryCodes: z.array(z.string().length(2)).default([]),
  marketCodes: z.array(marketCodeSchema).default([]),
  currencies: z.array(z.string().length(3)).default([]),
  verticalIds: z.array(businessVerticalCodeSchema).default([]),
  categoryIds: z.array(z.string().min(1)).default([]),
  subcategoryIds: z.array(z.string().min(1)).default([]),
  transactionTypes: z.array(commissionTransactionTypeSchema).default([]),
  sellerTypes: z
    .array(z.enum(["individual", "professional", "organization"]))
    .default([]),
  sellerSegments: z.array(z.string().min(1)).default([]),
  planIds: z.array(z.string().min(1)).default([]),
  organizationIds: z.array(z.string().min(1)).default([]),
  accountIds: z.array(z.string().min(1)).default([]),
  campaignIds: z.array(z.string().min(1)).default([]),
  paymentMethods: z.array(z.string().min(1)).default([]),
});
export type CommissionScope = z.infer<typeof commissionScopeSchema>;

const commissionEffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("commission"),
    base: commissionBaseSchema,
    model: commissionModelSchema,
    allocation: commissionAllocationSchema,
    tax: commissionTaxTreatmentSchema,
    roundingMode: commissionRoundingModeSchema.default("half_up"),
    earningEvent: commissionEarningEventSchema,
    refundPolicy: z.enum([
      "proportional",
      "full_only",
      "non_refundable",
      "manual_review",
    ]),
  }),
  z.object({
    kind: z.literal("adjustment"),
    adjustment: commissionAdjustmentSchema,
    stackingPolicy: z.enum(["exclusive", "best_price", "stackable"]),
    promotionId: z.string().min(1).optional(),
  }),
]);
export type CommissionEffect = z.infer<typeof commissionEffectSchema>;

export const commissionRuleSchema = z
  .object({
    id: z.string().min(1),
    policyId: z.string().min(1),
    versionId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().default(""),
    priority: z.number().int().min(0).max(100_000).default(0),
    scope: commissionScopeSchema,
    effect: commissionEffectSchema,
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().optional(),
  })
  .superRefine((rule, context) => {
    if (
      rule.effectiveFrom &&
      rule.effectiveUntil &&
      new Date(rule.effectiveFrom) >= new Date(rule.effectiveUntil)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Commission rule effectiveUntil must be after effectiveFrom.",
      });
    }
    if (rule.effect.kind === "commission") {
      const { minimumMinor, maximumMinor } = rule.effect.model;
      if (
        minimumMinor !== undefined &&
        maximumMinor !== undefined &&
        minimumMinor > maximumMinor
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Commission minimum cannot exceed maximum.",
        });
      }
      if (rule.effect.model.type === "tiered") {
        const tiers = rule.effect.model.tiers;
        if (
          rule.effect.model.basis === "historical_volume" &&
          !rule.effect.model.volumePeriod
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Volume-based commission tiers require an explicit volume period.",
            path: ["effect", "model", "volumePeriod"],
          });
        }
        let previousEnd = 0;
        tiers.forEach((tier, index) => {
          if (tier.fromMinor !== previousEnd) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Commission tiers must be contiguous and start at zero.",
              path: ["effect", "model", "tiers", index, "fromMinor"],
            });
          }
          if (tier.toMinor !== undefined && tier.toMinor <= tier.fromMinor) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Commission tier upper bound must exceed its lower bound.",
              path: ["effect", "model", "tiers", index, "toMinor"],
            });
          }
          previousEnd = tier.toMinor ?? previousEnd;
          if (tier.toMinor === undefined && index !== tiers.length - 1) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only the final commission tier may be open-ended.",
              path: ["effect", "model", "tiers", index, "toMinor"],
            });
          }
        });
      }
    }
  });
export type CommissionRule = z.infer<typeof commissionRuleSchema>;

export const commissionPolicySchema = z
  .object({
    id: z.string().min(1),
    code: z.string().regex(/^[a-z0-9_.-]+$/),
    versionId: z.string().min(1),
    versionNumber: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string().default(""),
    policyType: z.enum(["base", "adjustment"]),
    status: commercialConfigurationStatusSchema,
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().optional(),
    rolloutBps: z.number().int().min(0).max(10_000).default(10_000),
    rules: z.array(commissionRuleSchema).min(1),
  })
  .superRefine((policy, context) => {
    if (
      policy.effectiveFrom &&
      policy.effectiveUntil &&
      new Date(policy.effectiveFrom) >= new Date(policy.effectiveUntil)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Commission policy effectiveUntil must be after effectiveFrom.",
      });
    }
    policy.rules.forEach((rule, index) => {
      if (rule.policyId !== policy.id || rule.versionId !== policy.versionId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Commission rule must reference its containing policy/version.",
          path: ["rules", index],
        });
      }
      const expectedKind =
        policy.policyType === "base" ? "commission" : "adjustment";
      if (rule.effect.kind !== expectedKind) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A ${policy.policyType} policy cannot contain a ${rule.effect.kind} rule.`,
          path: ["rules", index, "effect"],
        });
      }
    });
  });
export type CommissionPolicy = z.infer<typeof commissionPolicySchema>;

export const commissionCalculationInputSchema = z.object({
  idempotencyKey: z.string().min(8).max(200).optional(),
  transactionId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  eligibleCommercialEvent: z.boolean().default(false),
  earningEvent: commissionEarningEventSchema,
  effectiveAt: z.string().datetime(),
  quoteExpiresAt: z.string().datetime().optional(),
  marketCode: marketCodeSchema,
  countryCode: z.string().length(2),
  currency: z.string().length(3),
  verticalId: businessVerticalCodeSchema.optional(),
  categoryId: z.string().min(1).optional(),
  subcategoryId: z.string().min(1).optional(),
  transactionType: commissionTransactionTypeSchema,
  sellerType: z.enum(["individual", "professional", "organization"]),
  sellerSegment: z.string().min(1).optional(),
  sellerAccountId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  campaignIds: z.array(z.string().min(1)).default([]),
  paymentMethod: z.string().min(1).optional(),
  itemSubtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative().default(0),
  shippingMinor: z.number().int().nonnegative().default(0),
  taxMinor: z.number().int().nonnegative().default(0),
  buyerFeesMinor: z.number().int().nonnegative().default(0),
  totalMinor: z.number().int().nonnegative(),
  platformCollectedMinor: z.number().int().nonnegative().default(0),
  historicalVolumeMinor: z.number().int().nonnegative().default(0),
});
export type CommissionCalculationInput = z.infer<
  typeof commissionCalculationInputSchema
>;

export const commissionResolutionExplanationSchema = z.object({
  policyId: z.string(),
  ruleId: z.string(),
  policyName: z.string(),
  ruleName: z.string(),
  matched: z.boolean(),
  precedence: z.number().int(),
  reasonCode: z.string(),
});
export type CommissionResolutionExplanation = z.infer<
  typeof commissionResolutionExplanationSchema
>;

export const commissionCalculationSchema = z.object({
  id: z.string().min(1),
  idempotencyKey: z.string().optional(),
  configurationVersionId: z.string().min(1),
  transactionId: z.string().optional(),
  orderId: z.string().optional(),
  state: z.enum([
    "quoted",
    "earned",
    "partially_reversed",
    "reversed",
    "cancelled",
  ]),
  eligible: z.boolean(),
  reasonCode: z.string(),
  currency: z.string().length(3),
  baseAmountMinor: z.number().int().nonnegative(),
  grossCommissionMinor: z.number().int().nonnegative(),
  adjustmentMinor: z.number().int().nonnegative(),
  netCommissionExcludingTaxMinor: z.number().int().nonnegative(),
  commissionTaxMinor: z.number().int().nonnegative(),
  totalCommissionMinor: z.number().int().nonnegative(),
  sellerChargeMinor: z.number().int().nonnegative(),
  buyerChargeMinor: z.number().int().nonnegative(),
  platformAbsorbedMinor: z.number().int().nonnegative(),
  platformRevenueMinor: z.number().int().nonnegative(),
  sellerPayableMinor: z.number().int().nonnegative(),
  buyerTotalMinor: z.number().int().nonnegative(),
  appliedPolicyId: z.string().optional(),
  appliedPolicyVersionId: z.string().optional(),
  appliedRuleId: z.string().optional(),
  appliedAdjustmentRuleIds: z.array(z.string()),
  effectSnapshot: commissionEffectSchema.optional(),
  inputSnapshot: commissionCalculationInputSchema,
  explanation: z.array(commissionResolutionExplanationSchema),
  calculatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  snapshotHash: z.string().min(16),
});
export type CommissionCalculation = z.infer<typeof commissionCalculationSchema>;

export const commissionRefundRequestSchema = z.object({
  calculation: commissionCalculationSchema,
  refundBaseMinor: z.number().int().nonnegative(),
  previouslyReversedBaseMinor: z.number().int().nonnegative().default(0),
  previouslyReversedCommissionMinor: z.number().int().nonnegative().default(0),
  previouslyReversedTaxMinor: z.number().int().nonnegative().default(0),
  previouslyCreditedSellerMinor: z.number().int().nonnegative().default(0),
  previouslyCreditedBuyerMinor: z.number().int().nonnegative().default(0),
  previouslyReversedRevenueMinor: z.number().int().nonnegative().default(0),
  idempotencyKey: z.string().min(8).max(200),
  occurredAt: z.string().datetime(),
});
export type CommissionRefundRequest = z.infer<
  typeof commissionRefundRequestSchema
>;

export const commissionReversalSchema = z.object({
  id: z.string().min(1),
  calculationId: z.string().min(1),
  idempotencyKey: z.string().min(8),
  reversedBaseMinor: z.number().int().nonnegative(),
  reversedCommissionMinor: z.number().int().nonnegative(),
  reversedTaxMinor: z.number().int().nonnegative(),
  sellerCreditMinor: z.number().int().nonnegative(),
  buyerCreditMinor: z.number().int().nonnegative(),
  platformRevenueReversalMinor: z.number().int().nonnegative(),
  state: z.enum([
    "partially_reversed",
    "reversed",
    "retained",
    "manual_review",
  ]),
  occurredAt: z.string().datetime(),
  snapshotHash: z.string().min(16),
});
export type CommissionReversal = z.infer<typeof commissionReversalSchema>;

export const commissionAnalyticsRowSchema = z.object({
  date: z.string().date(),
  marketCode: marketCodeSchema,
  verticalId: businessVerticalCodeSchema.optional(),
  categoryId: z.string().optional(),
  planId: z.string().optional(),
  currency: z.string().length(3),
  transactionCount: z.number().int().nonnegative(),
  gmvMinor: z.number().int().nonnegative(),
  grossCommissionMinor: z.number().int().nonnegative(),
  commissionDiscountMinor: z.number().int().nonnegative(),
  commissionRevenueMinor: z.number().int(),
  commissionRefundMinor: z.number().int().nonnegative(),
  effectiveTakeRateBps: z.number().int(),
});
export type CommissionAnalyticsRow = z.infer<
  typeof commissionAnalyticsRowSchema
>;

export const commissionAnalyticsQuerySchema = z.object({
  marketCode: z.union([marketCodeSchema, z.literal("ALL")]).default("ALL"),
  currency: z.string().length(3).default("EUR"),
  from: z.string().date(),
  to: z.string().date(),
  verticalId: businessVerticalCodeSchema.optional(),
  categoryId: z.string().optional(),
  planId: z.string().optional(),
});
export type CommissionAnalyticsQuery = z.infer<
  typeof commissionAnalyticsQuerySchema
>;

export const monetizationCatalogSchema = z.object({
  configurationVersionId: z.string(),
  versionNumber: z.number().int().positive(),
  marketCode: marketCodeSchema,
  currency: z.string().length(3),
  generatedAt: z.string().datetime(),
  verticals: z.array(businessVerticalSchema),
  products: z.array(monetizationProductSchema),
  promotions: z.array(promotionSchema),
  rules: z.array(commercialRuleSchema),
  commissionPolicies: z.array(commissionPolicySchema).default([]),
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
  verticalId: businessVerticalCodeSchema.optional(),
  trialDays: z.number().int().positive().optional(),
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const monetizationQuoteSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  configurationVersionId: z.string(),
  marketCode: marketCodeSchema,
  currency: z.string().length(3),
  listingId: z.string().min(1).optional(),
  lines: z.array(quoteLineSchema).min(1),
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  amountDueTodayMinor: z.number().int().nonnegative(),
  nextChargeMinor: z.number().int().nonnegative(),
  nextChargeAt: z.string().datetime().optional(),
  trial: z
    .object({
      productId: z.string(),
      durationDays: z.number().int().positive(),
      endsAt: z.string().datetime(),
      requiresPaymentMethod: z.boolean(),
      autoConverts: z.boolean(),
    })
    .optional(),
  promotionCode: z.string().optional(),
  promotion: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      freePeriodDays: z.number().int().positive().optional(),
      durationBillingPeriods: z.number().int().positive().optional(),
      endsAt: z.string().datetime(),
    })
    .optional(),
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
  verticalId: businessVerticalCodeSchema.optional(),
  mergePolicy: entitlementMergePolicySchema.optional(),
});
export type ActiveEntitlement = z.infer<typeof activeEntitlementSchema>;

export const monetizationSubscriptionSchema = z
  .object({
    id: z.string(),
    accountId: z.string(),
    productId: z.string(),
    productVersionId: z.string().optional(),
    priceId: z.string().optional(),
    sourceOrderId: z.string(),
    status: z.enum([
      "incomplete",
      "trialing",
      "active",
      "past_due",
      "paused",
      "cancellation_pending",
      "cancelled",
      "expired",
      "suspended",
    ]),
    providerSubscriptionId: z.string().optional(),
    billingPeriod: z.enum(["once", "month", "year"]).optional(),
    currentPeriodStart: z.string().datetime(),
    currentPeriodEnd: z.string().datetime(),
    cancelAtPeriodEnd: z.boolean(),
    scheduledProductId: z.string().optional(),
    scheduledPriceId: z.string().optional(),
    scheduledChangeAt: z.string().datetime().optional(),
    gracePeriodEndsAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    verticalId: businessVerticalCodeSchema.optional(),
    familyId: z.string().optional(),
  })
  .superRefine((subscription, context) => {
    if (
      new Date(subscription.currentPeriodEnd) <=
      new Date(subscription.currentPeriodStart)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentPeriodEnd"],
        message: "current period end must follow its start",
      });
    }
    const scheduledFields = [
      subscription.scheduledProductId,
      subscription.scheduledPriceId,
      subscription.scheduledChangeAt,
    ];
    const scheduledCount = scheduledFields.filter(Boolean).length;
    if (scheduledCount !== 0 && scheduledCount !== scheduledFields.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledChangeAt"],
        message: "scheduled subscription changes must be complete",
      });
    }
    if (
      subscription.status === "cancellation_pending" &&
      !subscription.cancelAtPeriodEnd
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelAtPeriodEnd"],
        message: "cancellation pending requires an end-of-period cancellation",
      });
    }
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

export const subscriptionChangeRequestSchema = z.object({
  subscriptionId: z.string().min(1),
  targetProductId: z.string().min(1),
  targetPriceId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(200),
});
export type SubscriptionChangeRequest = z.infer<
  typeof subscriptionChangeRequestSchema
>;

export const subscriptionChangePreviewSchema = z.object({
  subscriptionId: z.string(),
  targetProductId: z.string(),
  targetPriceId: z.string(),
  effectiveAt: z.enum(["immediately", "period_end"]),
  proration: moneySchema,
  tax: moneySchema,
  totalDueNow: moneySchema,
  nextPeriodTotal: moneySchema,
  nextBillingAt: z.string().datetime(),
});
export type SubscriptionChangePreview = z.infer<
  typeof subscriptionChangePreviewSchema
>;

export const billingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  countryCode: z.string().length(2),
});
export type BillingAddress = z.infer<typeof billingAddressSchema>;

export const billingCustomerSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  legalName: z.string(),
  email: z.string().email(),
  taxId: z.string().optional(),
  taxExempt: z.boolean(),
  address: billingAddressSchema.optional(),
  providerCustomerId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type BillingCustomer = z.infer<typeof billingCustomerSchema>;

export const monetizationPaymentSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  orderId: z.string(),
  invoiceId: z.string().optional(),
  status: z.enum([
    "pending",
    "requires_action",
    "succeeded",
    "failed",
    "cancelled",
    "partially_refunded",
    "refunded",
  ]),
  amount: moneySchema,
  provider: z.enum(["demo", "stripe"]),
  providerPaymentId: z.string().optional(),
  failureCode: z.string().optional(),
  failureMessage: z.string().optional(),
  paidAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MonetizationPayment = z.infer<typeof monetizationPaymentSchema>;

export const monetizationInvoiceSchema = z
  .object({
    id: z.string(),
    accountId: z.string(),
    orderId: z.string().optional(),
    subscriptionId: z.string().optional(),
    number: z.string(),
    status: z.enum(["draft", "open", "paid", "void", "uncollectible"]),
    subtotal: moneySchema,
    discount: moneySchema,
    tax: moneySchema,
    total: moneySchema,
    amountPaid: moneySchema,
    amountDue: moneySchema,
    issuedAt: z.string().datetime(),
    dueAt: z.string().datetime().optional(),
    paidAt: z.string().datetime().optional(),
    receiptUrl: z.string().url().optional(),
    providerInvoiceId: z.string().optional(),
  })
  .superRefine((invoice, context) => {
    const currency = invoice.total.currency;
    const currencies = [
      invoice.subtotal.currency,
      invoice.discount.currency,
      invoice.tax.currency,
      invoice.amountPaid.currency,
      invoice.amountDue.currency,
    ];
    if (currencies.some((candidate) => candidate !== currency)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total", "currency"],
        message: "all invoice amounts must use the same currency",
      });
    }
    if (
      invoice.total.amountMinor !==
      invoice.subtotal.amountMinor -
        invoice.discount.amountMinor +
        invoice.tax.amountMinor
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total", "amountMinor"],
        message: "invoice total does not reconcile",
      });
    }
    if (
      invoice.amountPaid.amountMinor + invoice.amountDue.amountMinor !==
      invoice.total.amountMinor
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountDue", "amountMinor"],
        message: "paid and due amounts must equal the invoice total",
      });
    }
  });
export type MonetizationInvoice = z.infer<typeof monetizationInvoiceSchema>;

export const monetizationRefundSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  orderId: z.string(),
  paymentId: z.string(),
  status: z.enum(["pending", "succeeded", "failed", "cancelled"]),
  amount: moneySchema,
  reason: z.string(),
  providerRefundId: z.string().optional(),
  requestedBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MonetizationRefund = z.infer<typeof monetizationRefundSchema>;

export const creditTransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  creditType: z.string().min(1),
  quantity: z
    .number()
    .int()
    .refine((value) => value !== 0),
  reason: z.string().min(1),
  sourceType: z.enum([
    "subscription",
    "purchase",
    "promotion",
    "usage",
    "refund",
    "admin_adjustment",
    "expiry",
  ]),
  sourceId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  idempotencyKey: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type CreditTransaction = z.infer<typeof creditTransactionSchema>;

export const creditBalanceSchema = z.object({
  accountId: z.string(),
  creditType: z.string(),
  available: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  nextExpiryAt: z.string().datetime().optional(),
  transactions: z.array(creditTransactionSchema),
});
export type CreditBalance = z.infer<typeof creditBalanceSchema>;

export const usageRecordSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  subscriptionId: z.string().optional(),
  key: z.string(),
  quantity: z.number().int().positive(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  idempotencyKey: z.string().min(1),
  recordedAt: z.string().datetime(),
});
export type UsageRecord = z.infer<typeof usageRecordSchema>;

export const subscriptionEventSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  accountId: z.string(),
  type: z.enum([
    "created",
    "trial_started",
    "trial_ending",
    "activated",
    "renewal_upcoming",
    "renewed",
    "payment_failed",
    "past_due",
    "change_scheduled",
    "changed",
    "cancellation_scheduled",
    "reactivated",
    "cancelled",
    "paused",
    "resumed",
    "expired",
  ]),
  fromStatus: z.string().optional(),
  toStatus: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().min(1),
  occurredAt: z.string().datetime(),
});
export type SubscriptionEvent = z.infer<typeof subscriptionEventSchema>;

export const billingUsageSchema = z.object({
  key: z.string(),
  label: z.string(),
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative().nullable(),
  unit: z.string(),
  resetsAt: z.string().datetime().optional(),
  verticalId: businessVerticalCodeSchema.optional(),
});
export type BillingUsage = z.infer<typeof billingUsageSchema>;

export const billingOverviewSchema = z.object({
  customer: billingCustomerSchema.optional(),
  currentSubscription: monetizationSubscriptionSchema.optional(),
  subscriptions: z.array(monetizationSubscriptionSchema),
  entitlements: z.array(activeEntitlementSchema),
  usage: z.array(billingUsageSchema),
  orders: z.array(monetizationOrderSchema),
  payments: z.array(monetizationPaymentSchema),
  invoices: z.array(monetizationInvoiceSchema),
  refunds: z.array(monetizationRefundSchema),
  creditBalances: z.array(creditBalanceSchema),
  subscriptionEvents: z.array(subscriptionEventSchema),
  effectiveEntitlements: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        value: z.union([commercialScalarSchema, z.array(z.string())]),
        verticalId: businessVerticalCodeSchema.optional(),
        mergePolicy: entitlementMergePolicySchema,
        sourceProductIds: z.array(z.string()),
      }),
    )
    .default([]),
});
export type BillingOverview = z.infer<typeof billingOverviewSchema>;

export const promotionValidationRequestSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(40)
    .transform((value) => value.toUpperCase()),
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
  discountType: z
    .enum(["fixed", "percentage", "introductory_price", "free_period"])
    .optional(),
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
export type ConfigurationConflict = z.infer<typeof configurationConflictSchema>;

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
export type CommercialAuditEvent = z.infer<typeof commercialAuditEventSchema>;

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
  payments: z.array(monetizationPaymentSchema),
  invoices: z.array(monetizationInvoiceSchema),
  refunds: z.array(monetizationRefundSchema),
  subscriptions: z.array(monetizationSubscriptionSchema),
  creditBalances: z.array(creditBalanceSchema),
  subscriptionEvents: z.array(subscriptionEventSchema),
  auditEvents: z.array(commercialAuditEventSchema),
});
export type MonetizationAdminOverview = z.infer<
  typeof monetizationAdminOverviewSchema
>;

export const commercialDraftPatchSchema = z.object({
  reason: commercialChangeReasonSchema,
  effectiveFrom: z.string().datetime().optional(),
  verticals: z.array(businessVerticalSchema).optional(),
  products: z.array(monetizationProductSchema).optional(),
  rules: z.array(commercialRuleSchema).optional(),
  commissionPolicies: z.array(commissionPolicySchema).optional(),
  promotions: z.array(promotionSchema).optional(),
});
export type CommercialDraftPatch = z.infer<typeof commercialDraftPatchSchema>;
