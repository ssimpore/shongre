import { describe, expect, it } from "vitest";
import { publicListingUrl, publicRouteUrl } from "./market-routing";

const infrastructure = {
  globalDomain: "shongre.com",
  franceDomain: "shongre.fr",
  canonicalProtocol: "https" as const,
};

describe("public country URL builders", () => {
  it("builds shareable listing URLs without string concatenation", () => {
    expect(
      publicListingUrl({
        listingId: "vélo / 42",
        countryCode: "FR",
        infrastructure,
      }),
    ).toBe("https://shongre.fr/annonce/v%C3%A9lo%20%2F%2042");
    expect(
      publicListingUrl({
        listingId: "listing-42",
        countryCode: "BE",
        infrastructure,
      }),
    ).toBe("https://shongre.com/be/annonce/listing-42");
  });

  it("retains the country base path for non-listing routes", () => {
    expect(
      publicRouteUrl({
        route: "/messages",
        countryCode: "CH",
        infrastructure,
      }),
    ).toBe("https://shongre.com/ch/messages");
  });
});
