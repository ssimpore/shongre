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
    const trends = response.sections.find((section) => section.type === "trending");
    const deals = response.sections.find((section) => section.type === "deals");

    expect(trends?.trending?.topics).toHaveLength(4);
    expect(deals?.deals).toHaveLength(6);
    expect(deals?.deals?.every((item) => item.listing.marketCode === "FR")).toBe(
      true,
    );
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
    ).toEqual([]);
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
