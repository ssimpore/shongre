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
      monthlyPrice: { amountMinor: 1_990, currency: "EUR" },
      maxActiveListings: 50,
      photosPerListing: 15,
    });
  });

  it("projects only visibility products with a complete activation path", () => {
    expect(
      Object.fromEntries(
        LISTING_BOOSTS.map((boost) => [boost.id, boost.price]),
      ),
    ).toEqual({
      urgent: { amountMinor: 390, currency: "EUR" },
      top_of_list: { amountMinor: 190, currency: "EUR" },
      highlight: { amountMinor: 790, currency: "EUR" },
      spotlight: { amountMinor: 1_990, currency: "EUR" },
    });
  });
});
