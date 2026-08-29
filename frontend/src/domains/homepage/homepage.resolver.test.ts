import { describe, expect, it } from "vitest";
import type { HomepageSectionSettings } from "@shongre/contracts/homepage";
import type { Listing } from "../../types";
import { selectHomepageDeals } from "./homepage.resolver";

function listing(
  id: string,
  input: Partial<Listing> = {},
): Listing {
  return {
    id,
    title: id,
    description: id,
    price: 80,
    originalPrice: 100,
    currency: "EUR",
    categorySlug: "vehicules",
    subCategorySlug: "vehicules.velos",
    sellerType: "individual",
    status: "active",
    marketCode: "FR",
    marketCodes: ["FR"],
    marketPublications: [
      { marketCode: "FR", status: "active", currency: "EUR" },
    ],
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...input,
  } as Listing;
}

const settings: HomepageSectionSettings = {
  selectionMode: "hybrid",
  eligibleOfferTypes: [
    "verified_price_reduction",
    "time_limited_promotion",
    "professional_discount",
  ],
  allowedMarkets: ["FR"],
  taxonomyBranches: [],
  minimumDiscountBps: 500,
  includeProfessionalSellers: true,
  offerOverrides: [],
};

describe("homepage deal resolution", () => {
  it("returns exactly the requested number with normalized minor-unit money", () => {
    const deals = selectHomepageDeals(
      Array.from({ length: 8 }, (_, index) =>
        listing(`deal-${index}`, {
          price: 60 + index,
          originalPrice: 100,
        }),
      ),
      "FR",
      settings,
      6,
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(deals).toHaveLength(6);
    expect(deals[0].offer.currentPrice).toEqual({
      amountMinor: 6_000,
      currency: "EUR",
    });
    expect(deals[0].offer.originalPrice.amountMinor).toBe(10_000);
    expect(deals[0].offer.discountBps).toBe(4_000);
  });

  it("fails closed for the wrong market and expired promotion lifecycle", () => {
    const now = new Date("2026-08-29T00:00:00.000Z");
    const deals = selectHomepageDeals(
      [
        listing("wrong-market", {
          marketCode: "BE",
          marketCodes: ["BE"],
          marketPublications: [
            { marketCode: "BE", status: "active", currency: "EUR" },
          ],
        }),
        listing("expired", {
          promotionState: "expired",
          promotionEndAt: "2026-08-28T00:00:00.000Z",
        }),
      ],
      "FR",
      settings,
      6,
      now,
    );

    expect(deals).toEqual([]);
  });

  it("supports manual, automatic and hybrid editorial selection without drift", () => {
    const hidden = {
      ...settings,
      offerOverrides: [
        { listingId: "one", isPinned: true, isHidden: true, sortOrder: 0 },
      ],
    } satisfies HomepageSectionSettings;
    const items = [listing("one"), listing("two")];

    expect(
      selectHomepageDeals(
        items,
        "FR",
        { ...hidden, selectionMode: "manual" },
        6,
      ),
    ).toEqual([]);
    expect(
      selectHomepageDeals(
        items,
        "FR",
        { ...hidden, selectionMode: "hybrid" },
        6,
      ).map((item) => item.listing.id),
    ).toEqual(["two"]);
    expect(
      selectHomepageDeals(
        items,
        "FR",
        { ...hidden, selectionMode: "automatic" },
        6,
      ).map((item) => item.listing.id),
    ).toEqual(["one", "two"]);
  });
});
