import { config } from "../../app/config/index.js";
import { createHash } from "node:crypto";

export type AuthEmailTemplate = "verify_email" | "password_reset";

/**
 * Sends an auth email through Shongre's transactional-delivery boundary.
 *
 * The delivery service owns SMTP/provider credentials and templates. This API
 * receives only the destination, locale-safe template id and single-use link;
 * it never receives passwords, provider tokens or session credentials.
 */
export class AuthEmailSender {
  async send(input: {
    to: string;
    template: AuthEmailTemplate;
    actionUrl: string;
  }): Promise<void> {
    if (config.emailMode === "console") return;
    if (config.emailMode === "sandbox") {
      const recipient = input.to.trim().toLowerCase();
      const allowed = config.emailRecipientAllowlist.some((entry) => {
        const rule = entry.trim().toLowerCase();
        return rule.startsWith("@")
          ? recipient.endsWith(rule)
          : recipient === rule;
      });
      if (!allowed) {
        throw new Error(
          "Authentication email recipient is not allowed in this environment.",
        );
      }
    }
    if (!config.authEmailDeliveryUrl) {
      throw new Error("AUTH_EMAIL_DELIVERY_URL is not configured.");
    }
    const idempotencyKey = createHash("sha256")
      .update(`${input.template}:${input.to.toLowerCase()}:${input.actionUrl}`)
      .digest("hex");
    let lastStatus = 0;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await fetch(config.authEmailDeliveryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${config.authEmailDeliveryToken}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(10_000),
      });
      lastStatus = response.status;
      if (response.ok) {
        const responseType = response.headers.get("content-type") || "";
        if (responseType.includes("application/json")) {
          const result = (await response.json()) as { accepted?: boolean };
          if (result.accepted === false)
            throw new Error("Authentication email delivery was rejected.");
        }
        return;
      }
      if (attempt === 2 || (response.status < 500 && response.status !== 429))
        break;
    }
    throw new Error(
      `Authentication email delivery failed with status ${lastStatus || "unavailable"}.`,
    );
  }
}

export const authEmailSender = new AuthEmailSender();
