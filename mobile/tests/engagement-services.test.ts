import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLICATION_CONSTRAINTS } from "@shongre/contracts/publication";

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

  it("restores and saves the shared private draft without sending local photo URIs", async () => {
    const service = new HttpListingsService();
    vi.mocked(apiRequest).mockResolvedValueOnce({
      marketCode: "FR",
      taxonomyNodeId: "electronics.phones",
      title: "Téléphone",
      pricing: {
        amount: 120,
        currency: "EUR",
        priceModel: "negotiable",
        isNegotiable: true,
      },
      location: { city: "Lyon", postalCode: "69002" },
      photos: [
        {
          id: "remote",
          url: "https://media.example.test/phone.jpg",
          isCover: true,
        },
      ],
      selectedMarkets: ["FR"],
      fulfillment: { allowHandDelivery: false, allowParcelShipping: true },
      proInventory: { stock: 3, sku: "WEB-3" },
    });
    const restored = await service.getDraft("FR");
    expect(restored).toMatchObject({
      title: "Téléphone",
      price: "120",
      categoryId: "electronics.phones",
      images: ["https://media.example.test/phone.jpg"],
    });
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true });
    await service.saveDraft("FR", {
      ...restored!,
      title: "Téléphone révisé",
      images: [
        "https://media.example.test/phone.jpg",
        "file:///private/new.jpg",
      ],
    });
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/listing-drafts/current",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"title":"Téléphone révisé"'),
      }),
      "FR",
    );
    const body = JSON.parse(
      vi.mocked(apiRequest).mock.lastCall?.[1]?.body as string,
    );
    expect(body.selectedMarkets).toEqual(["FR"]);
    expect(body.photos).toHaveLength(1);
    expect(body.photos[0].url).toBe("https://media.example.test/phone.jpg");
    expect(body.photos[0].id).toBe("remote");
    expect(body.pricing).toMatchObject({
      priceModel: "negotiable",
      isNegotiable: true,
    });
    expect(body.fulfillment).toEqual({
      allowHandDelivery: false,
      allowParcelShipping: true,
    });
    expect(body.proInventory).toEqual({ stock: 3, sku: "WEB-3" });
  });

  it("preserves a boundary title and rejects overlong publication before HTTP", async () => {
    const title = "é".repeat(PUBLICATION_CONSTRAINTS.title.maxLength);
    const input = {
      title,
      description: "Description du produit",
      amountMinor: 12000,
      currency: "EUR",
      categoryId: "electronics.smartphones.phones",
      marketCode: "FR",
      city: "Lyon",
      postalCode: "69002",
      condition: "good",
      attributes: {},
      images: [],
    };
    const actor = {
      id: "account-a",
      email: "seller@example.test",
      name: "Seller",
      role: "individual_seller",
      accountType: "individual" as const,
      status: "active" as const,
      capabilities: ["listing.create" as const],
    };
    const service = new HttpListingsService();
    await expect(
      service.publish({ ...input, title: `${title}!` }, actor),
    ).rejects.toThrow();
    expect(apiRequest).not.toHaveBeenCalled();
    vi.mocked(apiRequest).mockResolvedValueOnce({ ...listing, title });
    await expect(service.publish(input, actor)).resolves.toMatchObject({
      title,
    });
    expect(
      JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string).draft
        .title,
    ).toBe(title);
  });

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
    expect(apiRequest).toHaveBeenCalledWith(
      "/favorites",
      expect.objectContaining({ method: "GET" }),
      "BE",
    );
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
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ isFavorite: false }),
      }),
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
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
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
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
        headers: expect.any(Headers),
      }),
      "FR",
    );
  });

  it("sends authoritative scope and price filters to search", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      items: [listing],
      total: 2,
      pageInfo: { hasNextPage: true, nextCursor: "page-2" },
    });

    const result = await new HttpListingsService().search({
      marketCode: "FR",
      query: "  vélo  ",
      scope: "auto",
      minPrice: 10,
      maxPrice: 25.5,
    });

    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.nextCursor).toBe("page-2");
    expect(result.total).toBe(2);
    expect(result.didYouMean).toBeUndefined();
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          marketCode: "FR",
          query: "vélo",
          categoryId: "vehicles",
          minPrice: 10,
          maxPrice: 25.5,
        }),
        headers: expect.any(Headers),
      }),
      "FR",
    );
  });

  it("carries the API's spelling correction when nothing matched", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      items: [],
      total: 0,
      pageInfo: { hasNextPage: false },
      didYouMean: "vélo",
    });

    const result = await new HttpListingsService().search({
      marketCode: "FR",
      query: "velp",
      scope: "marketplace",
    });

    expect(result).toEqual({
      items: [],
      total: 0,
      pageInfo: { hasNextPage: false },
      didYouMean: "vélo",
    });
  });

  it("forwards the API cursor for the next page", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      items: [],
      total: 39,
      pageInfo: { hasNextPage: false },
    });
    await new HttpListingsService().search({
      marketCode: "FR",
      cursor: "page-2",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/search",
      expect.objectContaining({
        body: JSON.stringify({ marketCode: "FR", cursor: "page-2" }),
      }),
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
