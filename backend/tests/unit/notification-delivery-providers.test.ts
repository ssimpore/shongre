import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClaimedNotificationDelivery } from "../../src/infrastructure/database/repositories/notification.repository.js";
import {
  ExpoPushDeliveryProvider,
  NotificationDeliveryProviderError,
  SmtpEmailDeliveryProvider,
} from "../../src/integrations/providers/notification-delivery.provider.js";

const sendMail = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const delivery: ClaimedNotificationDelivery = {
  id: "delivery-1",
  notificationId: "notification-1",
  userId: "user_thomas",
  channel: "email",
  idempotencyKey: "notification-1:email",
  attemptNumber: 0,
  title: "Votre commande est confirmée",
  body: "Le vendeur a accepté votre offre.",
  marketCode: "FR",
  linkUrl: "https://shongre.test/compte/achats",
  category: "transactions",
  type: "order_confirmed",
};

afterEach(() => {
  sendMail.mockReset();
  vi.unstubAllGlobals();
});

describe("SMTP email delivery", () => {
  it("sends the notification with the action link in the body", async () => {
    sendMail.mockResolvedValue({
      messageId: "<abc@smtp>",
      accepted: ["buyer@example.test"],
      rejected: [],
      response: "250 OK",
    });
    const provider = new SmtpEmailDeliveryProvider(
      "smtps://user:pass@smtp.provider.test:465",
      "Shongre <no-reply@shongre.test>",
    );

    const result = await provider.send({
      delivery,
      destinations: ["buyer@example.test"],
    });

    expect(result.providerId).toBe("smtp_email");
    expect(result.providerMessageId).toBe("<abc@smtp>");
    const [payload] = sendMail.mock.calls[0];
    expect(payload.to).toEqual(["buyer@example.test"]);
    expect(payload.subject).toBe(delivery.title);
    expect(payload.text).toContain(delivery.body);
    expect(payload.text).toContain(delivery.linkUrl);
    // Lets the provider collapse a redelivery after a lease expiry.
    expect(payload.headers["X-Entity-Ref-ID"]).toBe(delivery.idempotencyKey);
  });

  it("refuses to reach a recipient outside the sandbox allowlist", async () => {
    const provider = new SmtpEmailDeliveryProvider(
      "smtp://smtp.provider.test:587",
      "Shongre <no-reply@shongre.test>",
      ["@shongre.test", "qa@partner.test"],
      true,
    );

    await expect(
      provider.send({ delivery, destinations: ["customer@gmail.test"] }),
    ).rejects.toMatchObject({ code: "NO_DESTINATION", permanent: true });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("delivers to an allowlisted domain in sandbox", async () => {
    sendMail.mockResolvedValue({
      messageId: "<ok@smtp>",
      accepted: ["qa@shongre.test"],
      rejected: [],
    });
    const provider = new SmtpEmailDeliveryProvider(
      "smtp://smtp.provider.test:587",
      "Shongre <no-reply@shongre.test>",
      ["@shongre.test"],
      true,
    );

    await expect(
      provider.send({ delivery, destinations: ["qa@shongre.test"] }),
    ).resolves.toMatchObject({ providerId: "smtp_email" });
  });

  it("reports an SMTP failure as retryable", async () => {
    sendMail.mockRejectedValue(new Error("Connection timed out"));
    const provider = new SmtpEmailDeliveryProvider(
      "smtp://smtp.provider.test:587",
      "Shongre <no-reply@shongre.test>",
    );

    const failure = await provider
      .send({ delivery, destinations: ["buyer@example.test"] })
      .catch((error: NotificationDeliveryProviderError) => error);

    expect(failure).toBeInstanceOf(NotificationDeliveryProviderError);
    expect(failure).toMatchObject({
      code: "SMTP_SEND_FAILED",
      permanent: false,
    });
  });
});

describe("Expo push delivery", () => {
  const pushDelivery: ClaimedNotificationDelivery = {
    ...delivery,
    channel: "push",
    idempotencyKey: "notification-1:push",
  };

  function stubFetch(status: number, body: unknown) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("sends one message per registered device with routing data", async () => {
    const fetchMock = stubFetch(200, {
      data: [
        { status: "ok", id: "ticket-1" },
        { status: "ok", id: "ticket-2" },
      ],
    });
    const provider = new ExpoPushDeliveryProvider("expo-token");

    const result = await provider.send({
      delivery: pushDelivery,
      destinations: ["ExponentPushToken[a]", "ExponentPushToken[b]"],
    });

    expect(result).toMatchObject({
      providerId: "expo_push",
      providerMessageId: "ticket-1",
    });
    expect(result.receipt).toMatchObject({ accepted: 2, rejected: 0 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer expo-token");
    const messages = JSON.parse(init.body);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      to: "ExponentPushToken[a]",
      title: pushDelivery.title,
      body: pushDelivery.body,
      data: {
        notificationId: "notification-1",
        type: "order_confirmed",
        linkUrl: pushDelivery.linkUrl,
      },
    });
  });

  it("treats an unregistered device as permanent", async () => {
    stubFetch(200, {
      data: [{ status: "error", message: "DeviceNotRegistered" }],
    });
    const provider = new ExpoPushDeliveryProvider("");

    await expect(
      provider.send({
        delivery: pushDelivery,
        destinations: ["ExponentPushToken[gone]"],
      }),
    ).rejects.toMatchObject({ code: "PUSH_REJECTED", permanent: true });
  });

  it("retries a rate-limited provider but not a rejected request", async () => {
    stubFetch(429, {
      errors: [{ code: "RATE_LIMITED", message: "slow down" }],
    });
    const provider = new ExpoPushDeliveryProvider("");
    await expect(
      provider.send({
        delivery: pushDelivery,
        destinations: ["ExponentPushToken[a]"],
      }),
    ).rejects.toMatchObject({ permanent: false });

    stubFetch(400, { errors: [{ code: "BAD_REQUEST", message: "malformed" }] });
    await expect(
      provider.send({
        delivery: pushDelivery,
        destinations: ["ExponentPushToken[a]"],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", permanent: true });
  });

  it("fails permanently when no device is registered", async () => {
    const provider = new ExpoPushDeliveryProvider("");
    await expect(
      provider.send({ delivery: pushDelivery, destinations: [] }),
    ).rejects.toMatchObject({ code: "NO_DESTINATION", permanent: true });
  });
});
