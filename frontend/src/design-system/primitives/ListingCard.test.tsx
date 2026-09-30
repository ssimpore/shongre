import { describe, it, expect, vi, afterEach } from "vitest";
import { Listing } from "../../types";
import { projectGenericListingCardView } from "../../domains/listing/listing-card.generic-presentation";

afterEach(() => vi.restoreAllMocks());

const mockListing: Listing = {
  id: "listing-test-1",
  sellerId: "seller-1",
  title: "Appareil photo argentique vintage",
  description: "Très bon état avec objectif 50mm.",
  price: 150,
  isNegotiable: false,
  isFreeDonation: false,
  currency: "EUR",
  categorySlug: "multimedia",
  categoryLabel: "Multimédia",
  subCategorySlug: "photo-audio",
  subCategoryLabel: "Photo & Caméscopes",
  condition: "very_good",
  city: "Bordeaux",
  postalCode: "33000",
  department: "Gironde",
  region: "Nouvelle-Aquitaine",
  marketCode: "FR",
  photos: [
    {
      id: "p1",
      url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
      isCover: true,
    },
  ],
  coverImageUrl:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
  status: "active",
  sellerName: "Studio Photo",
  sellerType: "pro",
  sellerRating: 4.9,
  sellerReviewCount: 38,
  sellerIsVerified: true,
  sellerCity: "Bordeaux",
  sellerPostalCode: "33000",
  deliveryOptions: [{ type: "hand_delivery", available: true, price: 0 }],
  isOnlinePaymentAvailable: true,
  isBoosted: true,
  originalPrice: 190,
  viewsCount: 120,
  favoritesCount: 15,
  contactCount: 4,
  attributes: {},
  expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Listing Display & Card Data Presentation", () => {
  it("projects the canonical card anatomy without trusting legacy boost flags", () => {
    const card = projectGenericListingCardView(
      { ...mockListing, coverImageUrl: "" },
      "fr-FR",
      "FR",
    );

    expect(card.imageUrl).toBe(mockListing.photos[0]?.url);
    expect(card.price).toEqual({ amountMinor: 15_000, currency: "EUR" });
    expect(card.originalPrice).toEqual({
      amountMinor: 19_000,
      currency: "EUR",
    });
    expect(card.photoCount).toBe(1);
    expect(card.onlinePaymentAvailable).toBe(true);
    expect(card.isNegotiable).toBe(false);
    expect(card.deliveryAvailable).toBe(false);
    expect(card.seller?.isIdentityVerified).toBe(true);
    expect(card.isFeatured).toBe(false);
    expect(card.isUrgent).toBe(false);
    expect(card.promotion).toBeUndefined();
  });

  it("projects only explicitly available delivery and digital fulfillment", () => {
    const deliverable = projectGenericListingCardView(
      {
        ...mockListing,
        deliveryOptions: [
          { type: "hand_delivery", available: true, price: 0 },
          { type: "relay_point", available: true, price: 4.9 },
        ],
      },
      "fr-FR",
      "FR",
    );
    const digital = projectGenericListingCardView(
      {
        ...mockListing,
        deliveryOptions: [{ type: "digital", available: true }],
        fulfillmentTypes: ["FILE_DOWNLOAD"],
        requiresPhysicalDelivery: false,
      },
      "fr-FR",
      "FR",
    );

    expect(deliverable.deliveryAvailable).toBe(true);
    expect(digital.deliveryAvailable).toBe(false);
    expect(digital.fulfillmentTypes).toEqual(["FILE_DOWNLOAD"]);
    expect(digital.requiresPhysicalDelivery).toBe(false);
  });

  it("carries an explicit promotion projection to every shared card consumer", () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-09-12T12:00:00.000Z"),
    );
    const card = projectGenericListingCardView(
      {
        ...mockListing,
        promotionState: "active",
        promotionType: "homepage_spotlight",
        promotionSource: "admin_grant",
        promotionSourceId: "grant-1",
        promotionStartAt: "2026-09-01T00:00:00.000Z",
        promotionEndAt: "2026-09-30T00:00:00.000Z",
      },
      "fr-FR",
      "FR",
    );

    expect(card.isFeatured).toBe(true);
    expect(card.promotion).toEqual({
      state: "active",
      type: "homepage_spotlight",
      marketCode: "FR",
      source: "admin_grant",
      sourceId: "grant-1",
      startsAt: "2026-09-01T00:00:00.000Z",
      endsAt: "2026-09-30T00:00:00.000Z",
    });
  });

  it("uses the proven request market without inventing a missing currency", () => {
    const card = projectGenericListingCardView(
      {
        ...mockListing,
        marketCode: undefined,
        currency: undefined,
      },
      "fr-CH",
      "CH",
    );

    expect(card.marketCode).toBe("CH");
    expect(card.priceKind).toBe("unpriced");
    expect(card.price).toBeUndefined();
  });

  it("drops promotion and sponsored ranking from a mismatched market payload", () => {
    const card = projectGenericListingCardView(
      {
        ...mockListing,
        marketCode: "FR",
        promotionState: "active",
        promotionType: "featured",
        promotionSource: "purchase",
        promotionSourceId: "promotion-proof",
        promotionStartAt: "2026-09-01T00:00:00.000Z",
        promotionEndAt: "2026-09-30T00:00:00.000Z",
        discovery: {
          isSponsored: true,
          placementReason: "sponsored_relevant",
          rankingVersion: "test-ranking-v1",
        },
      },
      "fr-BE",
      "BE",
    );

    expect(card.marketCode).toBe("FR");
    expect(card.promotion).toBeUndefined();
    expect(card.discovery).toBeUndefined();
    expect(card.isFeatured).toBe(false);
  });
});
