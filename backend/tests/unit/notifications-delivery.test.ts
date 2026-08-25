import { describe, expect, it } from "vitest";
import { DemoNotificationRepository } from "../../src/infrastructure/database/repositories/notification.repository.js";
import { NotificationsService } from "../../src/modules/notifications/notifications.service.js";
import { NotificationsWorker } from "../../src/workers/notifications/notifications-worker.js";
import type {
  NotificationDeliveryProvider,
  NotificationDeliveryProviders,
} from "../../src/integrations/providers/notification-delivery.provider.js";
import { NotificationDeliveryProviderError } from "../../src/integrations/providers/notification-delivery.provider.js";

const successfulProvider = (
  channel: "email" | "push",
): NotificationDeliveryProvider => ({
  id: `test_${channel}`,
  channel,
  async send({ delivery, destinations }) {
    return {
      providerId: `test_${channel}`,
      providerMessageId: `provider_${delivery.idempotencyKey}`,
      receipt: { destinationCount: destinations.length },
    };
  },
});

const successfulProviders = (): NotificationDeliveryProviders => ({
  email: successfulProvider("email"),
  push: successfulProvider("push"),
});

describe("notification delivery outbox", () => {
  it("persists the in-app item and delivers enabled external channels once", async () => {
    const repository = new DemoNotificationRepository([]);
    const service = new NotificationsService(repository);
    const saved = await service.dispatchNotification(
      "user_camille",
      "message.received",
      "Nouveau message",
      "Vous avez reçu une réponse.",
      "/compte/messages",
    );
    expect(saved).toMatchObject({
      category: "messages",
      inAppVisible: true,
    });

    const worker = new NotificationsWorker(
      repository,
      successfulProviders(),
      "worker-test",
    );
    await expect(worker.run()).resolves.toEqual({
      claimed: 1,
      delivered: 1,
      retried: 0,
      deadLettered: 0,
    });
    await expect(worker.run()).resolves.toMatchObject({ claimed: 0 });
  });

  it("enforces mandatory security channels while honoring marketing opt-out", async () => {
    const repository = new DemoNotificationRepository([]);
    const service = new NotificationsService(repository);
    const current = await service.getPreferences("user_camille");
    const updated = await service.updatePreferences("user_camille", {
      ...current,
      security: { inApp: false, email: false, push: false },
      marketing: { inApp: false, email: false, push: false },
    });
    expect(updated.security).toMatchObject({
      inApp: true,
      email: true,
      isMandatory: true,
    });

    const marketing = await service.dispatchNotification(
      "user_camille",
      "marketing.campaign",
      "Actualités",
      "Nouveautés de la semaine.",
      undefined,
      "marketing",
    );
    expect(marketing.inAppVisible).toBe(false);
    const worker = new NotificationsWorker(
      repository,
      successfulProviders(),
      "worker-marketing",
    );
    await expect(worker.run()).resolves.toMatchObject({ claimed: 0 });
  });

  it("dead-letters permanent provider failures without retrying them", async () => {
    const repository = new DemoNotificationRepository([]);
    const service = new NotificationsService(repository);
    await service.dispatchNotification(
      "user_camille",
      "message.received",
      "Nouveau message",
      "Une réponse est disponible.",
    );
    const permanentPush: NotificationDeliveryProvider = {
      id: "broken_push",
      channel: "push",
      async send() {
        throw new NotificationDeliveryProviderError(
          "Invalid destination",
          "INVALID_DESTINATION",
          true,
        );
      },
    };
    const worker = new NotificationsWorker(
      repository,
      { email: successfulProvider("email"), push: permanentPush },
      "worker-dead-letter",
    );
    await expect(worker.run()).resolves.toMatchObject({
      claimed: 1,
      deadLettered: 1,
    });
    await expect(worker.run()).resolves.toMatchObject({ claimed: 0 });
  });

  it("records provider receipts idempotently", async () => {
    const repository = new DemoNotificationRepository([]);
    const input = {
      providerId: "test_push",
      providerMessageId: "provider_123",
      status: "delivered" as const,
      payload: { delivered: true },
      occurredAt: "2026-08-25T10:00:00.000Z",
    };
    const first = await repository.recordDeliveryReceipt(input);
    const second = await repository.recordDeliveryReceipt(input);
    expect(second).toBe(first);
  });
});
