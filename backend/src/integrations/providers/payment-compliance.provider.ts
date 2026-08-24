import { createHash } from "node:crypto";
import type {
  ComplianceWebhookEnvelope,
  VerificationDimension,
  VerificationState,
} from "@shongre/contracts/compliance";
import { AppError } from "../../shared/errors/app-error.js";
import { config } from "../../app/config/index.js";
import { providerExecutionGuard } from "./provider-execution.js";

const STRIPE_ACCOUNTS_VERSION = "2026-07-29.dahlia";

export interface PaymentComplianceProvider {
  createSellerAccount(input: {
    userId: string;
    sellerType: "individual" | "professional";
    jurisdiction: string;
    returnUrl: string;
    contactEmail: string;
    displayName: string;
    accountToken?: string;
  }): Promise<{ accountReference: string; onboardingUrl: string }>;
  createOnboardingLink(
    accountReference: string,
    returnUrl: string,
  ): Promise<string>;
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

  async getRequirements(
    accountReference: string,
  ): Promise<VerificationDimension[]> {
    void accountReference;
    return ["identity", "bank_account", "payout"];
  }

  async createOnboardingLink(
    accountReference: string,
    returnUrl: string,
  ): Promise<string> {
    return `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}paymentOnboarding=${accountReference}`;
  }

  async getVerificationStatus(
    accountReference: string,
  ): Promise<VerificationState> {
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
  private async request(
    path: string,
    init: RequestInit = {},
    idempotencyKey?: string,
  ) {
    if (!config.stripeSecretKey) throw this.unavailable();
    const response = await fetch(`https://api.stripe.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.stripeSecretKey}`,
        "Content-Type": "application/json",
        "Stripe-Version": STRIPE_ACCOUNTS_VERSION,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError({
        code: response.status === 429 ? "RATE_LIMITED" : "NETWORK_ERROR",
        statusCode: response.status === 429 ? 429 : 503,
        message:
          payload?.error?.message ||
          "Le service de conformité des paiements est indisponible.",
        details: { providerCode: payload?.error?.code },
      });
    }
    return payload;
  }

  private unavailable(): AppError {
    return new AppError({
      code: "NETWORK_ERROR",
      statusCode: 503,
      message: "Le service de conformité des paiements est indisponible.",
    });
  }

  async createSellerAccount(input: {
    userId: string;
    sellerType: "individual" | "professional";
    jurisdiction: string;
    returnUrl: string;
    contactEmail: string;
    displayName: string;
    accountToken?: string;
  }) {
    if (
      input.jurisdiction.toUpperCase() === "FR" &&
      !/^accttok_[A-Za-z0-9]+$/.test(input.accountToken || "")
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le jeton de compte Stripe requis en France est manquant.",
      });
    }
    const key = `connect-account:${input.userId}`;
    const account = await providerExecutionGuard.execute({
      providerId: "stripe-connect-v2",
      capability: "connected_account.create",
      marketCode: input.jurisdiction,
      mutating: true,
      idempotencyKey: key,
      maxAttempts: 2,
      isRetryable: (error) =>
        error instanceof AppError
          ? error.code === "RATE_LIMITED" || error.statusCode >= 500
          : true,
      operation: () =>
        this.request(
          "/v2/core/accounts",
          {
            method: "POST",
            body: JSON.stringify({
              ...(input.accountToken
                ? { account_token: input.accountToken }
                : {
                    contact_email: input.contactEmail,
                    display_name: input.displayName,
                    identity: {
                      country: input.jurisdiction.toLowerCase(),
                      entity_type:
                        input.sellerType === "professional"
                          ? "company"
                          : "individual",
                    },
                  }),
              dashboard: "express",
              configuration: {
                recipient: {
                  capabilities: {
                    stripe_balance: {
                      stripe_transfers: { requested: true },
                    },
                  },
                },
              },
              defaults: {
                responsibilities: {
                  fees_collector: "application",
                  losses_collector: "application",
                },
              },
              metadata: { shongre_user_id: input.userId },
              include: [
                "configuration.recipient",
                "identity",
                "requirements",
                "defaults",
              ],
            }),
          },
          key,
        ),
    });
    if (!account.id) throw this.unavailable();
    const onboardingUrl = await this.createOnboardingLink(
      String(account.id),
      input.returnUrl,
    );
    return {
      accountReference: String(account.id),
      onboardingUrl,
    };
  }

  async createOnboardingLink(
    accountReference: string,
    returnUrl: string,
  ): Promise<string> {
    if (!/^acct_[A-Za-z0-9]+$/.test(accountReference)) throw this.unavailable();
    const link = await this.request(
      "/v2/core/account_links",
      {
        method: "POST",
        body: JSON.stringify({
          account: accountReference,
          use_case: {
            type: "account_onboarding",
            account_onboarding: {
              configurations: ["recipient"],
              collection_options: { fields: "eventually_due" },
              return_url: returnUrl,
              refresh_url: returnUrl,
            },
          },
        }),
      },
      `connect-link:${accountReference}:${Date.now()}`,
    );
    if (!link.url) throw this.unavailable();
    return String(link.url);
  }

  private async getAccount(accountReference: string) {
    if (!/^acct_[A-Za-z0-9]+$/.test(accountReference)) throw this.unavailable();
    const include = new URLSearchParams();
    include.append("include", "configuration.recipient");
    include.append("include", "requirements");
    include.append("include", "identity");
    return this.request(
      `/v2/core/accounts/${encodeURIComponent(accountReference)}?${include}`,
    );
  }

  async getRequirements(
    accountReference: string,
  ): Promise<VerificationDimension[]> {
    const account = await this.getAccount(accountReference);
    const due = this.dueRequirementEntries(account).map((entry) =>
      String(entry.description || ""),
    );
    const requirements = new Set<VerificationDimension>();
    if (due.some((value) => /identity|representative|person/.test(value)))
      requirements.add("identity");
    if (due.some((value) => /bank|external_account/.test(value)))
      requirements.add("bank_account");
    requirements.add("payout");
    return [...requirements];
  }

  async getVerificationStatus(
    accountReference: string,
  ): Promise<VerificationState> {
    const account = await this.getAccount(accountReference);
    const due = this.dueRequirementEntries(account);
    if (due.length > 0) return "needs_update";
    return (await this.enablePayoutsFromAccount(account))
      ? "verified"
      : "processing";
  }

  private async enablePayoutsFromAccount(account: any) {
    const recipient = account.configuration?.recipient;
    const transfer = recipient?.capabilities?.stripe_balance?.stripe_transfers;
    const payouts = recipient?.capabilities?.stripe_balance?.payouts;
    return (
      transfer?.status === "active" && (!payouts || payouts.status === "active")
    );
  }

  private dueRequirementEntries(account: any): any[] {
    const entries = Array.isArray(account?.requirements?.entries)
      ? account.requirements.entries
      : [];
    return entries.filter((entry: any) =>
      ["currently_due", "past_due"].includes(
        String(entry?.minimum_deadline?.status || ""),
      ),
    );
  }

  async enablePayments(accountReference: string): Promise<boolean> {
    return this.enablePayouts(accountReference);
  }

  async enablePayouts(accountReference: string): Promise<boolean> {
    return this.enablePayoutsFromAccount(
      await this.getAccount(accountReference),
    );
  }

  async parseWebhook(payload: any): Promise<ComplianceWebhookEnvelope> {
    const relatedAccountId = String(payload?.related_object?.id || "");
    const object = relatedAccountId
      ? await this.getAccount(relatedAccountId)
      : payload?.data?.object || {};
    const metadata = object.metadata || {};
    const requirements = this.dueRequirementEntries(object);
    const state: VerificationState =
      requirements.length > 0
        ? "needs_update"
        : (await this.enablePayoutsFromAccount(object))
          ? "verified"
          : "processing";
    return {
      eventId: String(payload?.id || ""),
      eventType: String(payload?.type || ""),
      providerReference: String(object.id || ""),
      userId: String(metadata.shongre_user_id || ""),
      dimension: "payout",
      state,
      occurredAt: new Date(
        typeof payload?.created === "number"
          ? payload.created * 1000
          : payload?.created || Date.now(),
      ).toISOString(),
    };
  }
}
