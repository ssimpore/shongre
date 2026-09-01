import { describe, expect, it } from "vitest";
import { resolveListingIntentPresentation } from "./listing-intent.presentation";

describe("listing intent presentation", () => {
  it("labels lessons as a service and never advertises payment assurances", () => {
    expect(resolveListingIntentPresentation("request_lesson", false)).toEqual({
      priceLabelKey: "listings.listingDetailPage.tarifDuCours",
      safetyVariant: "service",
    });
  });

  it("uses compensation language for employment", () => {
    expect(resolveListingIntentPresentation("apply", false)).toEqual({
      priceLabelKey: "listings.listingDetailPage.remuneration",
      safetyVariant: "application",
    });
  });

  it("shows payment assurances only when online payment is available", () => {
    expect(
      resolveListingIntentPresentation("contact_seller", true).safetyVariant,
    ).toBe("payment");
    expect(
      resolveListingIntentPresentation("contact_seller", false).safetyVariant,
    ).toBe("in_person");
  });
});
