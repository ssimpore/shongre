import { describe, expect, it } from "vitest";
import { projectListingForSearchCard } from "./listing-search-card.projection";
import type { Listing } from "../../types";

const listing = {
  id: "l1",
  title: "Vélo gravel",
  description: "Un vélo gravel révisé.",
  price: 250,
  currency: "EUR",
  status: "active",
  marketCode: "FR",
  marketCodes: ["FR", "BE"],
  city: "Lyon",
  postalCode: "69001",
  latitude: 45.76,
  longitude: 4.83,
  publisherUserId: "u1",
  publisherOrganizationId: "o1",
  attributes: {
    canonicalPath: "/annonce/l1",
    price_type: "fixed",
    brand: "Canyon",
    frame_size: "M",
    wheel_size: "700c",
  },
  taxonomy: {
    revision: 1,
    categoryId: "vehicles.cycles.bicycles",
    categorySlug: "velos",
    categoryLabels: { "fr-FR": "Vélos" },
    rootId: "vehicles",
    rootSlug: "vehicules",
    rootLabels: { "fr-FR": "Véhicules" },
    path: [{ id: "vehicles" }, { id: "vehicles.cycles" }],
    cardCharacteristics: [{ code: "frame_size" }],
    detailCharacteristics: [{ code: "wheel_size" }],
  },
  photos: [{ id: "p1", url: "https://m.example/1.jpg", isCover: true }],
  coverImageUrl: "https://m.example/1.jpg",
  sellerId: "u1",
  sellerName: "Camille",
  sellerType: "individual",
  viewsCount: 3,
  favoritesCount: 1,
  contactCount: 0,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  expiresAt: "2026-11-01T00:00:00Z",
  deliveryOptions: [],
} as unknown as Listing;

describe("projectListingForSearchCard", () => {
  it("keeps what a card and its structured data read", () => {
    const card = projectListingForSearchCard(listing);
    expect(card).toMatchObject({
      id: "l1",
      title: "Vélo gravel",
      price: 250,
      currency: "EUR",
      city: "Lyon",
      coverImageUrl: "https://m.example/1.jpg",
      sellerName: "Camille",
      attributes: {
        canonicalPath: "/annonce/l1",
        price_type: "fixed",
        brand: "Canyon",
      },
    });
    expect(card.taxonomy?.cardCharacteristics).toEqual([
      { code: "frame_size" },
    ]);
    expect(card.photos).toHaveLength(1);
  });

  it("drops detail-only facts, identifiers and coordinates", () => {
    const card = projectListingForSearchCard(listing);
    for (const key of [
      "latitude",
      "longitude",
      "publisherUserId",
      "publisherOrganizationId",
      "marketCodes",
    ]) {
      expect(card).not.toHaveProperty(key);
    }
    expect(card.attributes).not.toHaveProperty("frame_size");
    expect(card.taxonomy?.path).toEqual([]);
    expect(card.taxonomy?.detailCharacteristics).toBeUndefined();
  });

  it("is smaller than the full listing", () => {
    expect(
      JSON.stringify(projectListingForSearchCard(listing)).length,
    ).toBeLessThan(JSON.stringify(listing).length);
  });
});
