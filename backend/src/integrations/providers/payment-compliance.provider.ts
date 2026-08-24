import { createHash } from "node:crypto";
import type {
  ComplianceWebhookEnvelope,
  VerificationDimension,
  VerificationState,
} from "@shongre/contracts/compliance";
import { AppError } from "../../shared/errors/app-error.js";

export interface PaymentComplianceProvider {
  createSellerAccount(input: {
    userId: string;
    sellerType: "individual" | "professional";
    jurisdiction: string;
    returnUrl: string;
  }): Promise<{ accountReference: string; onboardingUrl: string }>;
  getRequirements(accountReference: string): Promise<VerificationDimension[]>;
  getVerificationStatus(accountReference: string): Promise<VerificationState>;
  enablePayments(accountReference: string): Promise<boolean>;
  enablePayouts(accountReference: string): Promise<boolean>;
  parseWebhook(payload: unknown): Promise<ComplianceWebhookEnvelope>;
}

export class DemoPaymentComplianceProvider implements PaymentComplianceProvider {
  async createSellerAccount(input: {
    userId: string;
    sellerType: "individual" | "professional";
    jurisdiction: string;
    returnUrl: string;
  }): Promise<{ accountReference: string; onboardingUrl: string }> {
    const accountReference = `pay_demo_${createHash("sha256")
      .update(`${input.userId}:${input.sellerType}:${input.jurisdiction}`)
      .digest("hex")
      .slice(0, 16)}`;
    return {
      accountReference,
      onboardingUrl: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}paymentOnboarding=${accountReference}`,
    };
  }

  async getRequirements(accountReference: string): Promise<VerificationDimension[]> {
    void accountReference;
    return ["identity", "bank_account", "payout"];
  }

  async getVerificationStatus(accountReference: string): Promise<VerificationState> {
    if (accountReference.includes("verified")) return "verified";
    if (accountReference.includes("failed")) return "failed";
    return "processing";
  }

  async enablePayments(accountReference: string): Promise<boolean> {
    return (await this.getVerificationStatus(accountReference)) === "verified";
  }

  async enablePayouts(accountReference: string): Promise<boolean> {
    return (await this.getVerificationStatus(accountReference)) === "verified";
  }

  async parseWebhook(payload: unknown): Promise<ComplianceWebhookEnvelope> {
    return payload as ComplianceWebhookEnvelope;
  }
}

export class LivePaymentComplianceProvider implements PaymentComplianceProvider {
  private unavailable(): never {
    throw new AppError({
      code: "NETWORK_ERROR",
      statusCode: 503,
      message: "Le service de conformité des paiements est indisponible.",
    });
  }
  async createSellerAccount(): Promise<never> {
    return this.unavailable();
  }
  async getRequirements(): Promise<never> {
    return this.unavailable();
  }
  async getVerificationStatus(): Promise<never> {
    return this.unavailable();
  }
  async enablePayments(): Promise<never> {
    return this.unavailable();
  }
  async enablePayouts(): Promise<never> {
    return this.unavailable();
  }
  async parseWebhook(): Promise<never> {
    return this.unavailable();
  }
}
