import { describe, expect, it } from "vitest";
import { createDefaultHomepageConfiguration } from "@shongre/contracts/homepage";
import { DemoHomepageRepository } from "../../src/infrastructure/database/repositories/homepage.repository.js";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoTrendingRepository } from "../../src/infrastructure/database/repositories/trending.repository.js";
import { HomepageService } from "../../src/modules/homepage/homepage.service.js";
import { TrendingService } from "../../src/modules/trending/trending.service.js";
import type { Listing } from "../../src/shared/types/index.js";

const discountedListing = (
  id: string,
  marketCode = "FR",
  updates: Partial<Listing> = {},
): Listing => ({
  ...CANONICAL_DEMO_LISTINGS.list_1,
  id,
  marketCode,
  marketCodes: [marketCode],
  marketPublications: [
    {
      marketCode,
      status: "active",
      isPrimary: true,
      priceMinor: 8_000,
      currency: marketCode === "CH" ? "CHF" : "EUR",
      complianceState: "approved",
      sortDate: "2026-08-29T00:00:00.000Z",
    },
  ],
  price: 80,
  originalPrice: 100,
  currency: marketCode === "CH" ? "CHF" : "EUR",
  status: "published",
  updatedAt: "2026-08-29T00:00:00.000Z",
  ...updates,
});

function serviceWithListings(listings: Listing[]) {
  const listingRepo = new DemoListingRepository(
    Object.fromEntries(listings.map((listing) => [listing.id, listing])),
  );
  return new HomepageService(
    new DemoHomepageRepository(),
    listingRepo,
    new TrendingService(new DemoTrendingRepository(), listingRepo),
  );
}

describe("HomepageService", () => {
  it("resolves four trend slots and exactly six same-market deals", async () => {
    const service = serviceWithListings(
      Array.from({ length: 8 }, (_, index) =>
        discountedListing(`listing-${index}`, "FR", {
          categoryId: `category-${index % 4}`,
          price: 60 + index,
          marketPublications: [
            {
              marketCode: "FR",
              status: "active",
              isPrimary: true,
              priceMinor: (60 + index) * 100,
              currency: "EUR",
              complianceState: "approved",
              sortDate: "2026-08-29T00:00:00.000Z",
            },
          ],
        }),
      ),
    );
    const response = await service.getPublished({
      marketCode: "FR",
      locale: "fr-FR",
      now: new Date("2026-08-29T12:00:00.000Z"),
    });
    const trends = response.sections.find(
      (section) => section.type === "trending",
    );
    const deals = response.sections.find((section) => section.type === "deals");

    expect(trends?.trending?.topics).toHaveLength(4);
    expect(deals?.deals).toHaveLength(6);
    expect(
      deals?.deals?.every((item) => item.listing.marketCode === "FR"),
    ).toBe(true);
    expect(deals?.deals?.[0].offer.currentPrice.currency).toBe("EUR");
  });

  it("removes expired and wrong-market offers", async () => {
    const service = serviceWithListings([
      discountedListing("expired", "FR", {
        promotionState: "expired",
        promotionEndAt: "2026-08-28T00:00:00.000Z",
      }),
      discountedListing("belgium", "BE"),
    ]);
    const response = await service.getPublished({
      marketCode: "FR",
      locale: "fr-FR",
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(
      response.sections.find((section) => section.type === "deals")?.deals,
    ).toBeUndefined();
  });

  it("returns configured universe categories in order and hides rails below their thresholds", async () => {
    const service = serviceWithListings([
      discountedListing("home", "FR", { categoryId: "home_garden" }),
      discountedListing("vehicle", "FR", { categoryId: "vehicles" }),
      discountedListing("fashion", "FR", { categoryId: "fashion" }),
    ]);
    const response = await service.getPublished({
      marketCode: "FR",
      locale: "fr-FR",
      now: new Date("2026-08-29T12:00:00.000Z"),
    });
    const universe = response.sections.find(
      (section) => section.type === "universe_explorer",
    );

    expect(universe?.universeGroups?.map((group) => group.categoryId)).toEqual([
      "home_garden",
      "vehicles",
      "fashion",
    ]);
    expect(
      universe?.universeGroups?.every(
        (group) => group.eligibleListingCount === 1 && !group.suppressed,
      ),
    ).toBe(true);

    const draft = createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
      state: "draft",
    });
    const thresholded = {
      ...draft,
      sections: draft.sections.map((section) =>
        section.type === "universe_explorer"
          ? {
              ...section,
              settings: {
                ...section.settings,
                universeSubsections: section.settings.universeSubsections?.map(
                  (subsection) => ({
                    ...subsection,
                    minimumListingCount:
                      subsection.categoryId === "fashion" ? 2 : 1,
                  }),
                ),
              },
            }
          : section,
      ),
    };
    const preview = await service.preview(thresholded, {
      marketCode: "FR",
      locale: "fr-FR",
    });
    const previewUniverse = preview.sections.find(
      (section) => section.type === "universe_explorer",
    );
    expect(
      previewUniverse?.universeGroups?.find(
        (group) => group.categoryId === "fashion",
      ),
    ).toMatchObject({
      suppressed: true,
      eligibleListingCount: 1,
      listings: [],
    });

    await service.saveDraft({
      configuration: thresholded,
      actorId: "admin",
      changeReason: "Seuil de la catégorie Mode relevé",
    });
    await service.publish({
      marketCode: "FR",
      locale: "fr-FR",
      actorId: "admin",
      changeReason: "Publication du nouveau seuil Mode",
    });
    const published = await service.getPublished({
      marketCode: "FR",
      locale: "fr-FR",
    });
    expect(
      published.sections
        .find((section) => section.type === "universe_explorer")
        ?.universeGroups?.map((group) => group.categoryId),
    ).toEqual(["home_garden", "vehicles"]);
  });

  it("omits a public discovery section that is below its configured threshold", async () => {
    const service = serviceWithListings([
      discountedListing("home", "FR", { categoryId: "home_garden" }),
      discountedListing("vehicle", "FR", { categoryId: "vehicles" }),
    ]);
    const draft = createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
      state: "draft",
    });
    const thresholded = {
      ...draft,
      sections: draft.sections.map((section) =>
        section.type === "recent_listings"
          ? { ...section, minimumListingCount: 3 }
          : section,
      ),
    };
    await service.saveDraft({
      configuration: thresholded,
      actorId: "admin",
      changeReason: "Seuil des annonces récentes relevé",
    });
    await service.publish({
      marketCode: "FR",
      locale: "fr-FR",
      actorId: "admin",
      changeReason: "Publication du seuil des annonces récentes",
    });

    const published = await service.getPublished({
      marketCode: "FR",
      locale: "fr-FR",
    });
    expect(
      published.sections.some((section) => section.type === "recent_listings"),
    ).toBe(false);
  });

  it("rejects a cross-market preview and versions draft publication", async () => {
    const repository = new DemoHomepageRepository();
    const listingRepo = new DemoListingRepository();
    const service = new HomepageService(
      repository,
      listingRepo,
      new TrendingService(new DemoTrendingRepository(), listingRepo),
    );
    const draft = createDefaultHomepageConfiguration({
      marketCode: "FR",
      locale: "fr-FR",
      state: "draft",
    });
    await expect(
      service.preview(draft, { marketCode: "BE", locale: "fr-BE" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const saved = await service.saveDraft({
      configuration: draft,
      actorId: "admin",
      changeReason: "Mise à jour éditoriale",
    });
    const published = await service.publish({
      marketCode: "FR",
      locale: "fr-FR",
      actorId: "admin",
      changeReason: "Publication validée",
    });
    expect(published.state).toBe("published");
    expect(published.revision).toBe(saved.revision);
    expect((await service.getDraft("FR", "fr-FR")).revision).toBe(
      published.revision + 1,
    );
  });
});
