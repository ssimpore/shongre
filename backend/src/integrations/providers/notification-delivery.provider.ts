import { createHash } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../../app/config/index.js";
import type {
  ClaimedNotificationDelivery,
  NotificationDeliveryChannel,
} from "../../infrastructure/database/repositories/notification.repository.js";

interface NotificationDeliveryInput {
  delivery: ClaimedNotificationDelivery;
  destinations: string[];
}

interface NotificationDeliveryResult {
  providerId: string;
  providerMessageId: string;
  receipt: Record<string, unknown>;
}

export class NotificationDeliveryProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly permanent = false,
  ) {
    super(message);
    this.name = "NotificationDeliveryProviderError";
  }
}

export interface NotificationDeliveryProvider {
  readonly id: string;
  readonly channel: NotificationDeliveryChannel;
  send(input: NotificationDeliveryInput): Promise<NotificationDeliveryResult>;
}

class DemoNotificationDeliveryProvider implements NotificationDeliveryProvider {
  readonly id: string;

  constructor(public readonly channel: NotificationDeliveryChannel) {
    this.id = `demo_${channel}`;
  }

  async send(
    input: NotificationDeliveryInput,
  ): Promise<NotificationDeliveryResult> {
    if (input.destinations.length === 0) {
      throw new NotificationDeliveryProviderError(
        "No active destination is registered for this channel.",
        "NO_DESTINATION",
        true,
      );
    }
    const digest = createHash("sha256")
      .update(`${this.id}:${input.delivery.idempotencyKey}`)
      .digest("hex")
      .slice(0, 20);
    return {
      providerId: this.id,
      providerMessageId: `demo_delivery_${digest}`,
      receipt: {
        accepted: true,
        destinationCount: input.destinations.length,
        scenario: "deterministic_success",
      },
    };
  }
}

class UnavailableNotificationDeliveryProvider implements NotificationDeliveryProvider {
  readonly id: string;

  constructor(public readonly channel: NotificationDeliveryChannel) {
    this.id = `unconfigured_${channel}`;
  }

  async send(): Promise<NotificationDeliveryResult> {
    throw new NotificationDeliveryProviderError(
      `No certified ${this.channel} provider is configured.`,
      "PROVIDER_NOT_CONFIGURED",
      false,
    );
  }
}

/**
 * Transactional email over SMTP.
 *
 * SMTP rather than one vendor's REST API on purpose: every approved provider
 * (Brevo, Mailgun, SES, Postmark) speaks it, so selecting or replacing one is a
 * credential change rather than a code change, and no provider name is baked
 * into the platform.
 *
 * In `sandbox` the recipient allowlist is enforced here as well as in the auth
 * sender, because a staging environment that can reach real customer inboxes is
 * the failure this mode exists to prevent.
 */
export class SmtpEmailDeliveryProvider implements NotificationDeliveryProvider {
  readonly id = "smtp_email";
  readonly channel: NotificationDeliveryChannel = "email";
  private transporter: Transporter | null = null;

  constructor(
    private readonly smtpUrl: string,
    private readonly fromAddress: string,
    private readonly recipientAllowlist: readonly string[] = [],
    private readonly enforceAllowlist = false,
  ) {}

  private transport(): Transporter {
    if (!this.transporter) {
      // Built once and reused for the process lifetime. Connection pooling is
      // left to the URL (`?pool=true&maxConnections=5`) so an operator can
      // tune it to whatever their provider actually permits.
      this.transporter = nodemailer.createTransport(this.smtpUrl);
    }
    return this.transporter;
  }

  private allowed(recipient: string): boolean {
    if (!this.enforceAllowlist) return true;
    const normalized = recipient.trim().toLowerCase();
    return this.recipientAllowlist.some((entry) => {
      const rule = entry.trim().toLowerCase();
      if (!rule) return false;
      return rule.startsWith("@")
        ? normalized.endsWith(rule)
        : normalized === rule;
    });
  }

  async send(
    input: NotificationDeliveryInput,
  ): Promise<NotificationDeliveryResult> {
    const recipients = input.destinations
      .map((value) => value.trim())
      .filter((value) => value.includes("@") && this.allowed(value));
    if (recipients.length === 0) {
      throw new NotificationDeliveryProviderError(
        "No permitted email destination for this delivery.",
        "NO_DESTINATION",
        true,
      );
    }
    const { title, body, linkUrl } = input.delivery;
    const text = linkUrl ? `${body}\n\n${linkUrl}` : body;
    try {
      const result = await this.transport().sendMail({
        from: this.fromAddress,
        to: recipients,
        subject: title,
        text,
        headers: {
          // Lets the provider collapse a redelivered attempt instead of
          // sending the same message twice after a lease expiry.
          "X-Entity-Ref-ID": input.delivery.idempotencyKey,
        },
      });
      return {
        providerId: this.id,
        providerMessageId: String(result.messageId || ""),
        receipt: {
          accepted: (result.accepted || []).length,
          rejected: (result.rejected || []).length,
          response: String(result.response || "").slice(0, 200),
        },
      };
    } catch (error) {
      throw asDeliveryError(error, "SMTP_SEND_FAILED");
    }
  }
}

/**
 * Push through Expo's push service, which is the counterpart of the token the
 * mobile client registers. Talking to APNs and FCM directly would mean holding
 * two more sets of platform credentials to reach the same devices.
 */
export class ExpoPushDeliveryProvider implements NotificationDeliveryProvider {
  readonly id = "expo_push";
  readonly channel: NotificationDeliveryChannel = "push";
  private static readonly ENDPOINT = "https://exp.host/--/api/v2/push/send";
  /** Expo accepts at most 100 messages per request. */
  private static readonly BATCH_LIMIT = 100;

  constructor(private readonly accessToken: string) {}

  async send(
    input: NotificationDeliveryInput,
  ): Promise<NotificationDeliveryResult> {
    const tokens = input.destinations
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, ExpoPushDeliveryProvider.BATCH_LIMIT);
    if (tokens.length === 0) {
      throw new NotificationDeliveryProviderError(
        "No registered device token for this delivery.",
        "NO_DESTINATION",
        true,
      );
    }
    const { title, body, linkUrl, notificationId, type } = input.delivery;
    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      // The mobile client reads `linkUrl` from the notification response to
      // route straight to the thing the notification is about.
      data: { notificationId, type, ...(linkUrl ? { linkUrl } : {}) },
    }));

    let payload: {
      data?: Array<{ status?: string; id?: string; message?: string }>;
      errors?: Array<{ code?: string; message?: string }>;
    };
    try {
      const response = await fetch(ExpoPushDeliveryProvider.ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(this.accessToken
            ? { Authorization: `Bearer ${this.accessToken}` }
            : {}),
        },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(
          config.performance.providerRequestTimeoutMs,
        ),
      });
      payload = (await response.json().catch(() => ({}))) as typeof payload;
      if (!response.ok) {
        throw new NotificationDeliveryProviderError(
          payload?.errors?.[0]?.message ||
            `Push provider rejected the request (${response.status}).`,
          payload?.errors?.[0]?.code || `HTTP_${response.status}`,
          // 4xx other than rate limiting will not succeed on retry.
          response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429,
        );
      }
    } catch (error) {
      throw asDeliveryError(error, "PUSH_SEND_FAILED");
    }

    const tickets = payload?.data ?? [];
    const accepted = tickets.filter((ticket) => ticket.status === "ok");
    if (accepted.length === 0) {
      const first = tickets[0];
      throw new NotificationDeliveryProviderError(
        first?.message || "The push provider accepted no message.",
        "PUSH_REJECTED",
        // A device that unregistered will never accept this message.
        first?.message?.includes("DeviceNotRegistered") === true,
      );
    }
    return {
      providerId: this.id,
      providerMessageId: String(accepted[0]?.id || ""),
      receipt: {
        accepted: accepted.length,
        rejected: tickets.length - accepted.length,
        destinationCount: tokens.length,
      },
    };
  }
}

function asDeliveryError(
  error: unknown,
  code: string,
): NotificationDeliveryProviderError {
  if (error instanceof NotificationDeliveryProviderError) return error;
  return new NotificationDeliveryProviderError(
    String((error as Error)?.message || error),
    code,
  );
}

export type NotificationDeliveryProviders = Record<
  NotificationDeliveryChannel,
  NotificationDeliveryProvider
>;

/**
 * Selects one provider per channel, failing closed.
 *
 * A channel with no usable configuration gets the unavailable provider rather
 * than a silent no-op: the delivery then retries and dead-letters visibly
 * instead of being recorded as sent.
 */
export function createNotificationDeliveryProviders(): NotificationDeliveryProviders {
  const emailProvider = (): NotificationDeliveryProvider => {
    if (config.dataMode === "demo") {
      return new DemoNotificationDeliveryProvider("email");
    }
    const smtpUrl =
      config.notificationSmtpUrl ||
      (config.emailMode === "console" ? config.localMailSmtpUrl : "");
    if (!smtpUrl || !config.notificationEmailFrom) {
      return new UnavailableNotificationDeliveryProvider("email");
    }
    return new SmtpEmailDeliveryProvider(
      smtpUrl,
      config.notificationEmailFrom,
      config.emailRecipientAllowlist,
      config.emailMode === "sandbox",
    );
  };

  const pushProvider = (): NotificationDeliveryProvider => {
    if (config.dataMode === "demo") {
      return new DemoNotificationDeliveryProvider("push");
    }
    if (config.pushProvider !== "expo") {
      return new UnavailableNotificationDeliveryProvider("push");
    }
    return new ExpoPushDeliveryProvider(config.expoPushAccessToken);
  };

  return { email: emailProvider(), push: pushProvider() };
}

export const notificationDeliveryProviders =
  createNotificationDeliveryProviders();
