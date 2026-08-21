import { describe, expect, it } from "vitest";
import {
  calculateGrowth,
  calculateTrendScore,
  deduplicateListings,
  growthScore,
  normalizeSignal,
  selectDiverseCandidates,
  timeDecay,
} from "./trending.engine";
import { DEFAULT_TRENDING_ADMIN_CONFIG } from "./trending.defaults";
import type { Listing } from "../../types";
import type { TrendingTopicCandidate } from "./trending.types";

const listing = (id: string, categorySlug: string): Listing => ({
  id,
  title: id,
  description: id,
  price: 10,
  isNegotiable: false,
  isFreeDonation: false,
  categorySlug,
  subCategorySlug: `${categorySlug}-sub`,
  categoryLabel: categorySlug,
  subCategoryLabel: categorySlug,
  condition: "good",
  sellerId: `seller-${id}`,
  sellerName: "Seller",
  sellerType: "individual",
  sellerRating: 5,
  sellerReviewCount: 1,
  sellerIsVerified: true,
  sellerCity: "Paris",
  sellerPostalCode: "75001",
  city: "Paris",
  postalCode: "75001",
  department: "75",
  region: "Île-de-France",
  photos: [
    { id: `${id}-photo`, url: "https://example.com/photo.jpg", isCover: true },
  ],
  coverImageUrl: "https://example.com/photo.jpg",
  deliveryOptions: [],
  isOnlinePaymentAvailable: true,
  attributes: {},
  status: "active",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
  expiresAt: "2026-10-19T00:00:00.000Z",
  viewsCount: 100,
  favoritesCount: 10,
  contactCount: 4,
});

const candidate = (
  id: string,
  parentKey: string,
  listingIds: string[],
): TrendingTopicCandidate => ({
  id,
  type: "category",
  key: id,
  title: id,
  href: `/categorie/${id}`,
  parentKey,
  categorySlug: parentKey,
  listings: listingIds.map((listingId) => listing(listingId, parentKey)),
  signals: {
    activeListings: 2,
    newlyPublished: 1,
    views: 100,
    uniqueViewers: 80,
    searches: 50,
    searchClicks: 30,
    favorites: 10,
    shares: 2,
    contacts: 4,
    offers: 1,
    reservations: 1,
    transactions: 1,
    conversionRate: 0.4,
    publicationVelocity: 0.5,
    demandGrowth: 0.8,
    supplyGrowth: 0.5,
    priceActivity: 0.2,
    lastActivityAt: "2026-08-19T00:00:00.000Z",
    geographicRelevance: 0.5,
    seasonalRelevance: 0.5,
    editorialBoost: 0,
  },
});

describe("trending engine", () => {
  it("calculates bounded growth and stable growth score", () => {
    expect(calculateGrowth(20, 10)).toBe(1);
    expect(calculateGrowth(0, 0)).toBe(0);
    expect(growthScore(10, 10)).toBe(0.5);
  });

  it("decays old activity and normalizes volume logarithmically", () => {
    const now = new Date("2026-08-20T00:00:00.000Z");
    expect(timeDecay("2026-08-19T00:00:00.000Z", now)).toBeGreaterThan(
      timeDecay("2026-07-20T00:00:00.000Z", now),
    );
    expect(normalizeSignal(100, 100000)).toBeLessThan(0.6);
    expect(normalizeSignal(100000, 100000)).toBe(1);
  });

  it("combines signals using configurable weights", () => {
    expect(
      calculateTrendScore(
        {
          searchGrowth: 1,
          viewGrowth: 0,
          favorites: 0,
          contacts: 0,
          conversion: 0,
          listingVelocity: 0,
          locality: 0,
          freshness: 0,
          seasonality: 0,
          editorial: 0,
        },
        { ...DEFAULT_TRENDING_ADMIN_CONFIG.weights, searchGrowth: 1 },
      ),
    ).toBeGreaterThan(0.5);
  });

  it("keeps diversity across parent categories", () => {
    const config = {
      ...DEFAULT_TRENDING_ADMIN_CONFIG,
      maxTopics: 4,
      minTopics: 2,
      maxTopicsPerParentCategory: 1,
    };
    const chosen = selectDiverseCandidates(
      [
        candidate("phones", "electronics", ["shared"]),
        candidate("computers", "electronics", ["computer"]),
        candidate("fashion", "fashion", ["fashion"]),
      ].map((item, index) => ({
        ...item,
        score: 0.9 - index * 0.1,
        direction: "up" as const,
      })),
      config,
    );
    expect(chosen.map((item) => item.parentKey)).toEqual([
      "electronics",
      "fashion",
    ]);
  });

  it("deduplicates listings across topic rails", () => {
    const topics = [
      {
        ...candidate("one", "one", ["shared", "one"]),
        score: 0.8,
        direction: "up" as const,
      },
      {
        ...candidate("two", "two", ["shared", "two"]),
        score: 0.7,
        direction: "up" as const,
      },
    ];
    const assignments = deduplicateListings(topics, 2);
    expect(assignments.get("one")).toContain("shared");
    expect(assignments.get("two")).not.toContain("shared");
  });
});
