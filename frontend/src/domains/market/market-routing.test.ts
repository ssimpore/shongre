import { describe, expect, it } from "vitest";
import { createApplicationRegistry } from "../../platform/applications/application-registry";
import {
  browserMarketCodeFor,
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

describe("browser market declaration", () => {
  const applications = createApplicationRegistry({
    environment: "production",
    marketplaceOrigin: "https://shongre.fr",
    origins: {
      solutions: "https://solutions.shongre.com",
      prospects: "https://prospects.shongre.com",
      facturation: "https://facturation.shongre.com",
    },
  });

  it("declares each market host's own country", () => {
    expect(
      browserMarketCodeFor({
        hostname: "shongre.fr",
        pathname: "/recherche",
        infrastructure,
        applications,
      }),
    ).toBe("FR");
    expect(
      browserMarketCodeFor({
        hostname: "shongre.com",
        pathname: "/be/recherche",
        infrastructure,
        applications,
      }),
    ).toBe("BE");
  });

  it("operates product origins on the default market, as the server does", () => {
    // Facturation and Prospects are not market hosts; their workspace calls
    // still need a market, and the server resolves those applications on the
    // France market.
    expect(
      browserMarketCodeFor({
        hostname: "facturation.shongre.com",
        pathname: "/app",
        infrastructure,
        applications,
      }),
    ).toBe("FR");
    expect(
      browserMarketCodeFor({
        hostname: "prospects.shongre.com",
        pathname: "/app/discover",
        infrastructure,
        applications,
      }),
    ).toBe("FR");
  });

  it("declares nothing for an unknown host", () => {
    expect(
      browserMarketCodeFor({
        hostname: "evil.example",
        pathname: "/",
        infrastructure,
        applications,
      }),
    ).toBeNull();
  });
});

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
