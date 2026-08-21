import {
  VerificationServiceContract,
  KYBCompanyLookupResult,
} from "../../contracts/verification.contract";
import { httpClient } from "./http-client";
import { VerificationState } from "../../../types";

export class HttpVerificationService implements VerificationServiceContract {
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

  async submitIdentityDocument(
    userId: string,
    docType: string,
    fileUrl: string,
  ): Promise<{ status: "pending" | "verified" }> {
    return httpClient.post<{ status: "pending" | "verified" }>(
      "/verification/identity",
      { userId, docType, fileUrl },
    );
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
    representativeName: string,
  ): Promise<{ status: "verified" }> {
    return httpClient.post<{ status: "verified" }>(
      "/verification/business-registration",
      { userId, siret, representativeName },
    );
  }

  async submitBankPayoutCoordinates(
    userId: string,
    iban: string,
    bic: string,
    holderName: string,
  ): Promise<{ status: "configured" }> {
    return httpClient.post<{ status: "configured" }>(
      "/verification/bank-coordinates",
      { userId, iban, bic, holderName },
    );
  }
}

export const httpVerificationService = new HttpVerificationService();
