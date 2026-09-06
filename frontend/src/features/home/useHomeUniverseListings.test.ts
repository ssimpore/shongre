import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listing, SearchFilters } from "../../types";

const serviceMocks = vi.hoisted(() => ({
  getListings: vi.fn(),
}));

vi.mock("../../api/client/service-registry", () => ({
  services: { listings: { getListings: serviceMocks.getListings } },
}));

import { loadHomeUniverseListingGroups } from "./useHomeUniverseListings";

const listing = (id: string): Listing => ({ id }) as Listing;

describe("loadHomeUniverseListingGroups", () => {
  beforeEach(() => {
    serviceMocks.getListings.mockReset();
  });

  it("queries canonical roots in parallel and isolates empty and failed groups", async () => {
    serviceMocks.getListings.mockImplementation((filters: SearchFilters) => {
      if (filters.categorySlug === "home_garden") {
        return Promise.resolve({ listings: [listing("home-1")], total: 1 });
      }
      if (filters.categorySlug === "vehicles") {
        return Promise.reject(new Error("Vehicle discovery unavailable"));
      }
      return Promise.resolve({ listings: [], total: 0 });
    });

    const groups = await loadHomeUniverseListingGroups("FR");

    expect(groups.map((group) => group.root.id)).toEqual([
      "home_garden",
      "vehicles",
      "fashion",
    ]);
    expect(groups.map((group) => group.status)).toEqual([
      "ready",
      "error",
      "empty",
    ]);
    expect(groups[0]?.listings.map((item) => item.id)).toEqual(["home-1"]);
    expect(serviceMocks.getListings).toHaveBeenCalledTimes(3);
    expect(
      serviceMocks.getListings.mock.calls.map(([filters]) => filters),
    ).toEqual([
      expect.objectContaining({
        marketCode: "FR",
        categorySlug: "home_garden",
        sortBy: "date_desc",
        page: 1,
        limit: 8,
      }),
      expect.objectContaining({
        marketCode: "FR",
        categorySlug: "vehicles",
        sortBy: "date_desc",
        page: 1,
        limit: 8,
      }),
      expect.objectContaining({
        marketCode: "FR",
        categorySlug: "fashion",
        sortBy: "date_desc",
        page: 1,
        limit: 8,
      }),
    ]);
  });

  it.each(["BE", "CH"])(
    "preserves the %s market scope for every universe query",
    async (marketCode) => {
      serviceMocks.getListings.mockResolvedValue({ listings: [], total: 0 });

      await loadHomeUniverseListingGroups(marketCode);

      expect(
        serviceMocks.getListings.mock.calls.every(
          ([filters]) => filters.marketCode === marketCode,
        ),
      ).toBe(true);
    },
  );
});
