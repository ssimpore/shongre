import { afterEach, describe, expect, it, vi } from "vitest";
import type { Listing } from "../types";
import { INITIAL_LISTINGS } from "../mocks/initialDemoData";
import { storageService } from "../services/storage.service";
import { demoVerticalDiscoveryStore } from "../domains/discovery/demo-vertical-discovery.store";
import { listingRepository } from "./listing.repository";

afterEach(() => vi.restoreAllMocks());

function marketProjectionListing(
  id: string,
  prices: Record<"FR" | "BE" | "CH", number>,
): Listing {
  return {
    ...INITIAL_LISTINGS[0],
    id,
    title: `__projection_market__ ${id}`,
    price: 9_999,
    currency: "EUR",
    marketCode: "FR",
    marketCodes: ["FR", "BE", "CH"],
    marketPublications: (["FR", "BE", "CH"] as const).map(
      (marketCode, index) => ({
        marketCode,
        status: "active" as const,
        isPrimary: marketCode === "FR",
        customPrice: prices[marketCode],
        currency: marketCode === "CH" ? "CHF" : "EUR",
        publishedAt: `2026-09-0${index + 1}T10:00:00.000Z`,
        complianceChecked: true,
      }),
    ),
  };
}

describe("demo listing repository taxonomy filters", () => {
  it("matches canonical descendants and dynamic range attributes", async () => {
    const result = await listingRepository.getListings({
      categorySlug: "vehicles",
      attributes: {
        year: { min: 2021, max: 2023 },
        fuel: "essence",
      },
    });

    expect(result.listings.map((listing) => listing.id)).toContain("list-102");
  });

  it.each(["Education", "cours de maths"])(
    "keeps Education discovery searchable with %s",
    async (query) => {
      const result = await listingRepository.getListings({ query, limit: 100 });
      expect(
        result.listings.some(
          (listing) => listing.attributes.verticalType === "tutoring",
        ),
      ).toBe(true);
    },
  );

  it("keeps the historical baby category URL compatible with stored demo listings", async () => {
    const result = await listingRepository.getListings({
      categorySlug: "bebe-puericulture-enfants",
      limit: 100,
    });

    expect(result.listings.map((listing) => listing.id)).toContain("list-113");
  });

  it.each([
    ["FR", ["market-price-low", "market-price-high"], 300, "EUR", 1],
    ["BE", ["market-price-high", "market-price-low"], 100, "EUR", 2],
    ["CH", ["market-price-low", "market-price-high"], 500, "CHF", 3],
  ] as const)(
    "projects %s publication price and currency before filtering and sorting",
    async (
      marketCode,
      expectedOrder,
      selectedPrice,
      currency,
      publishedDay,
    ) => {
      const high = marketProjectionListing("market-price-high", {
        FR: 300,
        BE: 100,
        CH: 500,
      });
      const low = marketProjectionListing("market-price-low", {
        FR: 100,
        BE: 300,
        CH: 200,
      });
      vi.spyOn(storageService, "getListings").mockReturnValue([high, low]);
      vi.spyOn(demoVerticalDiscoveryStore, "getListings").mockReturnValue([]);

      const filtered = await listingRepository.getListings({
        marketCode,
        query: "market-price-high",
        minPrice: selectedPrice - 1,
        maxPrice: selectedPrice + 1,
      });
      const sorted = await listingRepository.getListings({
        marketCode,
        query: "__projection_market__",
        sortBy: "price_asc",
        limit: 10,
      });

      expect(filtered.listings).toHaveLength(1);
      expect(filtered.listings[0]).toMatchObject({
        id: "market-price-high",
        price: selectedPrice,
        currency,
        marketCode,
        publishedAt: `2026-09-0${publishedDay}T10:00:00.000Z`,
      });
      expect(sorted.listings.map((listing) => listing.id)).toEqual(
        expectedOrder,
      );
    },
  );
});
