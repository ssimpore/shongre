import { describe, expect, it } from "vitest";
import { sanitizeStoredListingDraft } from "../../src/modules/listings/listings.service.js";

describe("listing draft persistence boundary", () => {
  it("keeps non-sensitive onboarding data and strips credentials", () => {
    const safe = sanitizeStoredListingDraft(
      {
        marketCode: "BE",
        title: "Guide numérique",
        attributes: {
          format: "pdf",
          access_token: "never-store",
          iban: "never-store",
        },
        fulfillmentTypes: ["FILE_DOWNLOAD"],
        digitalFulfillment: {
          secureAccessCode: "secret",
        },
      },
      "FR",
    );
    expect(safe.marketCode).toBe("FR");
    expect(safe.attributes).toEqual({ format: "pdf" });
    expect(safe.fulfillmentTypes).toEqual(["FILE_DOWNLOAD"]);
    expect(safe.digitalFulfillment).toBeUndefined();
  });
});
