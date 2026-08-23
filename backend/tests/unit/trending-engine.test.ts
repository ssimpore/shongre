import { describe, expect, it } from "vitest";
import {
  calculateGrowth,
  normalizeSignal,
  selectTrendingTopics,
  timeDecay,
} from "../../src/modules/trending/trending.engine.js";
import { createDefaultTrendingConfig } from "../../src/modules/trending/trending.defaults.js";
import type { Listing } from "../../src/shared/types/index.js";
import type { TrendCandidate } from "../../src/modules/trending/trending.types.js";

const listing = (id: string, categoryId: string): Listing => ({
  id,
  sellerId: `seller-${id}`,
  categoryId,
  title: id,
  description: id,
  price: 20,
  currency: "EUR",
  status: "published",
  condition: "bon-etat",
  marketCode: "FR",
  city: "Paris",
  postalCode: "75001",
  country: "FR",
  allowedDelivery: ["hand_delivery"],
  images: ["https://example.com/image.jpg"],
  viewCount: 100,
  favoriteCount: 10,
  attributes: {},
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
  expiresAt: "2026-10-19T00:00:00.000Z",
});

const candidate = (key: string): TrendCandidate => ({
  id: `category:${key}`,
  key,
  parentKey: key,
  title: key,
  href: `/categorie/${key}`,
  listings: [listing(key, key)],
  signals: {
    activeListings: 1,
    newlyPublished: 1,
    views: 100,
    favorites: 10,
    contacts: 2,
    demandGrowth: 0.9,
    supplyGrowth: 0.5,
    conversionRate: 0.2,
    publicationVelocity: 1,
    geographicRelevance: 0.5,
    seasonalRelevance: 0.5,
    editorialBoost: 0,
    lastActivityAt: "2026-08-19T00:00:00.000Z",
  },
});

describe("backend trending engine", () => {
  it("calculates growth and logarithmic normalization", () => {
    expect(calculateGrowth(20, 10)).toBe(1);
    expect(calculateGrowth(10, 10)).toBe(0);
    expect(normalizeSignal(100, 100000)).toBeLessThan(0.6);
    expect(
      timeDecay(
        "2026-08-19T00:00:00.000Z",
        new Date("2026-08-20T00:00:00.000Z"),
      ),
    ).toBeGreaterThan(0.8);
  });

  it("keeps one topic per parent and filters listings by availability", () => {
    const config = {
      ...createDefaultTrendingConfig(),
      maxTopics: 4,
      maxTopicsPerParentCategory: 1,
    };
    const topics = selectTrendingTopics(
      [candidate("electronics"), candidate("fashion")],
      config,
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(topics).toHaveLength(2);
    expect(
      topics.every((topic) =>
        topic.listings.every(
          (item) => item.status === "published" || item.status === "reserved",
        ),
      ),
    ).toBe(true);
  });
});
