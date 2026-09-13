import { describe, expect, it } from "vitest";
import type { Listing } from "../../types";
import { presentExploreMapMarker } from "./explore-map-marker.presentation";

const baseListing: Listing = {
  id: "listing-map-price",
  title: "Service local",
  description: "",
  price: 0,
  currency: "EUR",
  isNegotiable: false,
  isFreeDonation: false,
  categorySlug: "services",
  subCategorySlug: "services.local_services",
  categoryLabel: "Services",
  subCategoryLabel: "Services locaux",
  condition: "not_applicable",
  sellerId: "seller-map",
  sellerName: "Vendeur",
  sellerType: "individual",
  sellerRating: 0,
  sellerReviewCount: 0,
  sellerIsVerified: false,
  sellerCity: "Lyon",
  sellerPostalCode: "69000",
  city: "Lyon",
  postalCode: "69000",
  department: "Rhône",
  region: "Auvergne-Rhône-Alpes",
  photos: [],
  coverImageUrl: "",
  deliveryOptions: [],
  isOnlinePaymentAvailable: false,
  attributes: { price_type: "on_request" },
  status: "active",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  expiresAt: "2026-10-01T00:00:00.000Z",
  viewsCount: 0,
  favoritesCount: 0,
  contactCount: 0,
  marketCode: "FR",
};

const priceLabels = { free: "Gratuit", onRequest: "Prix sur demande" };

describe("Explore map marker presentation", () => {
  it("preserves the shared on-request price instead of turning zero into a donation", () => {
    expect(
      presentExploreMapMarker(baseListing, "fr-FR", "FR", priceLabels)
        .priceText,
    ).toBe("Prix sur demande");
  });

  it("formats a regular amount from its real source currency", () => {
    const presentation = presentExploreMapMarker(
      {
        ...baseListing,
        price: 640,
        currency: "CHF",
        attributes: {},
      },
      "fr-CH",
      "FR",
      priceLabels,
    );

    expect(presentation.priceText).toContain("CHF");
    expect(presentation.priceText).not.toContain("EUR");
  });

  it("does not boost standalone discovery ranking data", () => {
    expect(
      presentExploreMapMarker(
        {
          ...baseListing,
          discovery: {
            isSponsored: true,
            placementReason: "sponsored_relevant",
            rankingVersion: "test-v1",
          },
        },
        "fr-FR",
        "FR",
        priceLabels,
      ).isBoosted,
    ).toBe(false);
  });
  it("does not turn a price reduction into paid map prominence", () => {
    expect(
      presentExploreMapMarker(
        { ...baseListing, price: 80, originalPrice: 100, attributes: {} },
        "fr-FR",
        "FR",
        priceLabels,
      ).isBoosted,
    ).toBe(false);
  });
});
