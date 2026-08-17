export type VerificationDimensionId =
  | 'email'
  | 'phone'
  | 'identity'
  | 'business'
  | 'bank_payout'
  | 'mfa';

export type VerificationState =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'requires_action'
  | 'rejected'
  | 'expired';

export type KycDocumentType =
  | 'national_id'
  | 'passport'
  | 'residence_permit'
  | 'driving_license';

export type KybDocumentType =
  | 'kbis'
  | 'insee_notice'
  | 'articles_of_association'
  | 'bank_rib'
  | 'ubo_declaration';

export type TrustLevel =
  | 'tier_0_visitor'
  | 'tier_1_starter'
  | 'tier_2_verified_member'
  | 'tier_3_trusted_seller'
  | 'tier_4_verified_pro';

export interface VerificationRequirement {
  id: VerificationDimensionId;
  label: string;
  shortLabel: string;
  description: string;
  state: VerificationState;
  isRequiredForPro: boolean;
  isRequiredForHighValue: boolean;
  completedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
  actionLabel?: string;
}

export interface KycSubmissionData {
  documentType: KycDocumentType;
  issuingCountry: string;
  documentNumber?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality?: string;
  frontDocumentUrl?: string;
  backDocumentUrl?: string;
  selfieUrl?: string;
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
  legalRepresentativeName: string;
  legalRepresentativeRole: string;
  kbisDocumentUrl?: string;
  articlesDocumentUrl?: string;
  ribDocumentUrl?: string;
  uboDeclarationAccepted: boolean;
}

export interface BankPayoutSubmissionData {
  accountHolderName: string;
  iban: string;
  bic: string;
  bankName?: string;
  billingAddress?: string;
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

export interface MarketplaceCapabilityStatus {
  canBrowse: boolean;
  canContact: boolean;
  canBuyStandard: boolean;
  canBuyHighValue: boolean; // Transactions > 1000 €
  canPublishIndividualLow: boolean;
  canPublishIndividualHigh: boolean; // Listings > 1500 € or vehicles/luxury
  canPublishPro: boolean;
  canReceivePayouts: boolean; // Bank payouts from escrow
  canAccessProStorefront: boolean;
}

export interface UserVerificationSummary {
  trustLevel: TrustLevel;
  trustScore: number; // 0 to 100
  trustLevelLabel: string;
  dimensions: Record<VerificationDimensionId, VerificationRequirement>;
  capabilities: MarketplaceCapabilityStatus;
  nextRecommendedStep?: VerificationRequirement;
  pendingReviewsCount: number;
}
