import { describe, expect, it } from "vitest";
import { safePath, sanitizeAnalyticsProperties } from "./privacy";

describe("analytics privacy boundary", () => {
  it("drops direct identifiers and sensitive property names", () => {
    expect(
      sanitizeAnalyticsProperties({
        listingId: "listing-1",
        email: "buyer@example.com",
        contactValue: "+33 6 12 34 56 78",
        authorizationToken: "secret",
        amountMinor: 299,
      }),
    ).toEqual({ listingId: "listing-1", amountMinor: 299 });
  });

  it("removes query strings and fragments from page-like properties", () => {
    expect(safePath("https://shongre.com/annonces?q=private#result")).toBe(
      "/annonces",
    );
    expect(
      sanitizeAnalyticsProperties({
        path: "/annonces?query=secret#result",
        route: "/listing/123?access_token=secret",
      }),
    ).toEqual({ path: "/annonces", route: "/listing/123" });
  });
});
