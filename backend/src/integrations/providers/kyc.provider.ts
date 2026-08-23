import { createHash } from "node:crypto";
import { AppError } from "../../shared/errors/app-error.js";

export interface KYCSubmissionResult {
  status: "pending" | "verified" | "rejected";
  referenceId: string;
}

export interface IKYCProvider {
  submitDocument(
    userId: string,
    docType: string,
    fileUrl: string,
  ): Promise<KYCSubmissionResult>;
  verifyPhoneOtp(phone: string, code: string): Promise<boolean>;
}

export class DemoKYCProvider implements IKYCProvider {
  async submitDocument(
    userId: string,
    docType: string,
    fileUrl: string,
  ): Promise<KYCSubmissionResult> {
    const fingerprint = createHash("sha256")
      .update(`${userId}:${docType}:${fileUrl}`)
      .digest("hex")
      .slice(0, 16);
    return {
      status: "pending",
      referenceId: `kyc_demo_${fingerprint}`,
    };
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
    void phone;
    return code === "123456";
  }
}

export class LiveKYCProvider implements IKYCProvider {
  async submitDocument(
    userId: string,
    docType: string,
    fileUrl: string,
  ): Promise<KYCSubmissionResult> {
    void userId;
    void docType;
    void fileUrl;
    throw unavailableProviderError();
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
    void phone;
    void code;
    throw unavailableProviderError();
  }
}

function unavailableProviderError(): AppError {
  return new AppError({
    code: "NETWORK_ERROR",
    statusCode: 503,
    message: "Le service de vérification est temporairement indisponible.",
  });
}
