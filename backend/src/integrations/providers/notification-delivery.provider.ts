import { createHash } from "node:crypto";
import { config } from "../../app/config/index.js";
import type {
  ClaimedNotificationDelivery,
  NotificationDeliveryChannel,
} from "../../infrastructure/database/repositories/notification.repository.js";

export interface NotificationDeliveryInput {
  delivery: ClaimedNotificationDelivery;
  destinations: string[];
}

export interface NotificationDeliveryResult {
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

export type NotificationDeliveryProviders = Record<
  NotificationDeliveryChannel,
  NotificationDeliveryProvider
>;

export function createNotificationDeliveryProviders(): NotificationDeliveryProviders {
  const create = (channel: NotificationDeliveryChannel) =>
    config.dataMode === "demo"
      ? new DemoNotificationDeliveryProvider(channel)
      : new UnavailableNotificationDeliveryProvider(channel);
  return { email: create("email"), push: create("push") };
}

export const notificationDeliveryProviders =
  createNotificationDeliveryProviders();
