import { createHash } from "node:crypto";
import { AppError } from "../../shared/errors/app-error.js";
import { config } from "../../app/config/index.js";
import { providerExecutionGuard } from "./provider-execution.js";
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
  private async genericRequest(path: string, init?: RequestInit) {
    if (!config.kycProviderBaseUrl || !config.kycProviderApiToken) {
      throw unavailableProviderError();
    }
    const response = await fetch(
      `${config.kycProviderBaseUrl.replace(/\/$/, "")}${path}`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.kycProviderApiToken}`,
          ...(init?.headers || {}),
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError({
        code: response.status === 429 ? "RATE_LIMITED" : "NETWORK_ERROR",
        statusCode: response.status === 429 ? 429 : 503,
        message: "Le service de vérification est temporairement indisponible.",
      });
    }
    return payload;
  }

  private async stripeRequest(path: string, init?: RequestInit) {
    if (!config.stripeSecretKey) throw unavailableProviderError();
    const response = await fetch(`https://api.stripe.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`,
        "Stripe-Version": "2026-07-29.dahlia",
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError({
        code: response.status === 429 ? "RATE_LIMITED" : "NETWORK_ERROR",
        statusCode: response.status === 429 ? 429 : 503,
        message: "Le service de vérification est temporairement indisponible.",
      });
    }
    return payload;
  }

  async createSession(input: {
    userId: string;
    dimension: Extract<VerificationDimension, "identity" | "age" | "address">;
    returnUrl: string;
  }) {
    if (config.kycProvider === "stripe") {
      const attemptDay = new Date().toISOString().slice(0, 10);
      const idempotencyKey = `identity:${input.userId}:${input.dimension}:${attemptDay}`;
      const body = new URLSearchParams({
        type: "document",
        client_reference_id: input.userId,
        return_url: input.returnUrl,
        "metadata[user_id]": input.userId,
        "metadata[dimension]": input.dimension,
        "options[document][require_matching_selfie]": "true",
      });
      const payload = await providerExecutionGuard.execute({
        providerId: "stripe-identity",
        capability: "identity.session",
        marketCode: "*",
        mutating: true,
        idempotencyKey,
        maxAttempts: 2,
        isRetryable: (error) =>
          error instanceof AppError
            ? error.code === "RATE_LIMITED" || error.statusCode >= 500
            : true,
        operation: () =>
          this.stripeRequest("/v1/identity/verification_sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Idempotency-Key": idempotencyKey,
            },
            body,
          }),
      });
      if (!payload.id || !payload.url) throw unavailableProviderError();
      return {
        sessionId: String(payload.id),
        redirectUrl: String(payload.url),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    const payload = await this.genericRequest("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Idempotency-Key": `identity:${input.userId}:${input.dimension}`,
      },
    });
    if (!payload.sessionId || !payload.redirectUrl || !payload.expiresAt)
      throw unavailableProviderError();
    return payload;
  }

  async getStatus(referenceId: string): Promise<VerificationState> {
    const payload =
      config.kycProvider === "stripe"
        ? await this.stripeRequest(
            `/v1/identity/verification_sessions/${encodeURIComponent(referenceId)}`,
          )
        : await this.genericRequest(
            `/sessions/${encodeURIComponent(referenceId)}`,
          );
    const status = String(payload.status || payload.state || "");
    if (status === "verified") return "verified";
    if (status === "processing") return "processing";
    if (status === "requires_input") return "needs_update";
    if (status === "canceled" || status === "failed") return "failed";
    return "pending";
  }

  async getRequirements(
    dimension: VerificationDimension,
    jurisdiction: string,
  ) {
    if (config.kycProvider === "stripe") {
      return {
        acceptedDocumentTypes:
          jurisdiction === "FR"
            ? ["national_id", "passport", "residence_permit"]
            : ["passport", "national_id"],
        processor: "Stripe Identity",
      };
    }
    const payload = await this.genericRequest(
      `/requirements?dimension=${encodeURIComponent(dimension)}&jurisdiction=${encodeURIComponent(jurisdiction)}`,
    );
    if (!Array.isArray(payload.acceptedDocumentTypes) || !payload.processor)
      throw unavailableProviderError();
    return payload;
  }

  async parseWebhook(payload: any): Promise<ComplianceWebhookEnvelope> {
    if (config.kycProvider !== "stripe") {
      return payload as ComplianceWebhookEnvelope;
    }
    const object = payload?.data?.object || {};
    const metadata = object.metadata || {};
    const eventType = String(payload?.type || "");
    const status = String(object.status || "");
    const state: VerificationState =
      status === "verified"
        ? "verified"
        : status === "processing"
          ? "processing"
          : status === "requires_input"
            ? "needs_update"
            : "failed";
    const dimension = String(metadata.dimension || "identity");
    if (!["identity", "age", "address"].includes(dimension)) {
      throw unavailableProviderError();
    }
    return {
      eventId: String(payload?.id || ""),
      eventType,
      providerReference: String(object.id || ""),
      userId: String(metadata.user_id || object.client_reference_id || ""),
      dimension: dimension as Extract<
        VerificationDimension,
        "identity" | "age" | "address"
      >,
      state,
      occurredAt: new Date(
        Number(payload?.created || Date.now() / 1000) * 1000,
      ).toISOString(),
    };
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
    const payload = await this.genericRequest("/phone/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
    return payload.verified === true;
  }
}

function unavailableProviderError(): AppError {
  return new AppError({
    code: "NETWORK_ERROR",
    statusCode: 503,
    message: "Le service de vérification est temporairement indisponible.",
  });
}
