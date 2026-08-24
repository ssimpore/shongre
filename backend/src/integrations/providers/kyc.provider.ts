import { createHash } from "node:crypto";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  ComplianceWebhookEnvelope,
  VerificationDimension,
  VerificationState,
} from "@shongre/contracts/compliance";

export interface IKYCProvider {
  createSession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    returnUrl: string;
  }): Promise<{ sessionId: string; redirectUrl: string; expiresAt: string }>;
  getStatus(referenceId: string): Promise<VerificationState>;
  getRequirements(
    dimension: VerificationDimension,
    jurisdiction: string,
  ): Promise<{ acceptedDocumentTypes: string[]; processor: string }>;
  parseWebhook(payload: unknown): Promise<ComplianceWebhookEnvelope>;
  verifyPhoneOtp(phone: string, code: string): Promise<boolean>;
}

export class DemoKYCProvider implements IKYCProvider {
  async createSession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    returnUrl: string;
  }): Promise<{ sessionId: string; redirectUrl: string; expiresAt: string }> {
    const sessionId = `kyc_demo_${createHash("sha256")
      .update(`${input.userId}:${input.dimension}:${input.returnUrl}`)
      .digest("hex")
      .slice(0, 16)}`;
    return {
      sessionId,
      redirectUrl: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}verificationSession=${sessionId}`,
      // Demo sessions are reproducible across calls and test runs. Live
      // adapters supply the provider's real expiration timestamp.
      expiresAt: "2100-01-01T00:00:00.000Z",
    };
  }

  async getStatus(referenceId: string): Promise<VerificationState> {
    if (referenceId.includes("failed")) return "failed";
    if (referenceId.includes("review")) return "manual_review";
    if (referenceId.includes("verified")) return "verified";
    return "processing";
  }

  async getRequirements(
    dimension: VerificationDimension,
    jurisdiction: string,
  ): Promise<{ acceptedDocumentTypes: string[]; processor: string }> {
    void dimension;
    return {
      acceptedDocumentTypes:
        jurisdiction === "FR"
          ? ["national_id", "passport", "residence_permit"]
          : ["passport", "national_id"],
      processor: "Prestataire de vérification démo Shongre",
    };
  }

  async parseWebhook(payload: unknown): Promise<ComplianceWebhookEnvelope> {
    return payload as ComplianceWebhookEnvelope;
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
    void phone;
    return code === "123456";
  }
}

export class LiveKYCProvider implements IKYCProvider {
  async createSession(): Promise<never> {
    throw unavailableProviderError();
  }

  async getStatus(): Promise<never> {
    throw unavailableProviderError();
  }

  async getRequirements(): Promise<never> {
    throw unavailableProviderError();
  }

  async parseWebhook(): Promise<never> {
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
