import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicationDraftState } from "../../../domains/publication/publication.types";
import {
  type BackendListing,
  HttpListingsService,
  mapBackendListing,
} from "./http-listings.service";
import { publicationPayload } from "./publication-payload";
import { httpClient } from "./http-client";

afterEach(() => vi.restoreAllMocks());

it("reads characteristics from the generated listing operation with explicit market and locale", async () => {
  const data = { groups: [] };
  const request = vi.spyOn(httpClient, "request").mockResolvedValue(data);
  expect(
    await new HttpListingsService().getCharacteristics(
      "saved-listing",
      "BE",
      "fr-BE",
    ),
  ).toEqual(data);
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining(
      "/listings/saved-listing/characteristics?locale=fr-BE",
    ),
    expect.objectContaining({ method: "GET" }),
  );
  expect(
    new Headers(request.mock.calls[0]?.[1]?.headers).get("X-Shongre-Market"),
  ).toBe("BE");
});

const draft: PublicationDraftState = {
  marketCode: "FR",
  taxonomyNodeId: "electronics.computers.laptops",
  taxonomyPath: [
    "electronics",
    "electronics.computers",
    "electronics.computers.laptops",
  ],
  listingTypeId: "electronics.computers.laptops.listing",
  taxonomyVersion: "v1",
  listingIntent: "SELL",
  title: "Ordinateur portable professionnel",
  description: "Ordinateur complet, testé et prêt à utiliser.",
  condition: "very_good",
  attributes: {
    brand: "renault",
    storage_capacity_gb: 512,
  },
  photos: [],
  pricing: {
    priceModel: "fixed",
    amount: 800,
    currency: "EUR",
    isNegotiable: false,
    isFreeDonation: false,
  },
  fulfillment: {
    allowHandDelivery: true,
    allowParcelShipping: true,
  },
  fulfillmentTypes: ["PHYSICAL"],
  location: {
    city: "Paris",
    postalCode: "75001",
    countryCode: "FR",
    hideExactAddress: true,
  },
  currentStep: 1,
  updatedAt: "2026-09-02T10:00:00.000Z",
};

const backendListing: BackendListing = {
  id: "listing-http-1",
  sellerId: "seller-1",
  categoryId: "home_garden.furniture.sofas",
  title: "Canapé",
  description: "Canapé trois places en velours.",
  price: 0,
  currency: "EUR",
  status: "published",
  condition: "good",
  marketCode: "FR",
  city: "Lyon",
  postalCode: "69003",
  country: "FR",
  allowedDelivery: ["hand_delivery"],
  fulfillmentTypes: ["PHYSICAL"],
  requiresPhysicalDelivery: true,
  images: [],
  attributes: { material: "velvet" },
  viewCount: 0,
  favoriteCount: 0,
  createdAt: "2026-09-02T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
  expiresAt: "2026-11-02T10:00:00.000Z",
};

describe("HTTP listing publication payload", () => {
  it("forwards the attributes already reconciled against the API schema", () => {
    const payload = publicationPayload(draft);
    const attributes = payload.attributes as Record<string, unknown>;
    expect(attributes.brand).toBe("renault");
    expect(attributes.storage_capacity_gb).toBe(512);
    expect(attributes.title).toBe(draft.title);
    expect(attributes.currency).toBe("EUR");
    expect(payload.fulfillmentTypes).toEqual(["PHYSICAL"]);
  });

  it("preserves the canonical publisher and root brand from HTTP listings", () => {
    const listing = mapBackendListing({
      ...backendListing,
      publisherType: "professional",
      brand: "IKEA",
      seller: {
        id: "seller-1",
        slug: "seller-1",
        name: "Vendeur",
        accountType: "individual",
        sellerType: "individual",
        country: "FR",
        isVerified: false,
        isBusinessVerified: false,
        rating: 4.8,
        reviewCount: 32,
        responseRatePercent: 80,
      },
    });

    expect(listing.publisherType).toBe("professional");
    expect(listing.sellerType).toBe("pro");
    expect(listing.sellerProfile).toMatchObject({
      id: "seller-1",
      slug: "seller-1",
      name: "Vendeur",
    });
    expect(listing.attributes).toMatchObject({
      brand: "IKEA",
      material: "velvet",
    });
  });

  it("uses the explicit price type instead of treating every zero as a gift", () => {
    const onRequest = mapBackendListing({
      ...backendListing,
      attributes: { price_type: "on_request" },
    });
    const free = mapBackendListing({
      ...backendListing,
      attributes: { price_type: "free" },
    });

    expect(onRequest.isFreeDonation).toBe(false);
    expect(onRequest.pricePresentation).toEqual({
      kind: "price",
      visibility: "undisclosed",
      currency: "EUR",
    });
    expect(free.isFreeDonation).toBe(true);
    expect(free.attributes.price_type).toBe("free");
  });

  it("preserves recurring price periods and zero-decimal currencies", () => {
    const hourly = mapBackendListing({
      ...backendListing,
      price: 12_500,
      currency: "XOF",
      attributes: { price_type: "hourly" },
    });

    expect(hourly.pricePresentation).toEqual({
      kind: "service_rate",
      visibility: "public",
      minimumAmountMinor: 12_500,
      maximumAmountMinor: 12_500,
      currency: "XOF",
      period: "hour",
    });
  });

  it("shows only transaction capabilities explicitly projected by the API", () => {
    const absent = mapBackendListing(backendListing);
    const available = mapBackendListing({
      ...backendListing,
      listingTypeId: "home_garden.furniture.sofas.sell",
      listingIntent: "SELL",
      attributes: { price_type: "negotiable" },
      marketPublications: [
        {
          marketCode: "FR",
          status: "active",
          isPrimary: true,
          priceMinor: 10_000,
          currency: "EUR",
          availableServices: {
            online_payment: true,
            reservation: true,
            reservation_type: "request",
          },
          complianceState: "approved",
          sortDate: "2026-09-02T10:00:00.000Z",
        },
      ],
    });

    expect(absent.isOnlinePaymentAvailable).toBe(false);
    expect(absent.isReservable).toBe(false);
    expect(available).toMatchObject({
      listingTypeId: "home_garden.furniture.sofas.sell",
      listingIntent: "SELL",
      isNegotiable: true,
      isOnlinePaymentAvailable: true,
      isReservable: true,
      reservationType: "request",
    });
  });

  it("retains every public delivery method instead of dropping valid capabilities", () => {
    const listing = mapBackendListing({
      ...backendListing,
      allowedDelivery: [
        "hand_delivery",
        "relay_point",
        "home_delivery",
        "cocolis",
        "express",
        "digital",
      ],
    });

    expect(listing.deliveryOptions.map(({ type }) => type)).toEqual([
      "hand_delivery",
      "relay_point",
      "home_delivery",
      "cocolis",
      "express",
      "digital",
    ]);
  });

  it("preserves sponsored discovery when no promotion record is projected", () => {
    const discovery = {
      isSponsored: true,
      promotionType: "sponsored_search" as const,
      promotionLabel: "Sponsorisé",
      promotionImpressionId: "spi_http_listing_1",
      organicPositionContext: 3,
      placementReason: "sponsored_relevant" as const,
      rankingVersion: "discovery-v7",
    };

    const listing = mapBackendListing({
      ...backendListing,
      discovery,
    });

    expect(listing.discovery).toEqual(discovery);
    expect(listing.promotionState).toBeUndefined();
  });
});

describe("HTTP favorite market boundary", () => {
  it("sends the explicit market on favorite reads, writes, and projections", async () => {
    const request = vi
      .spyOn(httpClient, "request")
      .mockResolvedValueOnce({ listingIds: [], listings: [] })
      .mockResolvedValueOnce({ isFavorite: false })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
      });
    const service = new HttpListingsService();

    await service.getFavoriteCollection("BE");
    await service.setFavorite("listing-1", "BE", false);
    await service.searchListings({ marketCode: "BE", page: 1, limit: 24 });

    expect(request.mock.calls[0]?.[0]).toBe("/favorites");
    expect(
      new Headers(request.mock.calls[0]?.[1]?.headers).get("X-Shongre-Market"),
    ).toBe("BE");
    expect(request.mock.calls[1]?.[0]).toBe("/listings/listing-1/favorite");
    expect(request.mock.calls[1]?.[1]?.method).toBe("PUT");
    expect(request.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({ isFavorite: false }),
    );
    expect(
      new Headers(request.mock.calls[1]?.[1]?.headers).get("X-Shongre-Market"),
    ).toBe("BE");
    expect(request.mock.calls[2]?.[0]).toBe("/listings/search");
    expect(request.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ marketCode: "BE", page: 1, limit: 24 }),
      }),
    );
    expect(
      new Headers(request.mock.calls[2]?.[1]?.headers).get("X-Shongre-Market"),
    ).toBe("BE");
  });

  it("hydrates several guest favorites with one market-scoped batch request", async () => {
    const listingIdOne = "018f47d2-2b91-7e16-8ab5-1fba3b1d1001";
    const listingIdTwo = "018f47d2-2b91-7e16-8ab5-1fba3b1d1002";
    const request = vi.spyOn(httpClient, "request").mockResolvedValue({
      listings: [
        { ...backendListing, id: listingIdOne, marketCode: "BE" },
        { ...backendListing, id: listingIdTwo, marketCode: "BE" },
      ],
      total: 2,
    });
    const service = new HttpListingsService();

    const listings = await service.getPublicListingsByIds(
      [listingIdOne, listingIdTwo, listingIdOne, "stale-demo-id"],
      "BE",
    );

    expect(listings.map(({ id }) => id)).toEqual([listingIdOne, listingIdTwo]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("/listings/cards");
    expect(request.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ listingIds: [listingIdOne, listingIdTwo] }),
      }),
    );
    expect(
      new Headers(request.mock.calls[0]?.[1]?.headers).get("X-Shongre-Market"),
    ).toBe("BE");
  });
});

describe("HTTP seller listing workspace", () => {
  it("loads only the signed-in account collection for the explicit market", async () => {
    const request = vi.spyOn(httpClient, "request").mockResolvedValue({
      listings: [backendListing],
      total: 1,
    });
    const service = new HttpListingsService();

    const result = await service.getOwnListings("FR");

    expect(result.total).toBe(1);
    expect(result.listings[0]?.id).toBe(backendListing.id);
    expect(request.mock.calls[0]?.[0]).toBe("/account/listings");
    expect(
      new Headers(request.mock.calls[0]?.[1]?.headers).get("X-Shongre-Market"),
    ).toBe("FR");
  });

  it("marks a listing sold through the authenticated owner endpoint", async () => {
    const request = vi.spyOn(httpClient, "request").mockResolvedValue({
      ...backendListing,
      status: "sold",
    });
    const service = new HttpListingsService();

    const result = await service.markListingSold(backendListing.id);

    expect(result.status).toBe("sold");
    expect(request).toHaveBeenCalledWith(
      `/listings/${backendListing.id}/mark-sold`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});
