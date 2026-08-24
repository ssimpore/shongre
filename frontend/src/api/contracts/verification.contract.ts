import { VerificationState } from "../../types";
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

export interface KYBCompanyLookupResult {
  siren: string;
  name: string;
  legalForm: string;
  address: string;
  city: string;
  postalCode: string;
  isActive: boolean;
}

export interface VerificationServiceContract {
  listComplianceRules(): Promise<ComplianceRule[]>;
  saveComplianceRule(input: {
    rule: ComplianceRule;
    reason: string;
  }): Promise<ComplianceRule>;
  listManualReviews(state?: ManualReviewState): Promise<ManualReviewCase[]>;
  decideManualReview(input: {
    caseId: string;
    state: Extract<
      ManualReviewState,
      "APPROVED" | "REJECTED" | "ESCALATED" | "WAITING_FOR_USER"
    >;
    reason: string;
  }): Promise<ManualReviewCase>;
  listComplianceAudit(limit?: number): Promise<ComplianceAuditEvent[]>;
  requestManualReview(input: {
    userId: string;
    dimension: VerificationDimension;
  }): Promise<ManualReviewCase>;
  getComplianceStatus(userId: string): Promise<ComplianceSubject>;
  getVerificationRequirements(
    userId: string,
    input: ComplianceEvaluationInput,
  ): Promise<ComplianceRequirementDecision>;
  startIdentitySession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    jurisdiction: string;
    returnTo: string;
  }): Promise<{ sessionId: string; redirectUrl: string; expiresAt: string }>;
  startPaymentOnboarding(input: {
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
  }>;
  getUserVerificationStatus(userId: string): Promise<{
    state: VerificationState;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    isBusinessVerified: boolean;
    isBankPayoutConfigured: boolean;
  }>;
  lookupCompanyBySiret(
    siretOrSiren: string,
  ): Promise<KYBCompanyLookupResult | null>;
  submitBusinessRegistration(
    userId: string,
    siret: string,
  ): Promise<{ status: "verified" }>;
}
