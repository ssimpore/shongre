import { afterEach, describe, expect, it, vi } from "vitest";

import { apiOperation } from "./generated-api-operation";
import { HttpWorkspaceService } from "./http-workspace.service";
import type { BackendListing } from "./http-listings.service";

vi.mock("./generated-api-operation", () => ({ apiOperation: vi.fn() }));

const backendListing = {
  id: "listing-workspace-1",
  sellerId: "user-1",
  categoryId: "fashion.womens.clothing",
  title: "Manteau en laine",
  description: "Manteau en excellent état.",
  price: 120,
  currency: "EUR",
  status: "published",
  condition: "very_good",
  marketCode: "FR",
  city: "Paris",
  postalCode: "75011",
  country: "FR",
  allowedDelivery: ["hand_delivery"],
  fulfillmentTypes: ["PHYSICAL"],
  requiresPhysicalDelivery: true,
  images: ["http://127.0.0.1:54321/storage/listing.jpg"],
  attributes: {},
  viewCount: 12,
  favoriteCount: 3,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  expiresAt: "2099-12-31T23:59:59.000Z",
} satisfies BackendListing;

afterEach(() => vi.restoreAllMocks());

describe("HttpWorkspaceService", () => {
  it("loads a market-scoped summary and maps API listings for the UI", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      totalListingsCount: 6,
      activeListingsCount: 5,
      savedSearchesCount: 2,
      totalViewsCount: 12,
      totalFavoritesCount: 3,
      unreadMessagesCount: 4,
      pendingTransactionsCount: 1,
      totalEarningsAmount: 0,
      recentListings: [backendListing],
      recentPurchases: [],
    });

    const summary = await new HttpWorkspaceService().getUserWorkspaceSummary(
      "user-1",
      "FR",
    );

    expect(apiOperation).toHaveBeenCalledWith("getWorkspaceSummaryByUserId", {
      path: { userId: "user-1" },
      headers: { "X-Shongre-Market": "FR" },
    });
    expect(summary).toMatchObject({
      totalListingsCount: 6,
      activeListingsCount: 5,
      savedSearchesCount: 2,
      unreadMessagesCount: 4,
    });
    expect(summary.recentListings[0]).toMatchObject({
      id: "listing-workspace-1",
      status: "active",
      categorySlug: "fashion",
      coverImageUrl: "http://127.0.0.1:54321/storage/listing.jpg",
    });
  });
});

it("uses currency-labelled API totals without inventing contacts, weekly trends or per-listing conversion", async () => {
  vi.mocked(apiOperation).mockResolvedValue({
    monthlyRevenue: 999,
    monthlyViews: 32,
    conversionRate: 3.2,
    revenueByCurrency: [{ amountMinor: 1290, currency: "EUR" }],
    topListings: [],
  });
  expect(await new HttpWorkspaceService().getProAnalytics("seller")).toEqual({
    catalogueSampleViews: 32,
    revenueByCurrency: [{ amountMinor: 1290, currency: "EUR" }],
    topListings: [],
  });
  expect(apiOperation).toHaveBeenCalledWith(
    "getWorkspaceProAnalyticsBySellerId",
    { path: { sellerId: "seller" } },
  );
});

it("maps top listings through the shared public listing adapter", async () => {
  vi.mocked(apiOperation).mockResolvedValue({
    monthlyRevenue: 0,
    monthlyViews: 12,
    conversionRate: 0,
    revenueByCurrency: [],
    topListings: [backendListing],
  });
  const snapshot = await new HttpWorkspaceService().getProAnalytics("user-1");
  expect(snapshot.topListings[0]).toMatchObject({
    id: backendListing.id,
    status: "active",
    title: backendListing.title,
    coverImageUrl: backendListing.images[0],
  });
  expect(snapshot).not.toHaveProperty("weeklyStats");
  expect(snapshot).not.toHaveProperty("conversionRate");
});
