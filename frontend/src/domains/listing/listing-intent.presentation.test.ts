import { describe, expect, it } from "vitest";
import {
  primaryCtaForListingIntent,
  resolveListingIntentPresentation,
} from "./listing-intent.presentation";

describe("listing intent presentation", () => {
  it("labels lessons as a service and never advertises payment assurances", () => {
    expect(resolveListingIntentPresentation("request_lesson", false)).toEqual({
      actionLabelKey: "listings.listingDetailPage.demanderUnCours",
      priceLabelKey: "listings.listingDetailPage.tarifDuCours",
      safetyVariant: "service",
    });
  });

  it("uses compensation language for employment", () => {
    expect(resolveListingIntentPresentation("apply", false)).toEqual({
      actionLabelKey: "listings.listingDetailPage.postuler",
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

  it("derives the generic action from the stored taxonomy intent", () => {
    expect(primaryCtaForListingIntent("COURSE_OFFER")).toBe("request_lesson");
    expect(primaryCtaForListingIntent("JOB_OFFER")).toBe("apply");
    expect(primaryCtaForListingIntent("SERVICE_OFFER")).toBe("request_quote");
    expect(primaryCtaForListingIntent("RENT_OUT")).toBe("check_availability");
    expect(primaryCtaForListingIntent("EXCHANGE")).toBe("propose_exchange");
    expect(primaryCtaForListingIntent("SELL")).toBe("contact_seller");
  });
});
