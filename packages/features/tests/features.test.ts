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
  it("uses one concise label for every active promotion source", () => {
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
    ).toEqual([{ label: "Boosté" }]);
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
    ).toEqual([{ label: "Boosté" }]);
  });
  it("uses one notification tone mapping", () => {
    expect(resolveNotificationTone("listing_rejected")).toBe("error");
  });
});
