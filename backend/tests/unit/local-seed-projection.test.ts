import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import { describe, expect, it } from "vitest";
import {
  createSeedListing,
  createSeedListingPromotion,
  marketplaceFixture,
} from "../../scripts/seed/local-development-data.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";
import { projectListingCharacteristics } from "../../src/modules/taxonomy/taxonomy.characteristics.js";

const availableCategoryIds = new Set(
  TAXONOMY_V1_PRIVATE_BUNDLE.categories.map(({ id }) => id),
);
const categoriesById = new Map(
  TAXONOMY_V1_PRIVATE_BUNDLE.categories.map((category) => [
    category.id,
    category,
  ]),
);

describe("shared backend marketplace scenario projection", () => {
  it("creates repeatable local grant evidence for each placement meaning", () => {
    for (const [id, type, label] of [
      ["list-107", "sponsored_search", "Sponsorisé"],
      ["list-115", "featured", "À la une"],
      ["list-103", "urgent_badge", "Urgent"],
    ]) {
      const source = marketplaceFixture.listings.find((row) => row.id === id)!;
      const listing = createSeedListing(source, {
        listingId: source.id,
        profileId: (id) => id,
        taxonomy: new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 1),
        images: [],
      });
      const grant = createSeedListingPromotion(listing);
      expect(grant).toMatchObject({
        listing_id: id,
        market_code: "FR",
        placement_type: type,
        label,
        source_type: "admin_grant",
        admin_grant_reference: `local-seed:${id}:FR:${type}`,
        starts_at: listing.promotionStartAt,
        ends_at: listing.promotionEndAt,
      });
      expect(grant?.source_order_id).toBeUndefined();
      expect(grant?.source_entitlement_id).toBeUndefined();
      expect(createSeedListingPromotion(listing)).toEqual(grant);
      expect(
        createSeedListingPromotion({
          ...listing,
          promotionType: type === "featured" ? "search_bump" : "featured",
        })?.id,
      ).not.toBe(grant?.id);
      expect(
        createSeedListingPromotion({ ...listing, status: "draft" }),
      ).toBeUndefined();
      expect(
        createSeedListingPromotion({ ...listing, promotionState: "inactive" }),
      ).toBeUndefined();
      expect(
        createSeedListingPromotion({ ...listing, promotionSource: "purchase" }),
      ).toBeUndefined();
      expect(
        createSeedListingPromotion({
          ...listing,
          marketPublications: listing.marketPublications?.map(
            (publication) => ({
              ...publication,
              marketCode: "BE",
            }),
          ),
        }),
      ).toBeUndefined();
      expect(
        createSeedListingPromotion({
          ...listing,
          marketPublications: listing.marketPublications?.map(
            (publication) => ({
              ...publication,
              complianceState: "pending",
            }),
          ),
        }),
      ).toBeUndefined();
    }
  });

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
      expect(categoriesById.get(listing.categoryId)?.publishable).toBe(true);
      expect(listing.listingTypeId).toBe(source.listingTypeId);
      expect(listing.listingIntent).toBeTruthy();
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

  it("keeps one database-backed detail example for every active root category", () => {
    const taxonomy = new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 1);
    const representedRoots = new Set<string>();
    for (const source of marketplaceFixture.listings) {
      const listing = createSeedListing(source, {
        listingId: source.id,
        profileId: (id) => id,
        taxonomy,
        images: source.photos.map((photo: { url: string }) => photo.url),
      });
      let category = categoriesById.get(listing.categoryId);
      while (category?.parentId)
        category = categoriesById.get(category.parentId);
      if (category) representedRoots.add(category.id);
      const details = projectListingCharacteristics(
        {
          categoryId: listing.categoryId,
          listingTypeId: listing.listingTypeId,
          intent: listing.listingIntent,
          sellerType:
            source.sellerType === "pro" ? "professional" : "individual",
          marketCode: source.marketCode || "FR",
          locale: "fr-FR",
          attributes: listing.attributes || {},
        },
        TAXONOMY_V1_PRIVATE_BUNDLE,
      );
      expect(
        details.groups.reduce((count, group) => count + group.items.length, 0),
        `${source.id} should exercise its category detail schema`,
      ).toBeGreaterThanOrEqual(6);
    }
    const activeRoots = TAXONOMY_V1_PRIVATE_BUNDLE.categories
      .filter(
        (category) =>
          !category.parentId &&
          category.status === "active" &&
          category.marketAvailability.some(
            (market) => market.marketCode === "FR" && market.marketplaceEnabled,
          ),
      )
      .map((category) => category.id)
      .sort();
    expect([...representedRoots].sort()).toEqual(activeRoots);
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
          getBundle: () => TAXONOMY_V1_PRIVATE_BUNDLE,
          isDescendant: () => false,
          projectIdentity: () => undefined,
        },
        images: [],
      }),
    ).toThrow("No database category is compatible");
  });

  it("preserves explicit negotiation and reservation eligibility for the listing API", () => {
    const project = (source: Record<string, any>) =>
      createSeedListing(source, {
        listingId: source.id,
        profileId: (id) => id,
        taxonomy: new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 1),
        images: [],
      });
    const eligible = marketplaceFixture.listings.find(
      ({ id }) => id === "list-be-201",
    )!;
    const listing = project(eligible);
    expect(listing.attributes?.price_type).toBe("negotiable");
    expect(
      listing.marketPublications?.find(({ marketCode }) => marketCode === "BE")
        ?.availableServices,
    ).toMatchObject({ reservation: true, reservation_type: "request" });

    const fixed = project(
      marketplaceFixture.listings.find(({ id }) => id === "list-112")!,
    );
    expect(fixed.attributes?.price_type).toBe("fixed");
    expect(fixed.marketPublications?.[0].availableServices?.reservation).toBe(
      false,
    );
    const free = project(
      marketplaceFixture.listings.find(({ id }) => id === "list-110")!,
    );
    expect(free.attributes?.price_type).toBe("free");

    const disabled = project({
      ...eligible,
      marketPublications: [
        {
          marketCode: "BE",
          status: "active",
          availableServices: { reservation: false },
        },
      ],
    });
    expect(
      disabled.marketPublications?.[0].availableServices?.reservation,
    ).toBe(false);
    expect(
      project({ ...eligible, attributes: { price_type: "on_request" } })
        .attributes?.price_type,
    ).toBe("on_request");
  });
});
