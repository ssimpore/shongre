import {
  VerificationServiceContract,
  KYBCompanyLookupResult,
} from "../../contracts/verification.contract";
import { httpClient } from "./http-client";
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

export class HttpVerificationService implements VerificationServiceContract {
  async listComplianceRules(): Promise<ComplianceRule[]> {
    return httpClient.get<ComplianceRule[]>("/admin/compliance/rules");
  }

  async saveComplianceRule(input: {
    rule: ComplianceRule;
    reason: string;
  }): Promise<ComplianceRule> {
    return httpClient.put<ComplianceRule>(
      `/admin/compliance/rules/${encodeURIComponent(input.rule.id)}`,
      input,
    );
  }

  async listManualReviews(
    state?: ManualReviewState,
  ): Promise<ManualReviewCase[]> {
    const query = state ? `?state=${encodeURIComponent(state)}` : "";
    return httpClient.get<ManualReviewCase[]>(`/admin/compliance/reviews${query}`);
  }

  async decideManualReview(input: {
    caseId: string;
    state: Extract<
      ManualReviewState,
      "APPROVED" | "REJECTED" | "ESCALATED" | "WAITING_FOR_USER"
    >;
    reason: string;
  }): Promise<ManualReviewCase> {
    return httpClient.post<ManualReviewCase>(
      `/admin/compliance/reviews/${encodeURIComponent(input.caseId)}/decision`,
      { state: input.state, reason: input.reason },
    );
  }

  async listComplianceAudit(limit = 100): Promise<ComplianceAuditEvent[]> {
    return httpClient.get<ComplianceAuditEvent[]>(
      `/admin/compliance/audit?limit=${encodeURIComponent(limit)}`,
    );
  }

  async requestManualReview(input: {
    userId: string;
    dimension: VerificationDimension;
  }): Promise<ManualReviewCase> {
    return httpClient.post<ManualReviewCase>("/compliance/manual-review", {
      dimension: input.dimension,
    });
  }

  async getComplianceStatus(_userId: string): Promise<ComplianceSubject> {
    return httpClient.get<ComplianceSubject>("/compliance/status");
  }

  async getVerificationRequirements(
    _userId: string,
    input: ComplianceEvaluationInput,
  ): Promise<ComplianceRequirementDecision> {
    return httpClient.post<ComplianceRequirementDecision>(
      "/compliance/requirements",
      input,
    );
  }

  async startIdentitySession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    jurisdiction: string;
    returnTo: string;
  }): Promise<{ sessionId: string; redirectUrl: string; expiresAt: string }> {
    return httpClient.post("/compliance/identity/session", {
      dimension: input.dimension,
      jurisdiction: input.jurisdiction,
      returnTo: input.returnTo,
    });
  }

  async startPaymentOnboarding(input: {
    userId: string;
    jurisdiction: string;
    returnTo: string;
  }): Promise<{
    accountReference: string;
    onboardingUrl: string;
    required: VerificationDimension[];
  }> {
    return httpClient.post("/compliance/payment/onboarding", {
      jurisdiction: input.jurisdiction,
      returnTo: input.returnTo,
    });
  }
  async getUserVerificationStatus(userId: string): Promise<{
    state: VerificationState;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    isBusinessVerified: boolean;
    isBankPayoutConfigured: boolean;
  }> {
    return httpClient.get<{
      state: VerificationState;
      isPhoneVerified: boolean;
      isIdentityVerified: boolean;
      isBusinessVerified: boolean;
      isBankPayoutConfigured: boolean;
    }>(`/verification/status/${userId}`);
  }

  async lookupCompanyBySiret(
    siretOrSiren: string,
  ): Promise<KYBCompanyLookupResult | null> {
    return httpClient.get<KYBCompanyLookupResult | null>(
      `/verification/siret-lookup/${siretOrSiren}`,
    );
  }

  async submitBusinessRegistration(
    userId: string,
    siret: string,
  ): Promise<{ status: "verified" }> {
    return httpClient.post<{ status: "verified" }>(
      "/verification/business-registration",
      { userId, siret },
    );
  }

}

export const httpVerificationService = new HttpVerificationService();
