import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import { describe, expect, it } from "vitest";
import {
  createSeedListing,
  marketplaceFixture,
} from "../../scripts/seed/local-development-data.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";

const availableCategoryIds = new Set(
  TAXONOMY_V1_PRIVATE_BUNDLE.categories.map(({ id }) => id),
);

describe("shared backend marketplace scenario projection", () => {
  it("projects every fixture without mutating its source or inventing a category", () => {
    const before = JSON.stringify(marketplaceFixture.listings);
    for (const source of marketplaceFixture.listings) {
      const listing = createSeedListing(source, {
        listingId: source.id,
        profileId: (id) => id,
        taxonomy: new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 1),
        images: source.photos.map((photo: { url: string }) => photo.url),
      });
      expect(availableCategoryIds.has(listing.categoryId)).toBe(true);
      expect(listing.title).toBe(source.title);
      expect(listing.price).toBe(source.price);
      expect(listing.sellerId).toBe(source.sellerId);
      expect(listing.images).toEqual(
        source.photos.map((photo: { url: string }) => photo.url),
      );
      expect(listing.marketPublications?.length).toBeGreaterThan(0);
      expect(
        listing.marketPublications?.every(({ priceMinor }) =>
          Number.isInteger(priceMinor),
        ),
      ).toBe(true);
    }
    expect(JSON.stringify(marketplaceFixture.listings)).toBe(before);
  });

  it("keeps storage identities and media transport outside the source projection", () => {
    const source = marketplaceFixture.listings[0];
    const listing = createSeedListing(source, {
      listingId: "persisted-listing",
      profileId: (id) => `persisted-${id}`,
      taxonomy: new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 1),
      images: ["https://storage.example.test/public/listing.jpg"],
    });
    expect(listing.id).toBe("persisted-listing");
    expect(listing.sellerId).toBe(`persisted-${source.sellerId}`);
    expect(listing.images).toEqual([
      "https://storage.example.test/public/listing.jpg",
    ]);
    expect(() =>
      createSeedListing(source, {
        listingId: source.id,
        profileId: (id) => id,
        taxonomy: {
          findCategory: () => undefined,
          projectIdentity: () => undefined,
        },
        images: [],
      }),
    ).toThrow("No database category is compatible");
  });
});
