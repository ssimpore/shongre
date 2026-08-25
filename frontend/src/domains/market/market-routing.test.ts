import { describe, expect, it } from "vitest";
import { publicListingUrl, publicRouteUrl } from "./market-routing";

describe("public country URL builders", () => {
  it("builds shareable listing URLs without string concatenation", () => {
    expect(
      publicListingUrl({ listingId: "vélo / 42", countryCode: "FR" }),
    ).toBe("https://shongre.fr/annonce/v%C3%A9lo%20%2F%2042");
    expect(
      publicListingUrl({ listingId: "listing-42", countryCode: "BE" }),
    ).toBe("https://shongre.com/be/annonce/listing-42");
  });

  it("retains the country base path for non-listing routes", () => {
    expect(publicRouteUrl({ route: "/messages", countryCode: "CH" })).toBe(
      "https://shongre.com/ch/messages",
    );
  });
});
