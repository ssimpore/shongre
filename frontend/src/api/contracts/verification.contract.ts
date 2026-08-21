import { VerificationState } from "../../types";

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
  getUserVerificationStatus(userId: string): Promise<{
    state: VerificationState;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    isBusinessVerified: boolean;
    isBankPayoutConfigured: boolean;
  }>;
  submitIdentityDocument(
    userId: string,
    docType: string,
    fileUrl: string,
  ): Promise<{ status: "pending" | "verified" }>;
  lookupCompanyBySiret(
    siretOrSiren: string,
  ): Promise<KYBCompanyLookupResult | null>;
  submitBusinessRegistration(
    userId: string,
    siret: string,
    representativeName: string,
  ): Promise<{ status: "verified" }>;
  submitBankPayoutCoordinates(
    userId: string,
    iban: string,
    bic: string,
    holderName: string,
  ): Promise<{ status: "configured" }>;
}
