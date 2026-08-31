import { describe, expect, it } from "vitest";
import { COUNTRY_REGISTRY } from "@shongre/contracts";
import { MarketDetectionService } from "../../src/modules/markets/market-detection.service.js";

const service = new MarketDetectionService();

describe("MarketDetectionService", () => {
  it.each(COUNTRY_REGISTRY)(
    "resolves trusted ISO signal $code through the canonical registry",
    (country) => {
      const recommendation = service.detectFromCountrySignal({
        countryCode: country.code,
      });
      expect(recommendation.country?.code).toBe(country.code);
      expect(recommendation.source).toBe("ip");
      expect(JSON.stringify(recommendation)).not.toMatch(
        /ipAddress|latitude|longitude/,
      );
    },
  );

  it("reads only the configured trusted edge country header", () => {
    const country = COUNTRY_REGISTRY[0];
    const edgeService = new MarketDetectionService("x-edge-country");
    expect(
      edgeService.detectFromHeaders({
        "x-edge-country": country.code,
        "x-forwarded-for": "203.0.113.42",
      }),
    ).toMatchObject({
      country: { code: country.code },
      source: "ip",
    });
    expect(
      new MarketDetectionService(null).detectFromHeaders({
        "x-edge-country": country.code,
      }),
    ).toMatchObject({ country: null, experience: "global_gateway" });
  });

  it("fails to the global gateway for an unknown country", () => {
    expect(
      service.detectFromCountrySignal({ countryCode: "ZZ" }),
    ).toMatchObject({
      status: "unknown",
      country: null,
      experience: "global_gateway",
    });
  });

  it("marks malformed provider and VPN/proxy signals uncertain", () => {
    expect(
      service.detectFromCountrySignal({ countryCode: "T1" }),
    ).toMatchObject({
      status: "uncertain",
      confidence: "low",
      proxyOrVpnLikely: true,
    });
    expect(
      service.detectFromCountrySignal({
        countryCode: COUNTRY_REGISTRY[0].code,
        proxyOrVpnLikely: true,
      }),
    ).toMatchObject({ status: "uncertain" });
  });

  it.each(COUNTRY_REGISTRY.filter((country) => country.detection.enabled))(
    "resolves consented coordinates for $code without returning them",
    (country) => {
      const bounds = country.detection.coordinateBounds[0];
      const recommendation = service.detectFromCoordinates({
        latitude: (bounds.north + bounds.south) / 2,
        longitude: (bounds.east + bounds.west) / 2,
        accuracy: 50,
      });
      expect(recommendation.country?.code).toBe(country.code);
      expect(recommendation.source).toBe("coordinates");
      expect(JSON.stringify(recommendation)).not.toMatch(/latitude|longitude/);
    },
  );
});
