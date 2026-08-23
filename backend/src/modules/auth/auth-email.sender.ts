import { config } from "../../app/config/index.js";

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
    if (!config.authEmailDeliveryUrl) {
      if (config.nodeEnv === "production")
        throw new Error("AUTH_EMAIL_DELIVERY_URL is not configured.");
      return;
    }
    const response = await fetch(config.authEmailDeliveryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${config.authEmailDeliveryToken}`,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(
        `Authentication email delivery failed with status ${response.status}.`,
      );
  }
}

export const authEmailSender = new AuthEmailSender();
