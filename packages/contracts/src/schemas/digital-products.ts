import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";

export const DIGITAL_ACCESS_REPORT_DESCRIPTION_MIN_LENGTH = 10;
export const DIGITAL_ACCESS_REPORT_DESCRIPTION_MAX_LENGTH = 2_000;
export const DIGITAL_PROVISIONING_TIME_MIN_HOURS = 1;
export const DIGITAL_PROVISIONING_TIME_MAX_HOURS = 24 * 90;

/** Fulfillment is an explicit domain axis and must never be inferred from taxonomy. */
export const fulfillmentTypeSchema = z.enum([
  "PHYSICAL",
  "FILE_DOWNLOAD",
  "ACCESS_LINK",
  "ACCESS_CREDENTIALS",
  "SELLER_PROVISIONED",
]);

export const digitalFulfillmentTypeSchema = fulfillmentTypeSchema.exclude([
  "PHYSICAL",
]);

export const credentialKindSchema = z.enum([
  "LICENSE_KEY",
  "ACTIVATION_CODE",
  "USERNAME",
  "PASSWORD",
  "PIN",
  "TOKEN",
  "STRUCTURED_INSTRUCTIONS",
]);

export const credentialAllocationModeSchema = z.enum([
  "REUSABLE",
  "UNIQUE_INVENTORY",
  "APPROVED_PROVIDER",
  "SELLER_AFTER_PAYMENT",
]);

export const digitalAssetStatusSchema = z.enum([
  "UPLOAD_PENDING",
  "PROCESSING",
  "SCANNING",
  "READY",
  "QUARANTINED",
  "REJECTED",
  "REMOVED",
  "UNAVAILABLE",
]);

export const digitalEntitlementStatusSchema = z.enum([
  "PAYMENT_PENDING",
  "PAYMENT_FAILED",
  "PAYMENT_CANCELLED",
  "FULFILLMENT_PROCESSING",
  "PROVISIONING",
  "PROVISIONING_FAILED",
  "ACCESS_AVAILABLE",
  "DELIVERED",
  "INVALID_ACCESS",
  "QUARANTINED",
  "LIMIT_REACHED",
  "RESET_REQUESTED",
  "REPLACEMENT_REQUESTED",
  "EXPIRED",
  "REFUND_REQUESTED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
  "REVOKED",
  "UNAVAILABLE",
]);

export const digitalFulfillmentVersionInputSchema = z
  .object({
    fulfillmentTypes: z.array(digitalFulfillmentTypeSchema).min(1).max(4),
    primaryFulfillmentType: digitalFulfillmentTypeSchema,
    productVersion: z.string().trim().min(1).max(120),
    buyerFacingDescription: z.string().trim().min(10).max(2_000),
    compatibility: z
      .array(z.string().trim().min(1).max(120))
      .max(30)
      .default([]),
    requirements: z
      .array(z.string().trim().min(1).max(240))
      .max(30)
      .default([]),
    publicTermsLabel: z.string().trim().min(1).max(240).optional(),
    productAccessClass: z.string().trim().min(1).max(120).optional(),
    privateAssetVersionIds: z.array(z.string().uuid()).max(20).default([]),
    accessSecretVersionId: z.string().uuid().optional(),
    credentialBatchIds: z.array(z.string().uuid()).max(20).default([]),
    credentialAllocationMode: credentialAllocationModeSchema.optional(),
    credentialKinds: z.array(credentialKindSchema).max(8).default([]),
    provisioningTimeHours: z
      .number()
      .int()
      .min(DIGITAL_PROVISIONING_TIME_MIN_HOURS)
      .max(DIGITAL_PROVISIONING_TIME_MAX_HOURS)
      .optional(),
    entitlementDurationDays: z.number().int().positive().max(3_650).optional(),
    downloadLimit: z.number().int().positive().max(10_000).optional(),
    revealLimit: z.number().int().positive().max(1_000).optional(),
  })
  .superRefine((value, context) => {
    if (!value.fulfillmentTypes.includes(value.primaryFulfillmentType)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryFulfillmentType"],
        message:
          "The primary fulfillment type must be one of the selected types.",
      });
    }
    if (
      value.fulfillmentTypes.includes("FILE_DOWNLOAD") &&
      value.privateAssetVersionIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["privateAssetVersionIds"],
        message: "At least one ready private asset version is required.",
      });
    }
    if (
      (value.fulfillmentTypes.includes("ACCESS_LINK") ||
        (value.fulfillmentTypes.includes("ACCESS_CREDENTIALS") &&
          value.credentialAllocationMode === "REUSABLE")) &&
      !value.accessSecretVersionId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accessSecretVersionId"],
        message: "A versioned private access record is required.",
      });
    }
    if (
      value.fulfillmentTypes.includes("ACCESS_CREDENTIALS") &&
      (!value.credentialAllocationMode || value.credentialKinds.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["credentialAllocationMode"],
        message: "Credential type and allocation mode are required.",
      });
    }
    if (
      value.fulfillmentTypes.includes("ACCESS_CREDENTIALS") &&
      value.credentialAllocationMode === "UNIQUE_INVENTORY" &&
      value.credentialBatchIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["credentialBatchIds"],
        message: "Unique credential fulfillment requires an inventory batch.",
      });
    }
    if (
      value.credentialAllocationMode === "UNIQUE_INVENTORY" &&
      value.credentialBatchIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["credentialBatchIds"],
        message: "Unique credentials require at least one inventory batch.",
      });
    }
    if (
      value.fulfillmentTypes.includes("SELLER_PROVISIONED") &&
      !value.provisioningTimeHours
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provisioningTimeHours"],
        message: "Seller-provisioned access requires a provisioning time.",
      });
    }
    if (
      value.fulfillmentTypes.some((type) =>
        ["ACCESS_LINK", "ACCESS_CREDENTIALS", "SELLER_PROVISIONED"].includes(
          type,
        ),
      ) &&
      !value.productAccessClass
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productAccessClass"],
        message:
          "Link, credential and provisioned access requires an approved access class.",
      });
    }
  });

const digitalPolicyRequirementSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.record(z.string().min(1)).refine((value) => Boolean(value["fr-FR"])),
  description: z
    .record(z.string().min(1))
    .refine((value) => Boolean(value["fr-FR"])),
});

export const digitalMarketPolicySchema = z.object({
  id: z.string().uuid().optional(),
  marketCode: marketCodeSchema,
  version: z.number().int().positive(),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED", "RETIRED"]),
  enabled: z.boolean(),
  allowedAccountTypes: z.array(z.enum(["individual", "professional"])).max(2),
  allowedSellerTypes: z.array(z.enum(["individual", "professional"])).max(2),
  allowedCategoryIds: z.array(z.string().min(1).max(240)).max(500),
  allowedFulfillmentTypes: z.array(digitalFulfillmentTypeSchema).max(4),
  allowedFulfillmentCombinations: z
    .array(z.array(digitalFulfillmentTypeSchema).min(1).max(4))
    .max(30),
  requiredVerificationDimensions: z.array(z.string().min(1).max(120)).max(30),
  moderationRequired: z.boolean(),
  allowedMimeTypes: z.array(z.string().min(3).max(160)).max(100),
  allowedFileExtensions: z
    .array(z.string().regex(/^\.[a-z0-9]{1,16}$/))
    .max(100),
  maxFileCount: z.number().int().positive().max(100),
  maxFileSizeBytes: z.number().int().positive(),
  maxTotalFileSizeBytes: z.number().int().positive(),
  credentialInventory: z.object({
    reusableAllowed: z.boolean(),
    uniqueAllowed: z.boolean(),
    providerGeneratedAllowed: z.boolean(),
    sellerEnteredAfterPaymentAllowed: z.boolean(),
    minimumAvailableBeforePurchase: z.number().int().nonnegative(),
    allowedKinds: z.array(credentialKindSchema).max(7),
    allowedClasses: z.array(z.string().min(1).max(120)).max(100),
    prohibitedClasses: z.array(z.string().min(1).max(120)).min(1).max(50),
  }),
  externalLinks: z.object({
    allowedSchemes: z.array(z.literal("https")).max(1),
    acceptedDomains: z.array(z.string().min(1).max(253)).max(1_000),
    allowSubdomains: z.boolean(),
    allowQuery: z.boolean(),
    allowFragment: z.boolean(),
  }),
  provisioningDeadlineHours: z
    .number()
    .int()
    .min(DIGITAL_PROVISIONING_TIME_MIN_HOURS)
    .max(DIGITAL_PROVISIONING_TIME_MAX_HOURS),
  defaultEntitlementDurationDays: z.number().int().positive().max(3_650),
  defaultDownloadLimit: z.number().int().positive().max(10_000),
  defaultRevealLimit: z.number().int().positive().max(1_000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  minimumPrice: moneySchema,
  maximumPrice: moneySchema,
  taxPolicyVersion: z.string().min(1).max(160).nullable(),
  refundPolicyVersion: z.string().min(1).max(160).nullable(),
  withdrawalPresentationVersion: z.string().min(1).max(160).nullable(),
  paymentProviderConfigurationId: z.string().min(1).max(200).nullable(),
  legalApprovalId: z.string().min(1).max(200).nullable(),
  capabilities: z.object({
    onboarding: z.boolean(),
    listingDrafts: z.boolean(),
    publication: z.boolean(),
    checkout: z.boolean(),
    fulfillment: z.boolean(),
    nativeCheckout: z.boolean(),
  }),
  refundAccessBehavior: z.enum([
    "REVOKE_ON_REQUEST",
    "REVOKE_ON_REFUND",
    "CONTINUE_UNTIL_REVIEW",
  ]),
  disputeAccessBehavior: z.enum(["REVOKE", "SUSPEND", "CONTINUE_UNTIL_REVIEW"]),
  listingRemovalAccessBehavior: z.enum([
    "REVOKE",
    "SUSPEND",
    "PRESERVE_EXISTING_PURCHASES",
  ]),
  sellerRestrictionAccessBehavior: z.enum([
    "REVOKE",
    "SUSPEND",
    "PRESERVE_EXISTING_PURCHASES",
  ]),
  requirements: z.array(digitalPolicyRequirementSchema).max(50),
  effectiveAt: z.string().datetime({ offset: true }).nullable(),
  approvedAt: z.string().datetime({ offset: true }).nullable(),
});

export const digitalPolicyProjectionSchema = digitalMarketPolicySchema
  .pick({
    marketCode: true,
    version: true,
    status: true,
    enabled: true,
    allowedAccountTypes: true,
    allowedSellerTypes: true,
    allowedCategoryIds: true,
    allowedFulfillmentTypes: true,
    allowedFulfillmentCombinations: true,
    requiredVerificationDimensions: true,
    moderationRequired: true,
    allowedMimeTypes: true,
    allowedFileExtensions: true,
    maxFileCount: true,
    maxFileSizeBytes: true,
    maxTotalFileSizeBytes: true,
    credentialInventory: true,
    provisioningDeadlineHours: true,
    defaultEntitlementDurationDays: true,
    defaultDownloadLimit: true,
    defaultRevealLimit: true,
    currency: true,
    minimumPrice: true,
    maximumPrice: true,
    capabilities: true,
    requirements: true,
  })
  .extend({
    purchaseUnavailableReasons: z.array(z.string().min(1).max(160)).max(20),
  });

export const digitalSellerProfileSchema = z.object({
  sellerId: z.string().min(1),
  marketCode: marketCodeSchema,
  policyVersion: z.number().int().positive(),
  fulfillmentTypes: z.array(fulfillmentTypeSchema).min(1).max(5),
  acceptedAt: z.string().datetime({ offset: true }),
  status: z.enum(["ACTIVE", "REACCEPTANCE_REQUIRED", "SUSPENDED"]),
});

export const digitalAssetProjectionSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().nullable(),
  version: z.number().int().positive(),
  safeFileName: z.string().min(1).max(255),
  contentType: z.string().min(3).max(160),
  sizeBytes: z.number().int().nonnegative(),
  status: digitalAssetStatusSchema,
  scanStatus: z.enum(["PENDING", "SCANNING", "CLEAN", "MALICIOUS", "FAILED"]),
  createdAt: z.string().datetime({ offset: true }),
  readyAt: z.string().datetime({ offset: true }).nullable(),
});

export const digitalInventoryProjectionSchema = z.object({
  listingId: z.string().min(1),
  batchCount: z.number().int().nonnegative(),
  availableCount: z.number().int().nonnegative(),
  reservedCount: z.number().int().nonnegative(),
  consumedCount: z.number().int().nonnegative(),
  canPurchase: z.boolean(),
});

export const maskedSecretFieldSchema = z.object({
  kind: credentialKindSchema,
  label: z.string().min(1).max(120),
  maskedValue: z.string().min(1).max(240),
  revealed: z.boolean(),
});

export const digitalEntitlementProjectionSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().min(1),
  orderItemId: z.string().min(1),
  listingId: z.string().min(1),
  sellerId: z.string().min(1),
  marketCode: marketCodeSchema,
  title: z.string().min(1).max(240),
  fulfillmentTypes: z.array(digitalFulfillmentTypeSchema).min(1).max(4),
  primaryFulfillmentType: digitalFulfillmentTypeSchema,
  productVersion: z.string().min(1).max(120),
  productAccessClass: z.string().min(1).max(120).optional(),
  fulfillmentVersion: z.number().int().positive(),
  status: digitalEntitlementStatusSchema,
  paymentStatus: z.enum([
    "PENDING",
    "CONFIRMED",
    "FAILED",
    "CANCELLED",
    "PARTIALLY_REFUNDED",
    "REFUND_PENDING",
    "REFUNDED",
    "DISPUTED",
    "REVERSED",
  ]),
  price: moneySchema,
  commercialEvidenceId: z.string().min(1).max(240),
  availableAt: z.string().datetime({ offset: true }).nullable(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  downloadLimit: z.number().int().positive().nullable(),
  downloadsUsed: z.number().int().nonnegative(),
  revealLimit: z.number().int().positive().nullable(),
  revealsUsed: z.number().int().nonnegative(),
  destinationDomain: z.string().max(253).nullable(),
  files: z.array(digitalAssetProjectionSchema).max(20),
  maskedSecrets: z.array(maskedSecretFieldSchema).max(30),
  provisioningDeadlineAt: z.string().datetime({ offset: true }).nullable(),
  supportAvailable: z.boolean(),
  replacementAvailable: z.boolean(),
  simulated: z.boolean().default(false),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const digitalAccessGrantSchema = z.object({
  id: z.string().uuid(),
  entitlementId: z.string().uuid(),
  action: z.enum(["DOWNLOAD", "OPEN_LINK", "REVEAL_SECRET"]),
  expiresAt: z.string().datetime({ offset: true }),
  consumePath: z.string().startsWith("/api/v1/digital/access-grants/"),
  fileName: z.string().max(255).optional(),
  destinationDomain: z.string().max(253).optional(),
});

export const digitalProvisioningTaskSchema = z.object({
  id: z.string().uuid(),
  entitlementId: z.string().uuid(),
  orderId: z.string().min(1),
  listingId: z.string().min(1),
  marketCode: marketCodeSchema,
  title: z.string().min(1).max(240),
  productVersion: z.string().min(1).max(120),
  productAccessClass: z.string().min(1).max(120),
  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "RETRY_PENDING",
    "COMPLETED",
    "FAILED",
    "ESCALATED",
    "CANCELLED",
  ]),
  deadlineAt: z.string().datetime({ offset: true }),
  attemptCount: z.number().int().nonnegative(),
  nextAttemptAt: z.string().datetime({ offset: true }).nullable(),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  failureCode: z.string().max(120).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const revealedDigitalAccessSchema = z.object({
  entitlementId: z.string().uuid(),
  fields: z.array(
    z.object({
      kind: credentialKindSchema,
      label: z.string().min(1).max(120),
      value: z.string().min(1).max(16_384),
    }),
  ),
  revealedAt: z.string().datetime({ offset: true }),
  remainingReveals: z.number().int().nonnegative().nullable(),
});

export type FulfillmentType = z.infer<typeof fulfillmentTypeSchema>;
export type DigitalFulfillmentType = z.infer<
  typeof digitalFulfillmentTypeSchema
>;
export type CredentialKind = z.infer<typeof credentialKindSchema>;
export type CredentialAllocationMode = z.infer<
  typeof credentialAllocationModeSchema
>;
export type DigitalAssetStatus = z.infer<typeof digitalAssetStatusSchema>;
export type DigitalEntitlementStatus = z.infer<
  typeof digitalEntitlementStatusSchema
>;
export type DigitalFulfillmentVersionInput = z.infer<
  typeof digitalFulfillmentVersionInputSchema
>;
export type DigitalMarketPolicy = z.infer<typeof digitalMarketPolicySchema>;
export type DigitalPolicyProjection = z.infer<
  typeof digitalPolicyProjectionSchema
>;
export type DigitalSellerProfile = z.infer<typeof digitalSellerProfileSchema>;
export type DigitalAssetProjection = z.infer<
  typeof digitalAssetProjectionSchema
>;
export type DigitalInventoryProjection = z.infer<
  typeof digitalInventoryProjectionSchema
>;
export type DigitalEntitlementProjection = z.infer<
  typeof digitalEntitlementProjectionSchema
>;
export type DigitalAccessGrant = z.infer<typeof digitalAccessGrantSchema>;
export type DigitalProvisioningTask = z.infer<
  typeof digitalProvisioningTaskSchema
>;
export type RevealedDigitalAccess = z.infer<typeof revealedDigitalAccessSchema>;
