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

export const businessVerticalCodeSchema = z.enum([
  "general",
  "auto",
  "immo",
  "emploi",
  "cours",
  "services",
]);
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
    "courses_subscription",
    "addon",
    "promotion",
    "marketplace_service",
  ]),
  displayOrder: z.number().int().nonnegative(),
});
export type CommercialPlanProfile = z.infer<
  typeof commercialPlanProfileSchema
>;

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
      .min(-10_000)
      .max(10_000)
      .optional(),
    feeRateBps: z.number().int().min(0).max(10_000).optional(),
    commissionRateBps: z.number().int().min(0).max(10_000).optional(),
    fixedFeeMinor: z.number().int().nonnegative().optional(),
    taxRateBps: z.number().int().min(0).max(10_000).optional(),
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
  providerPriceId: z.string().min(1).optional(),
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

export const promotionSchema = z.object({
  id: z.string().min(1),
  code: z
    .string()
    .min(3)
    .max(40)
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
  durationBillingPeriods: z.number().int().positive().optional(),
  minimumCommitmentPeriods: z.number().int().nonnegative().default(0),
  campaignId: z.string().min(1).optional(),
  providerCouponId: z.string().min(1).optional(),
  verticalIds: z.array(businessVerticalCodeSchema),
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
  reason: z.string().min(8).max(500),
  effectiveFrom: z.string().datetime().optional(),
  products: z.array(monetizationProductSchema).optional(),
  rules: z.array(commercialRuleSchema).optional(),
  promotions: z.array(promotionSchema).optional(),
});
export type CommercialDraftPatch = z.infer<typeof commercialDraftPatchSchema>;
