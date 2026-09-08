import {
  VerificationServiceContract,
  KYBCompanyLookupResult,
} from "../../contracts/verification.contract";
import { apiOperation } from "./generated-api-operation";
import { VerificationState } from "../../../types";
import type {
  ComplianceEvaluationInput,
  ComplianceRequirementDecision,
  ComplianceSubject,
  ComplianceRule,
  ComplianceAuditEvent,
  ManualReviewCase,
  ManualReviewState,
  VerificationDimension,
} from "@shongre/contracts/compliance";
import { getPublicRuntimeConfig } from "../../../platform/runtime-config/public-runtime-config";

export class HttpVerificationService implements VerificationServiceContract {
  async listComplianceRules(): Promise<ComplianceRule[]> {
    return apiOperation<ComplianceRule[], "getAdminComplianceRules">(
      "getAdminComplianceRules",
      {},
    );
  }

  async saveComplianceRule(input: {
    rule: ComplianceRule;
    reason: string;
  }): Promise<ComplianceRule> {
    return apiOperation<ComplianceRule, "putAdminComplianceRulesByRuleId">(
      "putAdminComplianceRulesByRuleId",
      { path: { ruleId: input.rule.id }, body: input },
    );
  }

  async listManualReviews(
    state?: ManualReviewState,
  ): Promise<ManualReviewCase[]> {
    return apiOperation<ManualReviewCase[], "getAdminComplianceReviews">(
      "getAdminComplianceReviews",
      { query: { state } },
    );
  }

  async decideManualReview(input: {
    caseId: string;
    state: Extract<
      ManualReviewState,
      "APPROVED" | "REJECTED" | "ESCALATED" | "WAITING_FOR_USER"
    >;
    reason: string;
  }): Promise<ManualReviewCase> {
    return apiOperation<
      ManualReviewCase,
      "postAdminComplianceReviewsByCaseIdDecision"
    >("postAdminComplianceReviewsByCaseIdDecision", {
      path: { caseId: input.caseId },
      body: { state: input.state, reason: input.reason },
    });
  }

  async listComplianceAudit(limit = 100): Promise<ComplianceAuditEvent[]> {
    return apiOperation<ComplianceAuditEvent[], "getAdminComplianceAudit">(
      "getAdminComplianceAudit",
      { query: { limit } },
    );
  }

  async requestManualReview(input: {
    userId: string;
    dimension: VerificationDimension;
  }): Promise<ManualReviewCase> {
    return apiOperation<ManualReviewCase, "postComplianceManualReview">(
      "postComplianceManualReview",
      {
        body: {
          dimension: input.dimension,
        },
      },
    );
  }

  async getComplianceStatus(_userId: string): Promise<ComplianceSubject> {
    return apiOperation<ComplianceSubject, "getComplianceStatus">(
      "getComplianceStatus",
      {},
    );
  }

  async getVerificationRequirements(
    _userId: string,
    input: ComplianceEvaluationInput,
  ): Promise<ComplianceRequirementDecision> {
    return apiOperation<
      ComplianceRequirementDecision,
      "postComplianceRequirements"
    >("postComplianceRequirements", { body: input });
  }

  async startIdentitySession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    jurisdiction: string;
    returnTo: string;
  }): Promise<{ sessionId: string; redirectUrl: string; expiresAt: string }> {
    return apiOperation<
      { sessionId: string; redirectUrl: string; expiresAt: string },
      "postComplianceIdentitySession"
    >("postComplianceIdentitySession", {
      body: {
        dimension: input.dimension,
        jurisdiction: input.jurisdiction,
        returnTo: input.returnTo,
      },
    });
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
    const accountToken = await createStripeAccountToken(input);
    return apiOperation<
      {
        accountReference: string;
        onboardingUrl: string;
        required: VerificationDimension[];
      },
      "postCompliancePaymentOnboarding"
    >("postCompliancePaymentOnboarding", {
      body: {
        jurisdiction: input.jurisdiction,
        returnTo: input.returnTo,
        accountToken,
      },
    });
  }
  async getUserVerificationStatus(userId: string): Promise<{
    state: VerificationState;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    isBusinessVerified: boolean;
    isBankPayoutConfigured: boolean;
  }> {
    return apiOperation<
      {
        state: VerificationState;
        isPhoneVerified: boolean;
        isIdentityVerified: boolean;
        isBusinessVerified: boolean;
        isBankPayoutConfigured: boolean;
      },
      "getVerificationStatusByUserId"
    >("getVerificationStatusByUserId", { path: { userId: userId } });
  }

  async lookupCompanyBySiret(
    siretOrSiren: string,
  ): Promise<KYBCompanyLookupResult | null> {
    return apiOperation<
      KYBCompanyLookupResult | null,
      "getVerificationSiretLookupBySiret"
    >("getVerificationSiretLookupBySiret", { path: { siret: siretOrSiren } });
  }

  async submitBusinessRegistration(
    userId: string,
    siret: string,
  ): Promise<{ status: "verified" }> {
    return apiOperation<
      { status: "verified" },
      "postVerificationBusinessRegistration"
    >("postVerificationBusinessRegistration", { body: { userId, siret } });
  }
}

export const httpVerificationService = new HttpVerificationService();

async function createStripeAccountToken(input: {
  jurisdiction: string;
  contactEmail: string;
  displayName: string;
  sellerType: "individual" | "professional";
}): Promise<string> {
  const publishableKey = getPublicRuntimeConfig().stripePublishableKey;
  if (!/^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey)) {
    throw new Error("Le parcours de versement n’est pas configuré.");
  }
  const response = await fetch(
    "https://api.stripe.com/v2/core/account_tokens",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
        "Stripe-Version": "2026-07-29.dahlia",
      },
      body: JSON.stringify({
        contact_email: input.contactEmail,
        display_name: input.displayName,
        identity: {
          country: input.jurisdiction.toLowerCase(),
          entity_type:
            input.sellerType === "professional" ? "company" : "individual",
        },
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  const token = String((payload as { id?: string }).id || "");
  if (!response.ok || !/^accttok_[A-Za-z0-9]+$/.test(token)) {
    throw new Error(
      "Le prestataire de paiement n’a pas pu démarrer la vérification.",
    );
  }
  return token;
}
