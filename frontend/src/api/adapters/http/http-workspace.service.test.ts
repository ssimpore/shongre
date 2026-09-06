import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "./http-client";
import { HttpWorkspaceService } from "./http-workspace.service";
import type { BackendListing } from "./http-listings.service";

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
    vi.spyOn(httpClient, "get").mockResolvedValue({
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

    expect(httpClient.get).toHaveBeenCalledWith("/workspace/summary/user-1", {
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
