import { describe, expect, it } from "vitest";
import { getListingPromotionBadges, resolveNotificationTone } from "../src";

describe("shared feature presentation", () => {
  it("does not infer paid placement from legacy booleans", () => {
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: true,
      }),
    ).toEqual([]);
  });
  it("distinguishes featured, boosted, and sponsored placements", () => {
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: false,
        promotion: {
          state: "active",
          type: "featured",
          marketCode: "FR",
          source: "purchase",
          sourceId: "featured-proof",
          label: "À la une",
          startsAt: "2020-01-01T00:00:00.000Z",
          endsAt: "2099-01-01T00:00:00.000Z",
        },
      }),
    ).toEqual([
      {
        kind: "featured",
        label: "À la une",
        variant: "featured",
        icon: "flame",
      },
    ]);
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        isUrgent: false,
        isFeatured: false,
        promotion: {
          state: "active",
          type: "search_bump",
          marketCode: "FR",
          source: "subscription_credit",
          sourceId: "search-bump-proof",
          label: "Remonté",
          startsAt: "2020-01-01T00:00:00.000Z",
          endsAt: "2099-01-01T00:00:00.000Z",
        },
      }),
    ).toEqual([
      { kind: "boosted", label: "Boosté", variant: "boosted", icon: "rocket" },
    ]);
    expect(
      getListingPromotionBadges({
        marketCode: "FR",
        promotion: {
          state: "active",
          type: "sponsored_search",
          marketCode: "FR",
          source: "purchase",
          sourceId: "sponsored-search-proof",
          startsAt: "2020-01-01T00:00:00.000Z",
          endsAt: "2099-01-01T00:00:00.000Z",
        },
      }),
    ).toEqual([
      {
        kind: "sponsored",
        label: "Sponsorisé",
        variant: "boosted",
        icon: "rocket",
      },
    ]);
  });
  it("uses one notification tone mapping", () => {
    expect(resolveNotificationTone("listing_rejected")).toBe("error");
  });
});
