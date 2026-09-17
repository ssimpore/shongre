import { createHash } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import webPush, { WebPushError } from "web-push";
import { config } from "../../app/config/index.js";
import type {
  ClaimedNotificationDelivery,
  NotificationDeliveryChannel,
} from "../../infrastructure/database/repositories/notification.repository.js";
import { repositories } from "../../infrastructure/database/repositories/index.js";

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

/**
 * A browser's Web Push subscription, as the client registered it. This is the
 * same shape `PushSubscription.toJSON()` produces; the device table stores it
 * serialized where a phone stores its Expo token.
 */
export interface WebPushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function parseWebPushSubscription(
  token: string,
): WebPushSubscriptionRecord | null {
  if (!token.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(token) as Partial<WebPushSubscriptionRecord>;
    const endpoint = String(parsed?.endpoint || "");
    const p256dh = String(parsed?.keys?.p256dh || "");
    const auth = String(parsed?.keys?.auth || "");
    if (
      !/^https:\/\/\S{1,2000}$/.test(endpoint) ||
      !/^[A-Za-z0-9_-]{20,200}$/.test(p256dh) ||
      !/^[A-Za-z0-9_-]{10,100}$/.test(auth)
    ) {
      return null;
    }
    return { endpoint, keys: { p256dh, auth } };
  } catch {
    return null;
  }
}

/** The canonical serialization stored as the device token. */
export function serializeWebPushSubscription(
  subscription: WebPushSubscriptionRecord,
): string {
  return JSON.stringify({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
}

/**
 * Push to browsers over the Web Push protocol, signed with the platform's
 * VAPID keys. Each subscription is one browser profile; a push service that
 * answers 404 or 410 has revoked it, and the caller removes the device.
 */
export class WebPushDeliveryProvider implements NotificationDeliveryProvider {
  readonly id = "web_push";
  readonly channel: NotificationDeliveryChannel = "push";
  /** A notification is stale after this; the push service drops it then. */
  private static readonly TTL_SECONDS = 24 * 60 * 60;

  constructor(
    private readonly vapid: {
      subject: string;
      publicKey: string;
      privateKey: string;
    },
    private readonly onRevoked: (token: string) => Promise<void>,
  ) {}

  async send(
    input: NotificationDeliveryInput,
  ): Promise<NotificationDeliveryResult> {
    const subscriptions = input.destinations
      .map((token) => ({
        token,
        subscription: parseWebPushSubscription(token),
      }))
      .filter(
        (
          entry,
        ): entry is {
          token: string;
          subscription: WebPushSubscriptionRecord;
        } => entry.subscription !== null,
      );
    if (subscriptions.length === 0) {
      throw new NotificationDeliveryProviderError(
        "No registered browser subscription for this delivery.",
        "NO_DESTINATION",
        true,
      );
    }
    const { title, body, linkUrl, notificationId, type } = input.delivery;
    const payload = JSON.stringify({
      title,
      body,
      notificationId,
      type,
      ...(linkUrl ? { linkUrl } : {}),
    });
    let accepted = 0;
    let revoked = 0;
    let lastError: NotificationDeliveryProviderError | null = null;
    for (const { token, subscription } of subscriptions) {
      try {
        await webPush.sendNotification(subscription, payload, {
          TTL: WebPushDeliveryProvider.TTL_SECONDS,
          vapidDetails: this.vapid,
          timeout: config.performance.providerRequestTimeoutMs,
        });
        accepted += 1;
      } catch (error) {
        const status = error instanceof WebPushError ? error.statusCode : 0;
        if (status === 404 || status === 410) {
          // The browser unsubscribed or the profile is gone.
          revoked += 1;
          await this.onRevoked(token);
          continue;
        }
        lastError = new NotificationDeliveryProviderError(
          String((error as Error)?.message || error),
          status ? `HTTP_${status}` : "WEB_PUSH_SEND_FAILED",
          status >= 400 && status < 500 && status !== 429,
        );
      }
    }
    if (accepted === 0) {
      throw (
        lastError ??
        new NotificationDeliveryProviderError(
          "Every browser subscription for this delivery was revoked.",
          "NO_DESTINATION",
          true,
        )
      );
    }
    return {
      providerId: this.id,
      providerMessageId: `web_push_${input.delivery.idempotencyKey}`,
      receipt: {
        accepted,
        revoked,
        destinationCount: subscriptions.length,
      },
    };
  }
}

/**
 * One `push` channel, two kinds of device. Destinations are routed by shape:
 * a serialized subscription goes to the browser provider, an Expo token to
 * the phone provider. The delivery succeeds when either reached a device.
 */
export class CompositePushDeliveryProvider implements NotificationDeliveryProvider {
  readonly id = "push";
  readonly channel: NotificationDeliveryChannel = "push";

  constructor(
    private readonly native: NotificationDeliveryProvider,
    private readonly web: NotificationDeliveryProvider,
  ) {}

  async send(
    input: NotificationDeliveryInput,
  ): Promise<NotificationDeliveryResult> {
    const webDestinations = input.destinations.filter((token) =>
      token.startsWith("{"),
    );
    const nativeDestinations = input.destinations.filter(
      (token) => !token.startsWith("{"),
    );
    const results: NotificationDeliveryResult[] = [];
    const errors: NotificationDeliveryProviderError[] = [];
    for (const [provider, destinations] of [
      [this.native, nativeDestinations],
      [this.web, webDestinations],
    ] as const) {
      if (destinations.length === 0) continue;
      try {
        results.push(await provider.send({ ...input, destinations }));
      } catch (error) {
        errors.push(asDeliveryError(error, "PUSH_SEND_FAILED"));
      }
    }
    if (results.length === 0) {
      throw (
        errors[0] ??
        new NotificationDeliveryProviderError(
          "No registered device for this delivery.",
          "NO_DESTINATION",
          true,
        )
      );
    }
    return {
      providerId: results.map((result) => result.providerId).join("+"),
      providerMessageId: results[0]!.providerMessageId,
      receipt: {
        providers: results.map((result) => ({
          providerId: result.providerId,
          ...result.receipt,
        })),
        failed: errors.map((error) => ({
          code: error.code,
          message: error.message,
        })),
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
    const native =
      config.pushProvider === "expo"
        ? new ExpoPushDeliveryProvider(config.expoPushAccessToken)
        : new UnavailableNotificationDeliveryProvider("push");
    const web = config.webPush
      ? new WebPushDeliveryProvider(config.webPush, (token) =>
          repositories.notifications.unregisterDeviceToken(token),
        )
      : new UnavailableNotificationDeliveryProvider("push");
    return new CompositePushDeliveryProvider(native, web);
  };

  return { email: emailProvider(), push: pushProvider() };
}

export const notificationDeliveryProviders =
  createNotificationDeliveryProviders();
