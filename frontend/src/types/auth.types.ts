import type { AccountStatus as SharedAccountStatus } from "@shongre/contracts/access-control";

export type AccountStatus = SharedAccountStatus;

export type VerificationState =
  "none" | "pending" | "verified" | "rejected" | "requires_action" | "expired";

export interface ProfessionalVerification {
  status: VerificationState;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  documentType?: "kbis" | "insee_sirene" | "id_card" | "passport" | "other";
  rejectionReason?: string;
  notes?: string;
  siret?: string;
  sirenSiret?: string;
  companyName?: string;
  legalForm?: string;
  vatNumber?: string;
  kycLevel?: "basic" | "standard" | "advanced";
}

export interface IdentityVerification {
  status: VerificationState;
  verifiedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  documentType?:
    "national_id" | "passport" | "residence_permit" | "driving_license";
  issuingCountry?: string;
  rejectionReason?: string;
  notes?: string;
  providerReference?: string;
  verificationMethod?: string;
}

export interface BankPayoutVerification {
  status: VerificationState;
  verifiedAt?: string;
  submittedAt?: string;
  rejectionReason?: string;
  providerReference?: string;
  accountLast4?: string;
  verificationMethod?: string;
}

export interface EmailVerification {
  isVerified: boolean;
  verifiedAt?: string;
  token?: string;
}

export interface PhoneVerification {
  isVerified: boolean;
  phone?: string;
  verifiedAt?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  createdAt: string;
  lastActiveAt: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  locationText: string;
  isCurrent?: boolean;
}

export interface AuthSecurityEvent {
  id: string;
  timestamp: string;
  userId: string;
  eventType:
    | "account_created"
    | "login_succeeded"
    | "login_failed"
    | "logout"
    | "password_changed"
    | "password_reset_requested"
    | "password_reset_completed"
    | "email_verified"
    | "email_changed"
    | "phone_verified"
    | "mfa_enabled"
    | "mfa_disabled"
    | "session_revoked"
    | "all_sessions_revoked"
    | "account_type_upgraded_to_pro"
    | "account_type_downgraded"
    | "account_deleted";
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface MFASettings {
  isEnabled: boolean;
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: { code: string; isUsed: boolean }[];
  enabledAt?: string;
}

export interface LegalConsent {
  termsAccepted: boolean;
  termsVersion: string;
  termsAcceptedAt: string;
  privacyAcknowledged: boolean;
  marketingConsent?: boolean;
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_DELETED"
  | "EMAIL_NOT_VERIFIED"
  | "MFA_REQUIRED"
  | "INVALID_MFA_CODE"
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_ALREADY_USED"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "WEAK_PASSWORD"
  | "PASSWORD_MISMATCH"
  | "PRO_VERIFICATION_REQUIRED"
  | "UNRESOLVED_TRANSACTIONS"
  | "GENERIC_ERROR";
