import { z } from "zod";
import { organizationProductAccessSchema } from "./product-access";

const idSchema = z.string().min(1).max(160);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
const marketCodeSchema = z.string().regex(/^[A-Z]{2}$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const localeSchema = z.string().min(2).max(32);
const timezoneSchema = z.string().min(3).max(80);
export const INVOICING_LINE_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Positive decimal value with at most six fractional digits. It remains a
 * string across public boundaries so JavaScript floating point never becomes
 * authoritative for quantities or sub-minor prices.
 */
export const invoicingDecimalSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,17})(\.\d{1,6})?$/);

export const invoicingScopeSchema = z.enum([
  "PLATFORM_GLOBAL",
  "MARKET_SCOPED",
  "MULTI_MARKET_SHARED",
]);

export const invoicingMoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: currencySchema,
});

export const invoicingIdentifierSchema = z.object({
  id: idSchema,
  type: z.string().min(1).max(80),
  countryCode: countryCodeSchema,
  value: z.string().min(1).max(180),
  issuingAuthority: z.string().max(180).optional(),
  verificationStatus: z.enum([
    "unverified",
    "pending",
    "verified",
    "rejected",
    "expired",
  ]),
  verifiedAt: isoDateTimeSchema.optional(),
  verificationSource: z.string().max(160).optional(),
});

export const invoicingPostalAddressSchema = z.object({
  line1: z.string().min(1).max(240),
  line2: z.string().max(240).optional(),
  postalCode: z.string().min(1).max(32),
  city: z.string().min(1).max(120),
  countryCode: countryCodeSchema,
});

export const invoicingLegalEntitySchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  scope: z.literal("MULTI_MARKET_SHARED"),
  legalName: z.string().min(1).max(240),
  tradingName: z.string().max(240).optional(),
  legalForm: z.string().max(120).optional(),
  countryCode: countryCodeSchema,
  defaultMarketCode: marketCodeSchema,
  defaultCurrency: currencySchema,
  defaultLocale: localeSchema,
  timezone: timezoneSchema,
  registeredAddress: invoicingPostalAddressSchema,
  identifiers: z.array(invoicingIdentifierSchema),
  verificationStatus: z.enum(["unverified", "pending", "verified", "rejected"]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const createInvoicingLegalEntitySchema = z.object({
  tenantId: idSchema,
  legalName: z.string().min(1).max(240),
  tradingName: z.string().max(240).optional(),
  legalForm: z.string().max(120).optional(),
  countryCode: countryCodeSchema,
  defaultMarketCode: marketCodeSchema,
  defaultCurrency: currencySchema,
  defaultLocale: localeSchema,
  timezone: timezoneSchema,
  registeredAddress: invoicingPostalAddressSchema,
  identifiers: z
    .array(
      invoicingIdentifierSchema.omit({
        id: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationSource: true,
      }),
    )
    .max(20)
    .default([]),
});

export const bootstrapInvoicingLegalEntitySchema = z.object({
  tenantId: idSchema,
  marketCode: marketCodeSchema,
});

export const invoicingPartyRoleSchema = z.enum(["customer", "supplier"]);

export const invoicingPartySchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  scope: z.literal("MULTI_MARKET_SHARED"),
  kind: z.enum([
    "company",
    "association",
    "sole_proprietor",
    "public_body",
    "individual",
    "foreign_entity",
  ]),
  roles: z.array(invoicingPartyRoleSchema).min(1),
  legalName: z.string().min(1).max(240),
  tradingName: z.string().max(240).optional(),
  billingAddress: invoicingPostalAddressSchema,
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  locale: localeSchema,
  preferredCurrency: currencySchema,
  paymentTermsDays: z.number().int().min(0).max(365),
  identifiers: z.array(invoicingIdentifierSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const createInvoicingPartySchema = z.object({
  tenantId: idSchema,
  kind: invoicingPartySchema.shape.kind,
  roles: z.array(invoicingPartyRoleSchema).min(1),
  legalName: z.string().min(1).max(240),
  tradingName: z.string().max(240).optional(),
  billingAddress: invoicingPostalAddressSchema,
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  locale: localeSchema,
  preferredCurrency: currencySchema,
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  identifiers: z
    .array(
      invoicingIdentifierSchema.omit({
        id: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationSource: true,
      }),
    )
    .max(20)
    .default([]),
});

export const invoicingDocumentTypeSchema = z.enum([
  "standard_invoice",
  "deposit_invoice",
  "final_invoice",
  "recurring_invoice",
  "credit_note",
  "supplier_invoice",
]);

export const invoicingOriginSchema = z.enum([
  "MANUAL",
  "SHONGRE_SUBSCRIPTION",
  "MARKETPLACE_COMMISSION",
  "API",
  "RECURRING",
  "IMPORT",
  "EXTERNAL_INTEGRATION",
]);

export const invoicingCommercialStateSchema = z.enum([
  "DRAFT",
  "VALIDATION_REQUIRED",
  "READY_TO_FINALIZE",
  "FINALIZED",
  "FINALIZATION_FAILED",
  "CREDITED",
]);

export const invoicingElectronicStateSchema = z.enum([
  "NOT_APPLICABLE",
  "NOT_REQUESTED",
  "CONFIGURATION_REQUIRED",
  "VALIDATION_PENDING",
  "VALIDATION_FAILED",
  "READY_TO_SUBMIT",
  "SUBMISSION_PENDING",
  "SUBMITTED_UNCONFIRMED",
  "ACCEPTED",
  "REJECTED",
  "REFUSED",
  "MANUAL_RECONCILIATION",
]);

export const invoicingPaymentStateSchema = z.enum([
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "OVERPAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

export const invoicingLineInputSchema = z.object({
  description: z.string().min(1).max(INVOICING_LINE_DESCRIPTION_MAX_LENGTH),
  quantity: invoicingDecimalSchema.refine((value) => value !== "0", {
    message: "Quantity must be greater than zero.",
  }),
  unit: z.string().min(1).max(40),
  unitPriceMinorDecimal: invoicingDecimalSchema,
  taxRateBps: z.number().int().min(0).max(100_000),
  taxCategory: z.enum([
    "STANDARD",
    "REDUCED",
    "ZERO",
    "EXEMPT",
    "REVERSE_CHARGE",
    "OUT_OF_SCOPE",
  ]),
  exemptionReasonCode: z.string().max(80).optional(),
  exemptionReason: z.string().max(500).optional(),
});

export const invoicingLineSchema = invoicingLineInputSchema.extend({
  id: idSchema,
  position: z.number().int().positive(),
  netAmountMinor: z.number().int(),
  taxAmountMinor: z.number().int(),
  grossAmountMinor: z.number().int(),
});

export const invoicingTaxBreakdownSchema = z.object({
  taxRateBps: z.number().int().min(0).max(100_000),
  taxCategory: invoicingLineInputSchema.shape.taxCategory,
  taxableAmountMinor: z.number().int(),
  taxAmountMinor: z.number().int(),
});

export const createInvoicingInvoiceSchema = z
  .object({
    tenantId: idSchema,
    legalEntityId: idSchema,
    customerPartyId: idSchema,
    documentType: invoicingDocumentTypeSchema.default("standard_invoice"),
    marketCode: marketCodeSchema,
    countryCode: countryCodeSchema,
    locale: localeSchema,
    timezone: timezoneSchema,
    currency: currencySchema,
    issueDate: isoDateSchema,
    dueDate: isoDateSchema,
    servicePeriodStart: isoDateSchema.optional(),
    servicePeriodEnd: isoDateSchema.optional(),
    purchaseOrderReference: z.string().max(160).optional(),
    customerReference: z.string().max(160).optional(),
    notes: z.string().max(4000).optional(),
    origin: invoicingOriginSchema,
    relatedInvoiceId: idSchema.optional(),
    lines: z.array(invoicingLineInputSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    if (value.dueDate < value.issueDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "Due date cannot be before issue date.",
      });
    }
    if (
      value.servicePeriodStart &&
      value.servicePeriodEnd &&
      value.servicePeriodEnd < value.servicePeriodStart
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["servicePeriodEnd"],
        message: "Service-period end cannot be before its start.",
      });
    }
    value.lines.forEach((line, index) => {
      if (
        ["EXEMPT", "REVERSE_CHARGE"].includes(line.taxCategory) &&
        !line.exemptionReason
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", index, "exemptionReason"],
          message: "A reason is required for this tax category.",
        });
      }
    });
    if (value.documentType === "credit_note" && !value.relatedInvoiceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedInvoiceId"],
        message: "A credit note must reference its original invoice.",
      });
    }
  });

export const updateInvoicingInvoiceDraftSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    customerPartyId: idSchema,
    issueDate: isoDateSchema,
    dueDate: isoDateSchema,
    servicePeriodStart: isoDateSchema.optional(),
    servicePeriodEnd: isoDateSchema.optional(),
    purchaseOrderReference: z.string().max(160).optional(),
    customerReference: z.string().max(160).optional(),
    notes: z.string().max(4000).optional(),
    lines: z.array(invoicingLineInputSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    if (value.dueDate < value.issueDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "Due date cannot be before issue date.",
      });
    }
    if (
      value.servicePeriodStart &&
      value.servicePeriodEnd &&
      value.servicePeriodEnd < value.servicePeriodStart
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["servicePeriodEnd"],
        message: "Service-period end cannot be before its start.",
      });
    }
    value.lines.forEach((line, index) => {
      if (
        ["EXEMPT", "REVERSE_CHARGE"].includes(line.taxCategory) &&
        !line.exemptionReason
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", index, "exemptionReason"],
          message: "A reason is required for this tax category.",
        });
      }
    });
  });

export const invoicingInvoiceSchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  legalEntityId: idSchema,
  customerPartyId: idSchema,
  scope: z.literal("MARKET_SCOPED"),
  documentType: invoicingDocumentTypeSchema,
  origin: invoicingOriginSchema,
  relatedInvoiceId: idSchema.optional(),
  number: z.string().max(120).optional(),
  marketCode: marketCodeSchema,
  countryCode: countryCodeSchema,
  locale: localeSchema,
  timezone: timezoneSchema,
  currency: currencySchema,
  issueDate: isoDateSchema,
  dueDate: isoDateSchema,
  servicePeriodStart: isoDateSchema.optional(),
  servicePeriodEnd: isoDateSchema.optional(),
  purchaseOrderReference: z.string().max(160).optional(),
  customerReference: z.string().max(160).optional(),
  notes: z.string().max(4000).optional(),
  commercialState: invoicingCommercialStateSchema,
  electronicState: invoicingElectronicStateSchema,
  paymentState: invoicingPaymentStateSchema,
  accountingExportState: z.enum(["NOT_EXPORTED", "EXPORT_PENDING", "EXPORTED"]),
  customerReviewState: z.enum([
    "NOT_REQUESTED",
    "PENDING",
    "ACCEPTED",
    "DISPUTED",
  ]),
  lines: z.array(invoicingLineSchema),
  taxBreakdowns: z.array(invoicingTaxBreakdownSchema),
  subtotal: invoicingMoneySchema,
  taxTotal: invoicingMoneySchema,
  total: invoicingMoneySchema,
  outstanding: invoicingMoneySchema,
  version: z.number().int().positive(),
  snapshotDigest: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  finalizedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const invoicingDocumentSchema = z.object({
  id: idSchema,
  invoiceId: idSchema,
  fileName: z.string().min(1).max(240),
  mediaType: z.string().min(1).max(120),
  format: z.enum(["TEXT_V1", "PDF", "FACTUR_X", "UBL", "CII"]),
  legalOriginal: z.boolean(),
  digestAlgorithm: z.literal("SHA-256"),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  generatorVersion: z.string().min(1).max(80),
  templateVersion: z.string().min(1).max(80),
  complianceRulesetVersion: z.string().min(1).max(120),
  generatedAt: isoDateTimeSchema,
  content: z.string(),
});

export const invoicingTenantSummarySchema = z.object({
  id: idSchema,
  legalName: z.string().min(1).max(240),
  countryCode: countryCodeSchema,
  membershipRole: z.string().min(1).max(40),
  capabilities: z.array(z.string()),
  productAccess: organizationProductAccessSchema.extend({
    productId: z.literal("facturation"),
    entitlementKey: z.literal("invoicing.enabled"),
  }),
});

export const invoicingReadinessItemSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(240),
  status: z.enum([
    "missing",
    "configured",
    "externally_verified",
    "sandbox_tested",
    "production_tested",
    "legally_reviewed",
    "not_applicable",
  ]),
  blocking: z.boolean(),
});

export const invoicingWorkspaceSchema = z.object({
  scope: z.literal("MULTI_MARKET_SHARED"),
  activeMarketCode: marketCodeSchema,
  tenants: z.array(invoicingTenantSummarySchema),
  legalEntities: z.array(invoicingLegalEntitySchema),
  recentInvoices: z.array(invoicingInvoiceSchema),
  readiness: z.array(invoicingReadinessItemSchema),
  electronicTransport: z.object({
    mode: z.literal("COMPATIBLE_SOLUTION"),
    status: z.enum([
      "CONFIGURATION_REQUIRED",
      "SANDBOX_ONLY",
      "COMING_SOON",
      "SUPPORTED",
    ]),
    providerId: z.string().optional(),
  }),
});

export const finalizeInvoicingInvoiceSchema = z.object({
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(255),
});

export const invoicingPageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  nextCursor: z.string().optional(),
});

export const invoicingInvoicePageSchema = z.object({
  items: z.array(invoicingInvoiceSchema),
  pageInfo: invoicingPageInfoSchema,
});

export type InvoicingMoney = z.infer<typeof invoicingMoneySchema>;
export type InvoicingIdentifier = z.infer<typeof invoicingIdentifierSchema>;
export type InvoicingPostalAddress = z.infer<
  typeof invoicingPostalAddressSchema
>;
export type InvoicingLegalEntity = z.infer<typeof invoicingLegalEntitySchema>;
export type CreateInvoicingLegalEntity = z.infer<
  typeof createInvoicingLegalEntitySchema
>;
export type BootstrapInvoicingLegalEntity = z.infer<
  typeof bootstrapInvoicingLegalEntitySchema
>;
export type InvoicingParty = z.infer<typeof invoicingPartySchema>;
export type CreateInvoicingParty = z.infer<typeof createInvoicingPartySchema>;
export type InvoicingLineInput = z.infer<typeof invoicingLineInputSchema>;
export type InvoicingLine = z.infer<typeof invoicingLineSchema>;
export type InvoicingTaxBreakdown = z.infer<typeof invoicingTaxBreakdownSchema>;
export type CreateInvoicingInvoice = z.infer<
  typeof createInvoicingInvoiceSchema
>;
export type UpdateInvoicingInvoiceDraft = z.infer<
  typeof updateInvoicingInvoiceDraftSchema
>;
export type InvoicingInvoice = z.infer<typeof invoicingInvoiceSchema>;
export type InvoicingDocument = z.infer<typeof invoicingDocumentSchema>;
export type InvoicingWorkspace = z.infer<typeof invoicingWorkspaceSchema>;
export type InvoicingTenantSummary = z.infer<
  typeof invoicingTenantSummarySchema
>;
export type FinalizeInvoicingInvoice = z.infer<
  typeof finalizeInvoicingInvoiceSchema
>;
export type InvoicingInvoicePage = z.infer<typeof invoicingInvoicePageSchema>;
