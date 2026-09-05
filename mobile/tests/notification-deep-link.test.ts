import { describe, expect, it } from "vitest";
import { resolveDeliveryNotificationRoute } from "../src/services/notifications/notification-deep-link";

describe("delivery notification deep links", () => {
  it("opens only authenticated same-market delivery destinations", () => {
    expect(
      resolveDeliveryNotificationRoute({
        data: {
          linkUrl: "/livraison/demande/418711cb-aee0-4fa3-a102-8ec6ea2a2cb8",
          marketCode: "FR",
        },
        authenticated: true,
        marketCode: "FR",
      }),
    ).toBe("/account/delivery?mode=browse");
    expect(
      resolveDeliveryNotificationRoute({
        data: { linkUrl: "/compte/livraison", marketCode: "BE" },
        authenticated: true,
        marketCode: "FR",
      }),
    ).toBeNull();
    expect(
      resolveDeliveryNotificationRoute({
        data: { linkUrl: "/compte/livraison", marketCode: "FR" },
        authenticated: false,
        marketCode: "FR",
      }),
    ).toBeNull();
  });

  it("rejects arbitrary internal and external links", () => {
    for (const linkUrl of [
      "https://evil.example",
      "//evil.example",
      "/admin",
    ]) {
      expect(
        resolveDeliveryNotificationRoute({
          data: { linkUrl, marketCode: "FR" },
          authenticated: true,
          marketCode: "FR",
        }),
      ).toBeNull();
    }
  });
});
