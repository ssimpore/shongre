import { describe, expect, it } from "vitest";
import { publicationInputSchema } from "@shongre/contracts";
import {
  mapBackendListing,
  type BackendListing,
} from "@/features/listings/listing.mapper";
import { createDemoListingPromotion } from "@/features/listings/listing.demo-promotion";

const backendListing: BackendListing = {
  id: "listing-1",
  sellerId: "seller-1",
  title: "Objet test",
  description: "Description test",
  price: 2.99,
  currency: "EUR",
  status: "published",
  city: "Paris",
  postalCode: "75001",
  country: "FR",
  marketCode: "FR",
  condition: "good",
  categoryId: "electronics.telephony.smartphones",
  publisherType: "private",
  attributes: {},
  images: [],
  allowedDelivery: ["hand_delivery"],
  fulfillmentTypes: ["PHYSICAL"],
  requiresPhysicalDelivery: true,
  viewCount: 0,
  favoriteCount: 0,
  createdAt: "2026-08-21T08:00:00.000Z",
  updatedAt: "2026-08-21T08:00:00.000Z",
  expiresAt: "2026-10-21T08:00:00.000Z",
};

describe("mobile public contracts", () => {
  it("ties deterministic demo promotion evidence to its owning listing", () => {
    const promotion = createDemoListingPromotion(
      "listing-demo-1",
      "FR",
      "featured",
      "2026-09-01T00:00:00.000Z",
      "2026-10-01T00:00:00.000Z",
    );

    expect(promotion.sourceId).toBe("demo:listing-demo-1:featured");
    expect(promotion.marketCode).toBe("FR");
  });

  it("maps backend major-unit prices into integer minor units", () => {
    const listing = mapBackendListing({
      ...backendListing,
      brand: "  citroen  ",
      seller: {
        id: "seller-1",
        slug: "seller-1",
        name: "Vendeur test",
        accountType: "professional",
        sellerType: "pro",
        country: "FR",
        isVerified: true,
        isBusinessVerified: false,
        rating: 4.8,
        reviewCount: 32,
        responseRatePercent: 80,
      },
    });
    expect(listing.price).toEqual({ amountMinor: 299, currency: "EUR" });
    expect(listing.categoryLabel).toBe("Électronique");
    expect(listing.brandLabel).toBe("Citroën");
    expect(listing.imageUrl).toBeUndefined();
    expect(listing.publishedAt).toBeUndefined();
    expect(listing.seller).toMatchObject({
      sellerType: "individual",
      rating: 4.8,
      reviewCount: 32,
    });
  });

  it("maps only complete active promotion evidence for the listing market", () => {
    const promoted = mapBackendListing({
      ...backendListing,
      promotionState: "active",
      promotionType: "featured",
      promotionSource: "purchase",
      promotionSourceId: "opaque-mobile-proof",
      promotionStartAt: "2020-01-01T00:00:00.000Z",
      promotionEndAt: "2099-01-01T00:00:00.000Z",
    });
    expect(promoted.promotion).toMatchObject({
      marketCode: "FR",
      source: "purchase",
      sourceId: "opaque-mobile-proof",
    });

    expect(
      mapBackendListing({
        ...backendListing,
        isFeatured: true,
        discovery: {
          isSponsored: true,
          placementReason: "sponsored_relevant",
          rankingVersion: "test-v1",
        },
      }).promotion,
    ).toBeUndefined();
  });

  it("rejects non-integer publication amounts", () => {
    const result = publicationInputSchema.safeParse({
      title: "Objet test",
      description: "",
      amountMinor: 299.5,
      currency: "EUR",
      categoryId: "home",
      marketCode: "FR",
      city: "Paris",
      postalCode: "75001",
      condition: "Bon état",
      images: [],
    });
    expect(result.success).toBe(false);
  });

  it("preserves recurring price periods and zero-decimal currencies", () => {
    const listing = mapBackendListing({
      ...backendListing,
      id: "listing-service",
      title: "Service local",
      price: 12_500,
      currency: "XOF",
      city: "Dakar",
      marketCode: "SN",
      condition: "Non applicable",
      categoryId: "services.local_services.home_repairs",
      attributes: { price_type: "daily" },
      country: "SN",
    });

    expect(listing.price).toEqual({ amountMinor: 12_500, currency: "XOF" });
    expect(listing.priceLabel?.replace(/\s/gu, " ")).toContain(
      "12 500 F CFA / jour",
    );
  });

  it("preserves sponsored discovery when no promotion record is projected", () => {
    const discovery = {
      isSponsored: true,
      promotionType: "sponsored_search" as const,
      promotionLabel: "Sponsorisé",
      promotionImpressionId: "spi_mobile_listing_1",
      organicPositionContext: 2,
      placementReason: "sponsored_relevant" as const,
      rankingVersion: "discovery-v7",
    };

    const listing = mapBackendListing({
      ...backendListing,
      discovery,
    });

    expect(listing.discovery).toEqual(discovery);
    expect(listing.promotion).toBeUndefined();
  });

  it("preserves the opaque evidence required for an active market promotion", () => {
    const listing = mapBackendListing({
      ...backendListing,
      promotionState: "active",
      promotionType: "featured",
      promotionSource: "purchase",
      promotionSourceId: "ppf_7d6c9a1e",
      promotionStartAt: "2026-08-21T08:00:00.000Z",
      promotionEndAt: "2026-10-21T08:00:00.000Z",
    });

    expect(listing.promotion).toMatchObject({
      state: "active",
      type: "featured",
      source: "purchase",
      sourceId: "ppf_7d6c9a1e",
    });
  });
});
