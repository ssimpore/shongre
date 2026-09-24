import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listing, PublicSellerProfile } from "../../types";

vi.mock("server-only", () => ({}));

const services = vi.hoisted(() => ({
  getPublicProfile: vi.fn(),
  searchListings: vi.fn(),
  getUserReviews: vi.fn(async () => []),
  getV1Tree: vi.fn(async () => ({ nodes: [] })),
  fetchSitemapPage: vi.fn(),
  getCollections: vi.fn(async () => []),
}));

vi.mock("../../api/client/service-registry", () => ({
  createServiceRegistry: () => ({
    users: { getPublicProfile: services.getPublicProfile },
    listings: { searchListings: services.searchListings },
    reviews: { getUserReviews: services.getUserReviews },
    taxonomy: { getV1Tree: services.getV1Tree },
  }),
}));
vi.mock("../../api/adapters/http/http-sitemap.service", () => ({
  fetchPublicSitemapListingPage: services.fetchSitemapPage,
}));
vi.mock("../../domains/collection/collection.service", () => ({
  collectionService: { getCollections: services.getCollections },
}));
vi.mock("../api/server-edge-identity", () => ({
  serverEdgeIdentityHeaders: async () => ({}),
}));

import {
  listServerPublicSitemapData,
  resolveServerPublicRouteData,
} from "./server-public-route-data";

function seller(
  id: string,
  accountType: PublicSellerProfile["accountType"],
): PublicSellerProfile {
  return {
    id,
    slug: `${id}-slug`,
    name: id,
    accountType,
    sellerType: accountType === "professional" ? "pro" : "individual",
    country: "BE",
    isVerified: false,
    isBusinessVerified: false,
    rating: 0,
    reviewCount: 0,
    responseRatePercent: 0,
  };
}

function listing(id: string, profile: PublicSellerProfile): Listing {
  return {
    id,
    sellerId: profile.id,
    sellerProfile: profile,
    status: "active",
    marketPublications: [{ marketCode: "BE", status: "active" }],
  } as unknown as Listing;
}

beforeEach(() => {
  for (const mock of Object.values(services)) mock.mockClear();
});

describe("server seller route data", () => {
  it("reads the seller's own shelf and carries the cursor for the rest", async () => {
    const pro = seller("atelier", "professional");
    services.getPublicProfile.mockResolvedValueOnce(pro);
    services.searchListings.mockResolvedValueOnce({
      items: [listing("l-1", pro), listing("l-2", pro)],
      total: 120,
      page: 1,
      totalPages: 3,
      pageInfo: { hasNextPage: true, nextCursor: "cursor-2" },
    });

    const resolution = await resolveServerPublicRouteData(
      "/boutique/atelier-slug",
      "BE",
      "",
    );

    // Seller-scoped by the API rather than a market page filtered locally,
    // which silently dropped every listing past the first page.
    expect(services.searchListings).toHaveBeenCalledWith(
      expect.objectContaining({
        marketCode: "BE",
        sellerId: "atelier",
        limit: 50,
      }),
    );
    expect(resolution).toMatchObject({
      status: "found",
      data: {
        kind: "seller",
        listingsNextCursor: "cursor-2",
        listingsTotal: 120,
        listings: [{ id: "l-1" }, { id: "l-2" }],
      },
    });
  });
});

describe("server sitemap data", () => {
  it("takes sellers from their listings and re-reads only professionals", async () => {
    const individual = seller("camille", "individual");
    const pro = seller("atelier", "professional");
    services.fetchSitemapPage.mockResolvedValueOnce({
      items: [
        listing("l-1", individual),
        listing("l-2", individual),
        listing("l-3", pro),
      ],
      snapshotAt: "2026-09-24T00:00:00.000Z",
      pageInfo: { hasNextPage: false },
    });
    services.getPublicProfile.mockResolvedValueOnce({
      ...pro,
      storeSlug: "atelier-boutique",
    });

    const data = await listServerPublicSitemapData("BE");

    expect(services.getPublicProfile).toHaveBeenCalledTimes(1);
    expect(services.getPublicProfile).toHaveBeenCalledWith("atelier");
    expect(data.sellers.map((entry) => entry.id).sort()).toEqual([
      "atelier",
      "camille",
    ]);
    expect(
      data.sellers.find((entry) => entry.id === "atelier")?.storeSlug,
    ).toBe("atelier-boutique");
  });

  it("never has more professional reads in flight than the fan-out bound", async () => {
    const pros = Array.from({ length: 30 }, (_unused, index) =>
      seller(`pro-${index}`, "professional"),
    );
    services.fetchSitemapPage.mockResolvedValueOnce({
      items: pros.map((profile, index) => listing(`l-${index}`, profile)),
      snapshotAt: "2026-09-24T00:00:00.000Z",
      pageInfo: { hasNextPage: false },
    });
    let inFlight = 0;
    let peak = 0;
    services.getPublicProfile.mockImplementation(async (id: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return pros.find((profile) => profile.id === id) ?? null;
    });

    const data = await listServerPublicSitemapData("BE");

    expect(data.sellers).toHaveLength(30);
    expect(peak).toBeLessThanOrEqual(8);
  });
});
