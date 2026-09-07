import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/api/http-client";
import { HttpFavoritesService } from "@/features/favorites/favorites.service";
import { HttpListingsService } from "@/features/listings/listings.service";
import { HttpMessagingService } from "@/features/messaging/messaging.service";
import { HttpWatchSubscriptionsService } from "@/features/watch-subscriptions/watch-subscriptions.service";

const listing = {
  id: "listing-1",
  sellerId: "seller-1",
  title: "Vélo de ville",
  description: "Description",
  price: 120,
  currency: "EUR",
  status: "published",
  city: "Bruxelles",
  postalCode: "1000",
  country: "BE",
  marketCode: "BE",
  condition: "good",
  categoryId: "sports.cycling",
  publisherType: "private",
  attributes: {},
  images: [],
  allowedDelivery: [],
  fulfillmentTypes: ["PHYSICAL"],
  requiresPhysicalDelivery: true,
  viewCount: 0,
  favoriteCount: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  expiresAt: "2026-10-01T00:00:00.000Z",
};

describe("API-backed mobile engagement services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps favorites returned for the exact market", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      listingIds: [listing.id],
      listings: [listing],
    });

    const result = await new HttpFavoritesService().list("account-a", "BE");
    expect(result.listingIds).toEqual(["listing-1"]);
    expect(result.listings[0]).toMatchObject({
      id: "listing-1",
      marketCode: "BE",
      price: { amountMinor: 12_000, currency: "EUR" },
    });
    expect(apiRequest).toHaveBeenCalledWith("/favorites", {}, "BE");
  });

  it("sets desired favorite state idempotently in the exact market", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ isFavorite: false });

    await expect(
      new HttpFavoritesService().setFavorite(
        "account-a",
        "BE",
        "listing/a",
        false,
      ),
    ).resolves.toBe(false);
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/listing%2Fa/favorite",
      { method: "PUT", body: JSON.stringify({ isFavorite: false }) },
      "BE",
    );
  });

  it("maps API conversations without trusting a caller-selected participant", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      items: [
        {
          id: "conversation-1",
          listingId: "listing-1",
          marketCode: "FR",
          buyerId: "account-a",
          sellerId: "seller-1",
          seller: { name: "Camille" },
          listing: { title: "Vélo", marketCode: "FR" },
          lastMessageAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    const result = await new HttpMessagingService().list("account-a", "FR");
    expect(result[0]).toMatchObject({
      participantName: "Camille",
      listingTitle: "Vélo",
      marketCode: "FR",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/messaging/conversations?limit=50",
      {},
      "FR",
    );
  });

  it("sends watch mutations through their generated API paths", async () => {
    const input = {
      marketCode: "FR",
      targetType: "seller",
      targetId: "seller-1",
      title: "Vendeur",
      frequency: "daily",
      channels: { inApp: true, email: false, push: false },
    } as const;
    vi.mocked(apiRequest).mockResolvedValueOnce({
      id: "watch-1",
      ...input,
      status: "active",
      createdAt: "2026-09-07T00:00:00.000Z",
      updatedAt: "2026-09-07T00:00:00.000Z",
    });

    await new HttpWatchSubscriptionsService().createOrReplace(
      "account-a",
      input,
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/watch-subscriptions",
      { method: "POST", body: JSON.stringify(input) },
      "FR",
    );
  });

  it("sends authoritative scope and price filters to search", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ items: [listing] });

    const result = await new HttpListingsService().search({
      marketCode: "FR",
      query: "  vélo  ",
      scope: "auto",
      minPrice: 10,
      maxPrice: 25.5,
    });

    expect(result).toHaveLength(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/search",
      {
        method: "POST",
        body: JSON.stringify({
          marketCode: "FR",
          query: "vélo",
          categoryId: "vehicles",
          minPrice: 10,
          maxPrice: 25.5,
        }),
      },
      "FR",
    );
  });

  it("preserves API errors instead of returning listing fixtures", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("network offline"));

    await expect(
      new HttpListingsService().search({
        marketCode: "FR",
        query: "vélo",
      }),
    ).rejects.toThrow("network offline");
  });
});
