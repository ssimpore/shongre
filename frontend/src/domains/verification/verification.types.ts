export type VerificationDimensionId =
  "email" | "phone" | "identity" | "business" | "bank_payout" | "mfa";

export type VerificationState =
  | "not_started"
  | "pending"
  | "verified"
  | "requires_action"
  | "rejected"
  | "expired";

type KycDocumentType =
  "national_id" | "passport" | "residence_permit" | "driving_license";

export interface VerificationRequirement {
  id: VerificationDimensionId;
  label: string;
  shortLabel: string;
  description: string;
  state: VerificationState;
  completedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
  actionLabel?: string;
}

export interface KycSubmissionData {
  documentType: KycDocumentType;
  issuingCountry: string;
}

export interface KybSubmissionData {
  companyName: string;
  siret: string;
  legalForm: string;
  vatNumber?: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface VerificationAuditEntry {
  id: string;
  userId: string;
  dimension: VerificationDimensionId;
  previousState: VerificationState;
  newState: VerificationState;
  timestamp: string;
  performedBy: string; // 'system' | 'user' | admin name
  reason?: string;
  notes?: string;
}

export interface UserVerificationSummary {
  dimensions: Record<VerificationDimensionId, VerificationRequirement>;
  pendingReviewsCount: number;
}
