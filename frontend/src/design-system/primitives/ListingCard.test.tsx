import { describe, it, expect } from "vitest";
import { listingDisplayResolver } from "../../domains/listing/listing.display";
import { taxonomyService } from "../../domains/taxonomy/taxonomy.service";
import { Listing } from "../../types";

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
  it("resolves summary attributes accurately for listing cards", () => {
    const node = taxonomyService.getNode(mockListing.subCategorySlug);
    const attrs = listingDisplayResolver.resolveSummaryAttributes(
      mockListing,
      node,
    );
    expect(Array.isArray(attrs)).toBe(true);
  });

  it("generates accurate SEO metadata and title for listing detail", () => {
    const node = taxonomyService.getNode(mockListing.categorySlug);
    const seo = listingDisplayResolver.generateListingSeoMeta(
      mockListing,
      node,
    );
    expect(seo.title).toContain("Appareil photo argentique vintage");
    expect(seo.jsonLd).toBeDefined();
    expect(seo.jsonLd["@type"]).toBe("Product");
  });
});
