import { describe, expect, it } from "vitest";
import {
  crossesProductionMarketOrigin,
  publicListingUrl,
  publicRouteUrl,
  sanitizeMarketSwitchQuery,
  shouldUseAuthenticatedMarketHandoff,
} from "./market-routing";

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

  it("preserves public route filters while dropping credentials and tracking data", () => {
    const safe = sanitizeMarketSwitchQuery(
      new URLSearchParams(
        "q=velo&sort=recent&attr.color=blue&token=secret&state=oauth&utm_source=test&gclid=tracking",
      ),
    );
    expect(safe.toString()).toBe("q=velo&sort=recent&attr.color=blue");
  });

  it("requires explicit cross-domain confirmation outside local development", () => {
    expect(
      crossesProductionMarketOrigin({
        currentOrigin: "https://shongre.fr",
        currentHostname: "shongre.fr",
        destination: "https://shongre.com/be/recherche?q=velo",
      }),
    ).toBe(true);
    expect(
      crossesProductionMarketOrigin({
        currentOrigin: "http://127.0.0.1:3000",
        currentHostname: "127.0.0.1",
        destination: "http://127.0.0.1:3000/be/recherche?q=velo",
      }),
    ).toBe(false);
  });

  it("uses the one-use authentication handoff only for authenticated cross-domain moves", () => {
    const crossDomain = {
      currentOrigin: "https://shongre.fr",
      currentHostname: "shongre.fr",
      destination: "https://shongre.com/ch/annonce/123",
    };
    expect(
      shouldUseAuthenticatedMarketHandoff({
        ...crossDomain,
        isAuthenticated: true,
      }),
    ).toBe(true);
    expect(
      shouldUseAuthenticatedMarketHandoff({
        ...crossDomain,
        isAuthenticated: false,
      }),
    ).toBe(false);
    expect(crossDomain.destination).not.toMatch(
      /token|access_token|refresh_token/,
    );
  });
});
