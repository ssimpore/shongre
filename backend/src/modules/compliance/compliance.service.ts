import {
  complianceEvaluationInputSchema,
  complianceRuleSchema,
  complianceWebhookEnvelopeSchema,
  type ComplianceEvaluationInput,
  type ComplianceRequirementDecision,
  type ComplianceRule,
  type ComplianceSubject,
  type ManualReviewState,
  type VerificationDimension,
  type VerificationRecord,
} from "@shongre/contracts/compliance";
import {
  hashProviderPayload,
  type IComplianceRepository,
  type IUserRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import {
  type IKYCProvider,
  type PaymentComplianceProvider,
  providers,
} from "../../integrations/providers/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { UserProfile } from "../../shared/types/index.js";
import { requireMarketCode } from "../../shared/market/market-code.js";
import { BASELINE_COMPLIANCE_RULES } from "./compliance-rule.registry.js";
import {
  CompliancePolicyEngine,
  compliancePolicyEngine,
} from "./compliance-policy.engine.js";
import { type RiskSignals, RiskEngine, riskEngine } from "./risk.engine.js";

function verifiedRecord(
  dimension: VerificationDimension,
  verified: boolean | undefined,
  method: string,
): VerificationRecord | undefined {
  return verified
    ? {
        dimension,
        state: "verified",
        method,
        visibility: "ACCOUNT_OWNER_ONLY",
      }
    : undefined;
}

function legacyProjection(user: UserProfile): VerificationRecord[] {
  return [
    verifiedRecord("email", user.isEmailVerified, "legacy_profile_projection"),
    verifiedRecord("phone", user.isPhoneVerified, "legacy_profile_projection"),
    verifiedRecord(
      "identity",
      user.isIdentityVerified,
      "legacy_profile_projection",
    ),
    verifiedRecord(
      "business",
      user.isBusinessVerified,
      "legacy_profile_projection",
    ),
    verifiedRecord(
      "business_representative",
      user.isBusinessVerified,
      "legacy_business_verification_projection",
    ),
    verifiedRecord(
      "professional_status",
      user.accountType === "individual" ||
        user.accountType === "professional" ||
        user.sellerType === "individual" ||
        user.sellerType === "pro",
      "declared_seller_classification",
    ),
  ].filter((record): record is VerificationRecord => Boolean(record));
}

function mergeRecords(
  legacy: VerificationRecord[],
  canonical: VerificationRecord[],
): ComplianceSubject["verification"] {
  const result: ComplianceSubject["verification"] = {};
  for (const record of legacy) result[record.dimension] = record;
  for (const record of canonical) result[record.dimension] = record;
  return result;
}

function sellerType(user: UserProfile): ComplianceSubject["sellerType"] {
  if (user.accountType === "professional" || user.sellerType === "pro")
    return "professional";
  return "individual";
}

function accountAgeDays(createdAt?: string): number | undefined {
  if (!createdAt) return undefined;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000),
  );
}

/**
 * Authoritative application service for requirement evaluation and trusted
 * verification state transitions. UI clients can request decisions and start
 * provider sessions, but cannot mark a dimension verified.
 */
export class ComplianceService {
  constructor(
    private readonly complianceRepo: IComplianceRepository = repositories.compliance,
    private readonly usersRepo: IUserRepository = repositories.users,
    private readonly engine: CompliancePolicyEngine = compliancePolicyEngine,
    private readonly identityProvider: IKYCProvider = providers.kyc,
    private readonly paymentProvider: PaymentComplianceProvider = providers.paymentCompliance,
    private readonly risk: RiskEngine = riskEngine,
  ) {}

  private async activeRules(): Promise<ComplianceRule[]> {
    const configured = await this.complianceRepo.listRules();
    const byId = new Map(
      BASELINE_COMPLIANCE_RULES.map((rule) => [rule.id, rule]),
    );
    for (const rule of configured) byId.set(rule.id, rule);
    return [...byId.values()];
  }

  async listRules(): Promise<ComplianceRule[]> {
    return this.activeRules();
  }

  async saveRule(input: {
    rule: unknown;
    actorId: string;
    reason: string;
  }): Promise<ComplianceRule> {
    const rule = complianceRuleSchema.parse(input.rule);
    if (input.reason.trim().length < 10)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Un motif de modification d'au moins 10 caractères est requis.",
      });
    if (
      rule.governance === "LEGAL_MANDATE" &&
      rule.status === "ACTIVE" &&
      (!rule.reviewedBy ||
        !rule.reviewedAt ||
        rule.sourceReferences.length === 0)
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Une règle juridique active exige une source, un relecteur et une date de revue.",
      });
    return this.complianceRepo.saveRule({
      rule,
      actorId: input.actorId,
      reason: input.reason.trim(),
    });
  }

  async getSubject(userId: string): Promise<ComplianceSubject> {
    const [user, canonical] = await Promise.all([
      this.usersRepo.findById(userId),
      this.complianceRepo.listVerificationRecords(userId),
    ]);
    if (!user)
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    return {
      userId,
      accountType: user.accountType,
      sellerType: sellerType(user),
      businessStatus:
        user.accountType === "professional"
          ? user.isBusinessVerified
            ? "registered"
            : "declared"
          : "none",
      country: requireMarketCode(user.country),
      accountAgeDays: accountAgeDays(user.createdAt),
      verification: mergeRecords(legacyProjection(user), canonical),
    };
  }

  async evaluateGuest(
    input: ComplianceEvaluationInput,
  ): Promise<ComplianceRequirementDecision> {
    const parsed = complianceEvaluationInputSchema.parse(input);
    return this.engine.getVerificationRequirements(
      {
        accountType: "guest",
        country: parsed.jurisdiction,
        verification: {},
      },
      parsed,
      await this.activeRules(),
    );
  }

  async evaluateForUser(
    userId: string,
    input: ComplianceEvaluationInput,
  ): Promise<ComplianceRequirementDecision> {
    return this.evaluateForUserWithRisk(userId, input, {});
  }

  /**
   * Trusted server entrypoint for fraud/device/payment services. Public clients
   * never get to supply or suppress their own authoritative risk context.
   */
  async evaluateForUserWithRisk(
    userId: string,
    input: ComplianceEvaluationInput,
    signals: RiskSignals,
  ): Promise<ComplianceRequirementDecision> {
    const parsed = complianceEvaluationInputSchema.parse(input);
    const riskDecision = this.risk.evaluate(signals);
    const decision = this.engine.getVerificationRequirements(
      await this.getSubject(userId),
      {
        ...parsed,
        riskContext: {
          level: riskDecision.level,
          reasonCodes: riskDecision.reasonCodes,
          humanReviewAvailable: true,
        },
      },
      await this.activeRules(),
    );
    await this.complianceRepo.saveDecision(userId, decision);
    return decision;
  }

  async requireForUser(
    userId: string,
    input: ComplianceEvaluationInput,
  ): Promise<ComplianceRequirementDecision> {
    const decision = await this.evaluateForUser(userId, input);
    if (!decision.allowed) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Une vérification ciblée est nécessaire pour cette action.",
        details: {
          complianceRequired: true,
          requestedAction: decision.requestedAction,
          missing: decision.missing,
          pending: decision.pending,
          reasonCodes: decision.reasonCodes,
          returnToSupported: true,
        },
      });
    }
    return decision;
  }

  async startIdentitySession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    jurisdiction: string;
    returnUrl: string;
  }) {
    const requirements = await this.identityProvider.getRequirements(
      input.dimension,
      input.jurisdiction,
    );
    const session = await this.identityProvider.createSession(input);
    await this.complianceRepo.saveVerificationRecord(input.userId, {
      dimension: input.dimension,
      state: "processing",
      provider: "identity_provider",
      providerReference: session.sessionId,
      method: "hosted_provider_session",
      lastCheckedAt: new Date().toISOString(),
      visibility: "PROVIDER_ONLY",
    });
    await this.complianceRepo.appendAuditEvent({
      userId: input.userId,
      eventType: "verification_started",
      dimension: input.dimension,
      actorType: "USER",
      actorId: input.userId,
      occurredAt: new Date().toISOString(),
      newState: "processing",
      providerReference: session.sessionId,
    });
    return { ...session, requirements };
  }

  async startPaymentOnboarding(input: {
    userId: string;
    jurisdiction: string;
    returnUrl: string;
    accountToken?: string;
  }) {
    const subject = await this.getSubject(input.userId);
    const user = await this.usersRepo.findById(input.userId);
    if (!user)
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    const seller = subject.sellerType ?? "individual";
    const existingReference = (
      await this.complianceRepo.listVerificationRecords(input.userId)
    ).find(
      (record) =>
        record.provider === "payment_compliance_provider" &&
        /^acct_[A-Za-z0-9]+$/.test(record.providerReference || ""),
    )?.providerReference;
    const account = existingReference
      ? {
          accountReference: existingReference,
          onboardingUrl: await this.paymentProvider.createOnboardingLink(
            existingReference,
            input.returnUrl,
          ),
        }
      : await this.paymentProvider.createSellerAccount({
          userId: input.userId,
          sellerType: seller,
          jurisdiction: input.jurisdiction,
          returnUrl: input.returnUrl,
          contactEmail: user.email,
          displayName: user.name,
          accountToken: input.accountToken,
        });
    const required = await this.paymentProvider.getRequirements(
      account.accountReference,
    );
    for (const dimension of required) {
      await this.complianceRepo.saveVerificationRecord(input.userId, {
        dimension,
        state: "processing",
        provider: "payment_compliance_provider",
        providerReference: account.accountReference,
        method: "hosted_provider_onboarding",
        lastCheckedAt: new Date().toISOString(),
        visibility: "PROVIDER_ONLY",
      });
    }
    return { ...account, required };
  }

  async applyTrustedVerification(input: {
    userId: string;
    record: VerificationRecord;
    actorType: "STAFF" | "PROVIDER" | "SYSTEM";
    actorId?: string;
    reasonCode: string;
  }): Promise<void> {
    const current = (
      await this.complianceRepo.listVerificationRecords(input.userId)
    ).find((record) => record.dimension === input.record.dimension);
    await this.complianceRepo.saveVerificationRecord(
      input.userId,
      input.record,
    );
    await this.complianceRepo.appendAuditEvent({
      userId: input.userId,
      eventType:
        input.actorType === "STAFF"
          ? "manual_review_completed"
          : "provider_status_received",
      dimension: input.record.dimension,
      actorType: input.actorType,
      actorId: input.actorId,
      occurredAt: new Date().toISOString(),
      reasonCode: input.reasonCode,
      previousState: current?.state,
      newState: input.record.state,
      providerReference: input.record.providerReference,
    });
  }

  async handleProviderWebhook(input: {
    provider: "identity" | "payment";
    payload: unknown;
    rawBody: string;
  }): Promise<{ duplicate: boolean }> {
    const parsedByProvider =
      input.provider === "identity"
        ? await this.identityProvider.parseWebhook(input.payload)
        : await this.paymentProvider.parseWebhook(input.payload);
    const event = complianceWebhookEnvelopeSchema.parse(parsedByProvider);
    const payloadHash = hashProviderPayload(input.rawBody);
    const claim = await this.complianceRepo.claimProviderEvent({
      provider: input.provider,
      eventId: event.eventId,
      payloadHash,
    });
    if (claim === "HASH_MISMATCH")
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "L'identifiant du webhook ne correspond pas à son contenu initial.",
      });
    if (claim === "PROCESSED" || claim === "IN_PROGRESS")
      return { duplicate: true };
    await this.applyTrustedVerification({
      userId: event.userId,
      record: {
        dimension: event.dimension,
        state: event.state,
        provider: input.provider,
        providerReference: event.providerReference,
        lastCheckedAt: event.occurredAt,
        verifiedAt: event.state === "verified" ? event.occurredAt : undefined,
        visibility: "PROVIDER_ONLY",
      },
      actorType: "PROVIDER",
      actorId: input.provider,
      reasonCode: event.eventType,
    });
    await this.complianceRepo.completeProviderEvent({
      provider: input.provider,
      eventId: event.eventId,
      payloadHash,
    });
    return { duplicate: false };
  }

  async listManualReviews(state?: ManualReviewState) {
    return this.complianceRepo.listManualReviews(state);
  }

  async listAuditEvents(limit?: number) {
    return this.complianceRepo.listAuditEvents(limit);
  }

  async runApprovedRetention(actorId: string) {
    return this.complianceRepo.runApprovedRetention(actorId);
  }

  async openManualReview(input: {
    userId: string;
    dimension: VerificationDimension;
    reasonCode: string;
  }) {
    const existing = (await this.complianceRepo.listManualReviews()).find(
      (review) =>
        review.userId === input.userId &&
        review.dimension === input.dimension &&
        [
          "OPEN",
          "ASSIGNED",
          "WAITING_FOR_USER",
          "UNDER_REVIEW",
          "ESCALATED",
        ].includes(review.state),
    );
    if (existing) return existing;
    const review = await this.complianceRepo.createManualReview({
      ...input,
      state: "OPEN",
    });
    await this.complianceRepo.saveVerificationRecord(input.userId, {
      dimension: input.dimension,
      state: "manual_review",
      reasonCode: input.reasonCode,
      visibility: "COMPLIANCE_ONLY",
    });
    await this.complianceRepo.appendAuditEvent({
      userId: input.userId,
      eventType: "manual_review_requested",
      dimension: input.dimension,
      actorType: "SYSTEM",
      occurredAt: new Date().toISOString(),
      reasonCode: input.reasonCode,
      newState: "manual_review",
    });
    return review;
  }

  async requestManualReviewForUser(input: {
    userId: string;
    dimension: VerificationDimension;
  }) {
    const reviewable: VerificationDimension[] = [
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
    ];
    if (!reviewable.includes(input.dimension))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette vérification ne relève pas d'une revue manuelle.",
      });
    return this.openManualReview({
      ...input,
      reasonCode: "USER_REQUESTED_COMPLIANCE_REVIEW",
    });
  }

  async decideManualReview(input: {
    caseId: string;
    state: Extract<
      ManualReviewState,
      "APPROVED" | "REJECTED" | "ESCALATED" | "WAITING_FOR_USER"
    >;
    reviewerId: string;
    reason: string;
  }) {
    if (input.reason.trim().length < 10)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif de décision d'au moins 10 caractères est requis.",
      });
    const review = await this.complianceRepo.updateManualReview({
      caseId: input.caseId,
      state: input.state,
      assignedTo: input.reviewerId,
      decisionReason: input.reason.trim(),
    });
    const nextState =
      input.state === "APPROVED"
        ? "verified"
        : input.state === "REJECTED"
          ? "rejected"
          : "manual_review";
    await this.applyTrustedVerification({
      userId: review.userId,
      record: {
        dimension: review.dimension,
        state: nextState,
        verifiedAt:
          nextState === "verified" ? new Date().toISOString() : undefined,
        reasonCode: review.reasonCode,
        method: "manual_review",
        visibility: "COMPLIANCE_ONLY",
      },
      actorType: "STAFF",
      actorId: input.reviewerId,
      reasonCode: `MANUAL_REVIEW_${input.state}`,
    });
    return review;
  }
}

export const complianceService = new ComplianceService();
