import type {
  ComplianceAction,
  ComplianceEvaluationInput,
  ComplianceRequirementDecision,
  ComplianceRule,
  ComplianceRuleConditions,
  ComplianceSubject,
  MarketplaceCapability,
  VerificationDimension,
} from "@shongre/contracts/compliance";

const ACTION_CAPABILITY: Record<ComplianceAction, MarketplaceCapability> = {
  browse: "browse",
  create_account: "saveFavorite",
  save_favorite: "saveFavorite",
  message_seller: "messageSeller",
  publish_listing: "publishListing",
  publish_professional_listing: "publishProfessionalListing",
  promote_listing: "promoteListing",
  create_organization: "createOrganization",
  accept_online_payment: "acceptOnlinePayment",
  receive_payout: "receivePayout",
  complete_tax_due_diligence: "receivePayout",
};

const INCOMPLETE_STATES = new Set([
  "not_required",
  "required",
  "failed",
  "expired",
  "needs_update",
  "rejected",
]);
const PENDING_STATES = new Set(["pending", "processing", "manual_review"]);

function includesWhenPresent<T>(allowed: T[] | undefined, actual: T | undefined) {
  return !allowed?.length || (actual !== undefined && allowed.includes(actual));
}

function meetsMinimum(minimum: number | undefined, actual: number | undefined) {
  return minimum === undefined || (actual !== undefined && actual >= minimum);
}

function ruleMatches(
  rule: ComplianceRule,
  subject: ComplianceSubject,
  input: ComplianceEvaluationInput,
  evaluatedAt: Date,
): boolean {
  if (rule.action !== input.requestedAction) return false;
  if (rule.jurisdiction !== "*" && rule.jurisdiction !== input.jurisdiction)
    return false;
  if (rule.status === "DRAFT" || rule.status === "RETIRED") return false;
  if (new Date(rule.effectiveFrom) > evaluatedAt) return false;
  if (rule.effectiveUntil && new Date(rule.effectiveUntil) <= evaluatedAt)
    return false;

  const condition: ComplianceRuleConditions = rule.conditions;
  const tx = input.transactionContext;
  if (!includesWhenPresent(condition.accountTypes, subject.accountType))
    return false;
  if (!includesWhenPresent(condition.sellerTypes, subject.sellerType))
    return false;
  if (
    condition.categories?.length &&
    !condition.categories.includes(input.categoryId ?? "")
  )
    return false;
  if (!includesWhenPresent(condition.transactionTypes, tx?.transactionType))
    return false;
  if (
    !includesWhenPresent(
      condition.contractConclusionModes,
      tx?.contractConclusionMode,
    )
  )
    return false;
  if (!includesWhenPresent(condition.paymentFlows, tx?.paymentFlow))
    return false;
  if (!includesWhenPresent(condition.riskLevels, input.riskContext?.level))
    return false;
  if (!meetsMinimum(condition.minAmountMinor, tx?.amountMinor)) return false;
  if (!meetsMinimum(condition.minAnnualActivityMinor, tx?.annualActivityMinor))
    return false;
  if (
    !meetsMinimum(
      condition.minAnnualTransactionCount,
      tx?.annualTransactionCount,
    )
  )
    return false;
  if (
    condition.maxAccountAgeDays !== undefined &&
    (subject.accountAgeDays === undefined ||
      subject.accountAgeDays > condition.maxAccountAgeDays)
  )
    return false;
  return true;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function recordIsVerified(
  subject: ComplianceSubject,
  dimension: VerificationDimension,
  evaluatedAt: Date,
): boolean {
  const record = subject.verification[dimension];
  if (!record || record.state !== "verified") return false;
  return !record.expiresAt || new Date(record.expiresAt) > evaluatedAt;
}

/**
 * Pure, deterministic policy evaluator. Persistence and provider orchestration
 * live in ComplianceService; the browser receives only this decision DTO.
 */
export class CompliancePolicyEngine {
  getVerificationRequirements(
    subject: ComplianceSubject,
    input: ComplianceEvaluationInput,
    registry: readonly ComplianceRule[],
  ): ComplianceRequirementDecision {
    const evaluatedAt = new Date(input.evaluatedAt ?? new Date().toISOString());
    const applicable = registry
      .filter((rule) => ruleMatches(rule, subject, input, evaluatedAt))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    const policyConfigured = applicable.length > 0;

    const required = unique(applicable.flatMap((rule) => rule.requiredChecks));
    const recommended = unique(
      applicable
        .flatMap((rule) => rule.recommendedChecks)
        .filter((dimension) => !required.includes(dimension)),
    );
    const missing = required.filter(
      (dimension) => !recordIsVerified(subject, dimension, evaluatedAt),
    );
    const pending = missing.filter((dimension) =>
      PENDING_STATES.has(subject.verification[dimension]?.state ?? "required"),
    );
    const blocking = missing.filter((dimension) =>
      INCOMPLETE_STATES.has(
        subject.verification[dimension]?.state ?? "required",
      ),
    );

    return {
      requestedAction: input.requestedAction,
      capability: ACTION_CAPABILITY[input.requestedAction],
      allowed: policyConfigured && missing.length === 0,
      required,
      recommended,
      missing,
      blocking,
      pending,
      reasonCodes: unique([
        ...applicable.flatMap((rule) => rule.reasonCodes),
        ...(input.riskContext?.reasonCodes ?? []),
        ...(!policyConfigured ? ["COMPLIANCE_POLICY_NOT_CONFIGURED"] : []),
      ]),
      legalBasis: unique(applicable.flatMap((rule) => rule.legalBasis)),
      applicableRuleIds: applicable.map((rule) => rule.id),
      policyVersions: unique(applicable.map((rule) => rule.policyVersion)),
      nextRequirement: missing[0] ?? null,
      legalReviewRequired:
        !policyConfigured ||
        applicable.some((rule) => rule.status === "LEGAL_REVIEW_REQUIRED"),
      evaluatedAt: evaluatedAt.toISOString(),
    };
  }
}

export const compliancePolicyEngine = new CompliancePolicyEngine();
