import { describe, expect, it } from "vitest";
import {
  createWatchSubscriptionInputSchema,
  updateWatchSubscriptionInputSchema,
  watchSubscriptionSchema,
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

  it("accepts PostgreSQL timestamp offsets in repository projections", () => {
    expect(
      watchSubscriptionSchema.parse({
        id: "watch-1",
        marketCode: "FR",
        targetType: "listing_price",
        targetId: "listing-1",
        title: "Baisse de prix",
        frequency: "immediate",
        channels: { inApp: true, email: true, push: false },
        status: "active",
        createdAt: "2026-09-08T00:00:00.123456+00:00",
        updatedAt: "2026-09-08T00:00:00.123456+00:00",
      }).id,
    ).toBe("watch-1");
  });
});
