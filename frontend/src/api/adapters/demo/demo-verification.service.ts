import {
  VerificationServiceContract,
  KYBCompanyLookupResult,
} from "../../contracts/verification.contract";
import { verificationService } from "../../../domains/verification/verification.service";
import { storageService } from "../../../services/storage.service";
import { VerificationState } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import type {
  ComplianceAction,
  ComplianceEvaluationInput,
  ComplianceRequirementDecision,
  ComplianceRule,
  ComplianceSubject,
  ComplianceAuditEvent,
  ManualReviewCase,
  ManualReviewState,
  MarketplaceCapability,
  VerificationDimension,
  VerificationRecord,
} from "@shongre/contracts/compliance";
import { complianceRuleSchema } from "@shongre/contracts/compliance";
import { DEMO_COMPLIANCE_RULES } from "./demo-compliance-rules";

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

function record(
  dimension: VerificationDimension,
  verified: boolean,
): VerificationRecord {
  return {
    dimension,
    state: verified ? "verified" : "required",
    method: verified ? "deterministic_demo_projection" : undefined,
    visibility: "ACCOUNT_OWNER_ONLY",
  };
}

export class DemoVerificationService implements VerificationServiceContract {
  private readonly requestedReviews = new Map<string, ManualReviewCase>();
  private readonly reviewOutcomes = new Map<string, VerificationRecord>();
  async listComplianceRules(): Promise<ComplianceRule[]> {
    await simulateNetworkDelay();
    return structuredClone(DEMO_COMPLIANCE_RULES);
  }

  async saveComplianceRule(input: {
    rule: ComplianceRule;
    reason: string;
  }): Promise<ComplianceRule> {
    await simulateNetworkDelay();
    if (input.reason.trim().length < 10)
      throw new Error("Un motif d’au moins 10 caractères est requis.");
    const rule = complianceRuleSchema.parse(input.rule);
    if (
      rule.governance === "LEGAL_MANDATE" &&
      rule.status === "ACTIVE" &&
      (!rule.reviewedBy ||
        !rule.reviewedAt ||
        rule.sourceReferences.length === 0)
    )
      throw new Error(
        "Une règle juridique active exige une source, un relecteur et une date de revue.",
      );
    const index = DEMO_COMPLIANCE_RULES.findIndex(
      (candidate) => candidate.id === rule.id,
    );
    if (index >= 0) DEMO_COMPLIANCE_RULES[index] = structuredClone(rule);
    else DEMO_COMPLIANCE_RULES.push(structuredClone(rule));
    return structuredClone(rule);
  }

  async listManualReviews(
    state?: ManualReviewState,
  ): Promise<ManualReviewCase[]> {
    await simulateNetworkDelay();
    const reviews = Object.values(storageService.getUsers()).flatMap((user) => {
      const items: ManualReviewCase[] = [];
      if (
        user.identityVerification &&
        user.identityVerification.status !== "verified"
      )
        items.push({
          id: `demo::${user.id}::identity`,
          userId: user.id,
          dimension: "identity",
          state: "OPEN",
          reasonCode: "IDENTITY_PROVIDER_REVIEW",
          openedAt: user.identityVerification.submittedAt || user.createdAt,
          updatedAt: user.identityVerification.submittedAt || user.createdAt,
        });
      if (
        user.professionalVerification &&
        user.professionalVerification.status !== "verified"
      )
        items.push({
          id: `demo::${user.id}::business`,
          userId: user.id,
          dimension: "business",
          state: "OPEN",
          reasonCode: "BUSINESS_REGISTRY_REVIEW",
          openedAt: user.professionalVerification.submittedAt || user.createdAt,
          updatedAt:
            user.professionalVerification.submittedAt || user.createdAt,
        });
      return items;
    });
    const combined = [...reviews, ...this.requestedReviews.values()];
    return combined.filter((review) => !state || review.state === state);
  }

  async decideManualReview(input: {
    caseId: string;
    state: Extract<
      ManualReviewState,
      "APPROVED" | "REJECTED" | "ESCALATED" | "WAITING_FOR_USER"
    >;
    reason: string;
  }): Promise<ManualReviewCase> {
    await simulateNetworkDelay();
    if (input.reason.trim().length < 10)
      throw new Error("Un motif d’au moins 10 caractères est requis.");
    const [, userId, dimension] = input.caseId.split("::");
    if (!userId || !dimension)
      throw new Error("Dossier de conformité introuvable.");
    if (input.state === "APPROVED" || input.state === "REJECTED") {
      const outcome = input.state === "APPROVED" ? "approve" : "reject";
      const options = {
        reviewerName: "Agent conformité",
        reason: input.reason,
        notes: input.reason,
      };
      if (dimension === "identity")
        verificationService.reviewIdentityVerification(
          userId,
          outcome,
          options,
        );
      else if (dimension === "business")
        verificationService.reviewBusinessVerification(
          userId,
          outcome,
          options,
        );
    }
    const now = new Date().toISOString();
    const requestedReason = this.requestedReviews.get(input.caseId)?.reasonCode;
    const review: ManualReviewCase = {
      id: input.caseId,
      userId,
      dimension: dimension as VerificationDimension,
      state: input.state,
      reasonCode:
        requestedReason ||
        (dimension === "identity"
          ? "IDENTITY_PROVIDER_REVIEW"
          : "BUSINESS_REGISTRY_REVIEW"),
      assignedTo: "demo-compliance-agent",
      openedAt: now,
      updatedAt: now,
      decisionReason: input.reason.trim(),
    };
    if (input.state === "APPROVED" || input.state === "REJECTED") {
      this.reviewOutcomes.set(input.caseId, {
        dimension: dimension as VerificationDimension,
        state: input.state === "APPROVED" ? "verified" : "rejected",
        method: "manual_review",
        verifiedAt: input.state === "APPROVED" ? now : undefined,
        reasonCode: `MANUAL_REVIEW_${input.state}`,
        visibility: "COMPLIANCE_ONLY",
      });
      this.requestedReviews.delete(input.caseId);
    } else {
      this.requestedReviews.set(input.caseId, review);
    }
    return review;
  }

  async listComplianceAudit(limit = 100): Promise<ComplianceAuditEvent[]> {
    await simulateNetworkDelay();
    return verificationService
      .getAuditLogs()
      .slice(0, limit)
      .map((log) => ({
        id: log.id,
        userId: log.userId,
        eventType: "provider_status_received" as const,
        dimension:
          log.dimension === "bank_payout" ? "bank_account" : log.dimension,
        actorType: log.performedBy === "system" ? "SYSTEM" : "STAFF",
        actorId: log.performedBy,
        occurredAt: log.timestamp,
        reasonCode: log.reason,
        previousState:
          log.previousState === "not_started"
            ? "required"
            : log.previousState === "requires_action"
              ? "needs_update"
              : log.previousState,
        newState:
          log.newState === "not_started"
            ? "required"
            : log.newState === "requires_action"
              ? "needs_update"
              : log.newState,
      }));
  }

  async requestManualReview(input: {
    userId: string;
    dimension: VerificationDimension;
  }): Promise<ManualReviewCase> {
    await simulateNetworkDelay();
    const key = `demo::${input.userId}::${input.dimension}`;
    const current = this.requestedReviews.get(key);
    if (current) return structuredClone(current);
    this.reviewOutcomes.delete(key);
    const now = new Date().toISOString();
    const review: ManualReviewCase = {
      id: key,
      userId: input.userId,
      dimension: input.dimension,
      state: "OPEN",
      reasonCode: "USER_REQUESTED_COMPLIANCE_REVIEW",
      openedAt: now,
      updatedAt: now,
    };
    this.requestedReviews.set(key, review);
    return structuredClone(review);
  }

  async getComplianceStatus(userId: string): Promise<ComplianceSubject> {
    await simulateNetworkDelay();
    const user =
      storageService.getUser(userId) || storageService.getCurrentUser();
    const summary = verificationService.getUserVerificationSummary(user);
    const professional = user?.accountType === "professional";
    const bankVerified = summary.dimensions.bank_payout.state === "verified";
    const subject: ComplianceSubject = {
      userId: user?.id,
      accountType: user?.accountType ?? "guest",
      sellerType: professional ? "professional" : "individual",
      businessStatus: professional
        ? summary.dimensions.business.state === "verified"
          ? "registered"
          : "declared"
        : "none",
      country: user?.country || "FR",
      verification: {
        email: record("email", summary.dimensions.email.state === "verified"),
        phone: record("phone", summary.dimensions.phone.state === "verified"),
        identity: record(
          "identity",
          summary.dimensions.identity.state === "verified",
        ),
        business: record(
          "business",
          summary.dimensions.business.state === "verified",
        ),
        business_representative: record(
          "business_representative",
          summary.dimensions.business.state === "verified",
        ),
        professional_status: record("professional_status", Boolean(user)),
        bank_account: record("bank_account", bankVerified),
        payout: record("payout", bankVerified),
        payment: record("payment", bankVerified),
        mfa: record("mfa", summary.dimensions.mfa.state === "verified"),
      },
    };
    for (const review of this.requestedReviews.values()) {
      if (review.userId !== userId) continue;
      subject.verification[review.dimension] = {
        dimension: review.dimension,
        state: "manual_review",
        reasonCode: review.reasonCode,
        visibility: "COMPLIANCE_ONLY",
      };
    }
    for (const [key, outcome] of this.reviewOutcomes) {
      if (!key.startsWith(`demo::${userId}::`)) continue;
      subject.verification[outcome.dimension] = structuredClone(outcome);
    }
    return subject;
  }

  async getVerificationRequirements(
    userId: string,
    input: ComplianceEvaluationInput,
  ): Promise<ComplianceRequirementDecision> {
    const subject = await this.getComplianceStatus(userId);
    const professional = subject.accountType === "professional";
    const requiredByAction: Record<ComplianceAction, VerificationDimension[]> =
      {
        browse: [],
        create_account: ["email"],
        save_favorite: ["email"],
        message_seller: ["email"],
        publish_listing: ["email", "professional_status"],
        publish_professional_listing: [
          "email",
          "business",
          "business_representative",
          "professional_status",
        ],
        promote_listing: ["email"],
        create_organization: ["email", "business", "business_representative"],
        accept_online_payment: ["email", "payment"],
        receive_payout: professional
          ? [
              "email",
              "business",
              "business_representative",
              "bank_account",
              "payout",
            ]
          : ["email", "identity", "bank_account", "payout"],
        complete_tax_due_diligence: [],
      };
    const required = requiredByAction[input.requestedAction];
    const missing = required.filter(
      (dimension) => subject.verification[dimension]?.state !== "verified",
    );
    const pending = missing.filter((dimension) =>
      ["pending", "processing", "manual_review"].includes(
        subject.verification[dimension]?.state ?? "required",
      ),
    );
    const taxReview = input.requestedAction === "complete_tax_due_diligence";
    return {
      requestedAction: input.requestedAction,
      capability: ACTION_CAPABILITY[input.requestedAction],
      allowed: missing.length === 0,
      required,
      recommended: taxReview
        ? ["tax", "address"]
        : input.requestedAction === "message_seller"
          ? ["phone"]
          : [],
      missing,
      blocking: missing.filter((dimension) => !pending.includes(dimension)),
      pending,
      reasonCodes: taxReview
        ? ["DAC7_APPLICABILITY_MUST_BE_CONFIRMED"]
        : missing.length
          ? ["MINIMUM_ACTION_VERIFICATION"]
          : [],
      legalBasis: taxReview ? ["DAC7_DPI_WHERE_APPLICABLE"] : [],
      applicableRuleIds: [`demo-${input.requestedAction}-v1`],
      policyVersions: ["demo-2026.1"],
      nextRequirement: missing[0] ?? null,
      legalReviewRequired: taxReview,
      evaluatedAt: input.evaluatedAt || new Date().toISOString(),
    };
  }

  async startIdentitySession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    jurisdiction: string;
    returnTo: string;
  }): Promise<{ sessionId: string; redirectUrl: string; expiresAt: string }> {
    await simulateNetworkDelay();
    const sessionId = `demo_${input.userId}_${input.dimension}`;
    if (input.dimension === "identity") {
      verificationService.submitIdentityVerification(
        input.userId,
        {
          documentType: "national_id",
          issuingCountry: input.jurisdiction,
        },
        true,
      );
    }
    return {
      sessionId,
      redirectUrl: input.returnTo,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async startPaymentOnboarding(input: {
    userId: string;
    jurisdiction: string;
    returnTo: string;
    contactEmail: string;
    displayName: string;
    sellerType: "individual" | "professional";
  }): Promise<{
    accountReference: string;
    onboardingUrl: string;
    required: VerificationDimension[];
  }> {
    await simulateNetworkDelay();
    const user = storageService.getUser(input.userId);
    if (user) {
      const now = new Date().toISOString();
      user.bankPayoutVerification = {
        status: "verified",
        submittedAt: now,
        verifiedAt: now,
        providerReference: `pay_demo_${input.userId}`,
        verificationMethod: "hosted_provider_onboarding",
      };
      storageService.saveUser(user);
    }
    return {
      accountReference: `pay_demo_${input.userId}`,
      onboardingUrl: input.returnTo,
      required: ["identity", "bank_account", "payout"],
    };
  }
  async getUserVerificationStatus(userId: string): Promise<{
    state: VerificationState;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    isBusinessVerified: boolean;
    isBankPayoutConfigured: boolean;
  }> {
    await simulateNetworkDelay();
    const user =
      storageService.getUser(userId) || storageService.getCurrentUser();
    const summary = verificationService.getUserVerificationSummary(user);

    return {
      state: summary.dimensions.identity.state,
      isPhoneVerified: summary.dimensions.phone.state === "verified",
      isIdentityVerified: summary.dimensions.identity.state === "verified",
      isBusinessVerified: summary.dimensions.business.state === "verified",
      isBankPayoutConfigured:
        summary.dimensions.bank_payout.state === "verified",
    };
  }

  async lookupCompanyBySiret(
    siretOrSiren: string,
  ): Promise<KYBCompanyLookupResult | null> {
    await simulateNetworkDelay();
    const res = verificationService.lookupCompanyBySiret(siretOrSiren);
    if (!res) return null;

    return {
      siren: res.siren,
      name: res.companyName,
      legalForm: res.legalForm,
      address: res.address,
      city: res.city,
      postalCode: res.postalCode,
      isActive: res.isActive,
    };
  }

  async submitBusinessRegistration(
    userId: string,
    siret: string,
  ): Promise<{ status: "verified" }> {
    await simulateNetworkDelay();
    const company = await this.lookupCompanyBySiret(siret);
    if (!company?.isActive) {
      throw new Error("Entreprise introuvable ou inactive.");
    }
    verificationService.submitBusinessVerification(
      userId,
      {
        companyName: company.name,
        siret,
        legalForm: company.legalForm,
        businessAddress: company.address,
        city: company.city,
        postalCode: company.postalCode,
        country: "FR",
      },
      true,
    );
    await this.requestManualReview({
      userId,
      dimension: "business_representative",
    });
    return { status: "verified" };
  }
}

export const demoVerificationService = new DemoVerificationService();
