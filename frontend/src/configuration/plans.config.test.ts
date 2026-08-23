import { describe, expect, it } from "vitest";
import { LISTING_BOOSTS, PRO_PLANS } from "./plans.config";

describe("legacy plan presentation adapter", () => {
  it("projects only the active canonical generic plans", () => {
    expect(PRO_PLANS.map((plan) => plan.id)).toEqual(["free", "pro_business"]);
    expect(PRO_PLANS.map((plan) => plan.productId)).toEqual([
      "plan.pro.free",
      "plan.pro.business",
    ]);
    expect(PRO_PLANS.find((plan) => plan.id === "pro_business")).toMatchObject({
      monthlyPrice: 19.9,
      maxActiveListings: 50,
      photosPerListing: 15,
    });
  });

  it("projects required visibility prices from the same published catalog", () => {
    expect(
      Object.fromEntries(
        LISTING_BOOSTS.map((boost) => [boost.id, boost.priceEur]),
      ),
    ).toEqual({
      urgent: 3.9,
      top_of_list: 1.9,
      highlight: 19.9,
      gallery_boost: 14.9,
    });
  });
});
