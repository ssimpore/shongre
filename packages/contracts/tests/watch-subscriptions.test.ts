import { describe, expect, it } from "vitest";
import {
  createWatchSubscriptionInputSchema,
  updateWatchSubscriptionInputSchema,
} from "../src/schemas/watch-subscriptions";

describe("watch subscription contracts", () => {
  it("accepts a market-scoped saved-search alert", () => {
    const value = createWatchSubscriptionInputSchema.parse({
      marketCode: "CH",
      targetType: "saved_search",
      targetId: "photo-geneve",
      title: "Appareils photo à Genève",
      frequency: "daily",
      channels: { inApp: true, email: false, push: false },
      searchFilter: {
        query: "appareil photo",
        city: "Genève",
        maxPriceMinor: 90_000,
      },
    });

    expect(value.marketCode).toBe("CH");
    expect(value.frequency).toBe("daily");
  });

  it("rejects a saved-search alert without matchable filters", () => {
    expect(() =>
      createWatchSubscriptionInputSchema.parse({
        marketCode: "FR",
        targetType: "saved_search",
        targetId: "empty-search",
        title: "Recherche vide",
        frequency: "immediate",
        channels: { inApp: true, email: false, push: false },
      }),
    ).toThrow(/search filter/i);
  });

  it("rejects an update that disables every channel", () => {
    expect(() =>
      updateWatchSubscriptionInputSchema.parse({
        channels: { inApp: false, email: false, push: false },
      }),
    ).toThrow(/channel/i);
  });
});
