import { z } from "zod";

/**
 * Public compliance vocabulary shared by the backend and the frontend adapters.
 * It deliberately contains decisions and provider-safe references, never raw
 * identity documents, tax identifiers, bank account numbers, or risk scores.
 */
export const VERIFICATION_DIMENSIONS = [
  "email",
  "phone",
  "identity",
  "age",
  "address",
  "business",
  "business_representative",
  "beneficial_owner",
  "tax",
  "vat",
  "bank_account",
  "payout",
  "payment",
  "professional_status",
  "document",
  "risk",
  "enhanced_review",
  "mfa",
] as const;
export type VerificationDimension = (typeof VERIFICATION_DIMENSIONS)[number];

export const VERIFICATION_STATES = [
  "not_required",
  "required",
  "pending",
  "processing",
  "verified",
  "failed",
  "expired",
  "needs_update",
  "manual_review",
  "rejected",
] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const COMPLIANCE_ACTIONS = [
  "browse",
  "create_account",
  "save_favorite",
  "message_seller",
  "publish_listing",
  "publish_professional_listing",
  "promote_listing",
  "create_organization",
  "accept_online_payment",
  "receive_payout",
  "complete_tax_due_diligence",
] as const;
export type ComplianceAction = (typeof COMPLIANCE_ACTIONS)[number];

export const MARKETPLACE_CAPABILITIES = [
  "browse",
  "saveFavorite",
  "messageSeller",
  "publishListing",
  "publishProfessionalListing",
  "promoteListing",
  "createOrganization",
  "acceptOnlinePayment",
  "receivePayout",
] as const;
export type MarketplaceCapability = (typeof MARKETPLACE_CAPABILITIES)[number];

export const RISK_LEVELS = ["NORMAL", "ELEVATED", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const VISIBILITY_CLASSES = [
  "PUBLIC",
  "ACCOUNT_OWNER_ONLY",
  "TEAM_ADMIN_ONLY",
  "COMPLIANCE_ONLY",
  "PROVIDER_ONLY",
  "LEGAL_DISCLOSURE_ONLY",
] as const;
export type ComplianceVisibility = (typeof VISIBILITY_CLASSES)[number];

export const verificationRecordSchema = z.object({
  dimension: z.enum(VERIFICATION_DIMENSIONS),
  state: z.enum(VERIFICATION_STATES),
  provider: z.string().max(80).optional(),
  providerReference: z.string().max(255).optional(),
  method: z.string().max(100).optional(),
  verifiedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  lastCheckedAt: z.string().datetime().optional(),
  refreshRequiredAt: z.string().datetime().optional(),
  reasonCode: z.string().max(120).optional(),
  visibility: z.enum(VISIBILITY_CLASSES).default("ACCOUNT_OWNER_ONLY"),
});
export type VerificationRecord = z.infer<typeof verificationRecordSchema>;

export const complianceEvaluationInputSchema = z.object({
  requestedAction: z.enum(COMPLIANCE_ACTIONS),
  jurisdiction: z.string().length(2).default("FR"),
  marketCode: z.string().min(2).max(10).default("FR"),
  categoryId: z.string().max(100).optional(),
  subcategoryId: z.string().max(100).optional(),
  transactionContext: z
    .object({
      transactionType: z
        .enum(["classified", "reservation", "direct_purchase", "service_booking"])
        .optional(),
      contractConclusionMode: z.enum(["off_platform", "platform", "unknown"]).optional(),
      paymentMethod: z.string().max(50).optional(),
      paymentFlow: z
        .enum(["none", "redirect_to_psp", "psp_marketplace", "platform_collects", "unknown"])
        .optional(),
      amountMinor: z.number().int().nonnegative().optional(),
      currency: z.string().length(3).optional(),
      annualActivityMinor: z.number().int().nonnegative().optional(),
      annualTransactionCount: z.number().int().nonnegative().optional(),
      considerationKnown: z.boolean().optional(),
    })
    .optional(),
  riskContext: z
    .object({
      level: z.enum(RISK_LEVELS),
      reasonCodes: z.array(z.string().max(120)).default([]),
      humanReviewAvailable: z.boolean().default(true),
    })
    .optional(),
  evaluatedAt: z.string().datetime().optional(),
});
export type ComplianceEvaluationInput = z.infer<
  typeof complianceEvaluationInputSchema
>;

export interface ComplianceSubject {
  userId?: string;
  accountType: "guest" | "individual" | "professional" | "staff";
  sellerType?: "individual" | "professional";
  businessStatus?: "none" | "declared" | "registered";
  country: string;
  accountAgeDays?: number;
  verification: Partial<Record<VerificationDimension, VerificationRecord>>;
}

export interface ComplianceRuleConditions {
  accountTypes?: ComplianceSubject["accountType"][];
  sellerTypes?: NonNullable<ComplianceSubject["sellerType"]>[];
  categories?: string[];
  transactionTypes?: NonNullable<
    ComplianceEvaluationInput["transactionContext"]
  >["transactionType"][];
  contractConclusionModes?: NonNullable<
    NonNullable<ComplianceEvaluationInput["transactionContext"]>["contractConclusionMode"]
  >[];
  paymentFlows?: NonNullable<
    NonNullable<ComplianceEvaluationInput["transactionContext"]>["paymentFlow"]
  >[];
  riskLevels?: RiskLevel[];
  minAmountMinor?: number;
  minAnnualActivityMinor?: number;
  minAnnualTransactionCount?: number;
  maxAccountAgeDays?: number;
}

export interface ComplianceRule {
  id: string;
  jurisdiction: string;
  regulation: string;
  ruleCode: string;
  description: string;
  action: ComplianceAction;
  conditions: ComplianceRuleConditions;
  requiredChecks: VerificationDimension[];
  recommendedChecks: VerificationDimension[];
  reasonCodes: string[];
  legalBasis: string[];
  sourceReferences: string[];
  policyVersion: string;
  governance: "LEGAL_MANDATE" | "BUSINESS_POLICY" | "RISK_CONTROL";
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "RETIRED" | "LEGAL_REVIEW_REQUIRED";
  effectiveFrom: string;
  effectiveUntil?: string;
  priority: number;
  reviewedBy?: string;
  reviewedAt?: string;
}

export const complianceRuleSchema = z.object({
  id: z.string().min(1).max(180),
  jurisdiction: z.string().min(1).max(2),
  regulation: z.string().min(1).max(120),
  ruleCode: z.string().min(1).max(180),
  description: z.string().min(1).max(2_000),
  action: z.enum(COMPLIANCE_ACTIONS),
  conditions: z
    .object({
      accountTypes: z
        .array(z.enum(["guest", "individual", "professional", "staff"]))
        .optional(),
      sellerTypes: z.array(z.enum(["individual", "professional"])).optional(),
      categories: z.array(z.string().max(100)).optional(),
      transactionTypes: z
        .array(z.enum(["classified", "reservation", "direct_purchase", "service_booking"]))
        .optional(),
      contractConclusionModes: z
        .array(z.enum(["off_platform", "platform", "unknown"]))
        .optional(),
      paymentFlows: z
        .array(
          z.enum([
            "none",
            "redirect_to_psp",
            "psp_marketplace",
            "platform_collects",
            "unknown",
          ]),
        )
        .optional(),
      riskLevels: z.array(z.enum(RISK_LEVELS)).optional(),
      minAmountMinor: z.number().int().nonnegative().optional(),
      minAnnualActivityMinor: z.number().int().nonnegative().optional(),
      minAnnualTransactionCount: z.number().int().nonnegative().optional(),
      maxAccountAgeDays: z.number().int().nonnegative().optional(),
    })
    .strict(),
  requiredChecks: z.array(z.enum(VERIFICATION_DIMENSIONS)),
  recommendedChecks: z.array(z.enum(VERIFICATION_DIMENSIONS)),
  reasonCodes: z.array(z.string().max(120)),
  legalBasis: z.array(z.string().max(240)),
  sourceReferences: z.array(z.string().url().max(2_000)),
  policyVersion: z.string().min(1).max(120),
  governance: z.enum(["LEGAL_MANDATE", "BUSINESS_POLICY", "RISK_CONTROL"]),
  status: z.enum([
    "DRAFT",
    "SCHEDULED",
    "ACTIVE",
    "RETIRED",
    "LEGAL_REVIEW_REQUIRED",
  ]),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  priority: z.number().int(),
  reviewedBy: z.string().uuid().optional(),
  reviewedAt: z.string().datetime().optional(),
});

export interface ComplianceRequirementDecision {
  requestedAction: ComplianceAction;
  capability: MarketplaceCapability;
  allowed: boolean;
  required: VerificationDimension[];
  recommended: VerificationDimension[];
  missing: VerificationDimension[];
  blocking: VerificationDimension[];
  pending: VerificationDimension[];
  reasonCodes: string[];
  legalBasis: string[];
  applicableRuleIds: string[];
  policyVersions: string[];
  nextRequirement: VerificationDimension | null;
  legalReviewRequired: boolean;
  evaluatedAt: string;
}

export const MANUAL_REVIEW_STATES = [
  "OPEN",
  "ASSIGNED",
  "WAITING_FOR_USER",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "ESCALATED",
  "CLOSED",
] as const;
export type ManualReviewState = (typeof MANUAL_REVIEW_STATES)[number];

export interface ManualReviewCase {
  id: string;
  userId: string;
  dimension: VerificationDimension;
  state: ManualReviewState;
  reasonCode: string;
  assignedTo?: string;
  openedAt: string;
  updatedAt: string;
  decisionReason?: string;
}

export interface ComplianceAuditEvent {
  id: string;
  userId: string;
  eventType:
    | "verification_requested"
    | "verification_started"
    | "provider_status_received"
    | "manual_review_requested"
    | "manual_review_completed"
    | "verification_expired"
    | "verification_refreshed"
    | "policy_evaluated"
    | "retention_action";
  dimension?: VerificationDimension;
  actorType: "USER" | "STAFF" | "PROVIDER" | "SYSTEM";
  actorId?: string;
  occurredAt: string;
  policyVersion?: string;
  reasonCode?: string;
  previousState?: VerificationState;
  newState?: VerificationState;
  providerReference?: string;
}

export interface ComplianceRetentionPolicy {
  dataClass: string;
  purpose: string;
  legalBasis: string;
  activeRetentionDays: number;
  archiveRetentionDays: number;
  terminalAction: "DELETE" | "ANONYMIZE" | "RESTRICTED_ARCHIVE";
  visibility: ComplianceVisibility;
  policyVersion: string;
}

export const complianceWebhookEnvelopeSchema = z.object({
  eventId: z.string().min(1).max(255),
  eventType: z.string().min(1).max(120),
  providerReference: z.string().min(1).max(255),
  userId: z.string().min(1).max(255),
  dimension: z.enum(VERIFICATION_DIMENSIONS),
  state: z.enum(VERIFICATION_STATES),
  occurredAt: z.string().datetime(),
});
export type ComplianceWebhookEnvelope = z.infer<
  typeof complianceWebhookEnvelopeSchema
>;
