import { describe, expect, it, vi } from "vitest";
import {
  CompositePushDeliveryProvider,
  NotificationDeliveryProviderError,
  parseWebPushSubscription,
  serializeWebPushSubscription,
  type NotificationDeliveryProvider,
} from "../../src/integrations/providers/notification-delivery.provider.js";
import { NotificationsService } from "../../src/modules/notifications/notifications.service.js";
import { DemoNotificationRepository } from "../../src/infrastructure/database/repositories/notification.repository.js";

const subscription = {
  endpoint: "https://push.example/send/abc123",
  keys: {
    p256dh:
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

describe("web push subscriptions", () => {
  it("accepts a browser subscription and serializes it canonically", () => {
    const parsed = parseWebPushSubscription(
      JSON.stringify({ ...subscription, expirationTime: null, extra: 1 }),
    );
    expect(parsed).toEqual(subscription);
    expect(serializeWebPushSubscription(parsed!)).toBe(
      JSON.stringify(subscription),
    );
  });

  it.each([
    "ExponentPushToken[abc]",
    JSON.stringify({
      endpoint: "http://insecure.example/x",
      keys: subscription.keys,
    }),
    JSON.stringify({
      endpoint: subscription.endpoint,
      keys: { p256dh: "short", auth: "x" },
    }),
    "{not json",
  ])("rejects %s", (token) => {
    expect(parseWebPushSubscription(token)).toBeNull();
  });
});

describe("composite push routing", () => {
  const provider = (
    id: string,
    outcome: "ok" | "fail",
  ): NotificationDeliveryProvider => ({
    id,
    channel: "push",
    send: vi.fn(async (input) => {
      if (outcome === "fail")
        throw new NotificationDeliveryProviderError(
          "boom",
          "PUSH_REJECTED",
          true,
        );
      return {
        providerId: id,
        providerMessageId: `${id}-1`,
        receipt: { destinationCount: input.destinations.length },
      };
    }),
  });
  const delivery = {
    id: "d1",
    notificationId: "n1",
    userId: "u1",
    channel: "push" as const,
    type: "review_reminder",
    title: "t",
    body: "b",
    idempotencyKey: "k1",
    attemptNumber: 1,
  } as never;

  it("sends browser subscriptions to the web provider and Expo tokens to the native one", async () => {
    const native = provider("expo_push", "ok");
    const web = provider("web_push", "ok");
    const result = await new CompositePushDeliveryProvider(native, web).send({
      delivery,
      destinations: ["ExponentPushToken[abc]", JSON.stringify(subscription)],
    });
    expect(vi.mocked(native.send).mock.calls[0]?.[0].destinations).toEqual([
      "ExponentPushToken[abc]",
    ]);
    expect(vi.mocked(web.send).mock.calls[0]?.[0].destinations).toEqual([
      JSON.stringify(subscription),
    ]);
    expect(result.providerId).toBe("expo_push+web_push");
  });

  it("succeeds when one family reaches a device and fails when none does", async () => {
    const result = await new CompositePushDeliveryProvider(
      provider("expo_push", "fail"),
      provider("web_push", "ok"),
    ).send({
      delivery,
      destinations: ["ExponentPushToken[abc]", JSON.stringify(subscription)],
    });
    expect(result.providerId).toBe("web_push");
    expect(result.receipt.failed).toEqual([
      { code: "PUSH_REJECTED", message: "boom" },
    ]);
    await expect(
      new CompositePushDeliveryProvider(
        provider("expo_push", "fail"),
        provider("web_push", "fail"),
      ).send({ delivery, destinations: [JSON.stringify(subscription)] }),
    ).rejects.toMatchObject({ code: "PUSH_REJECTED" });
  });
});

describe("browser device registration", () => {
  it("refuses a malformed subscription and a phone token on the web platform", async () => {
    const repository = new DemoNotificationRepository();
    const service = new NotificationsService(repository);
    await expect(
      service.registerDevice("u1", "ExponentPushToken[abc]", "web"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.registerDevice("u1", JSON.stringify(subscription), "ios"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
