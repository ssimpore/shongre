import { describe, expect, it } from "vitest";
import {
  GeoConfigurationError,
  assertSafeProviderUrl,
  createGeoConfig,
  publicMapConfig,
} from "../../src/modules/geo/geo.config.js";

const production = (env: NodeJS.ProcessEnv = {}) =>
  createGeoConfig({ env, appEnvironment: "prod" });
const local = (env: NodeJS.ProcessEnv = {}) =>
  createGeoConfig({ env, appEnvironment: "local" });

describe("provider URL safety", () => {
  it("accepts an absolute https origin", () => {
    expect(
      assertSafeProviderUrl("https://nominatim.example.test", "X", {
        allowLoopbackHttp: false,
      }).host,
    ).toBe("nominatim.example.test");
  });

  it("rejects a non-absolute or non-http scheme", () => {
    for (const value of [
      "/relative",
      "nominatim.example.test",
      "file:///etc",
    ]) {
      expect(() =>
        assertSafeProviderUrl(value, "X", { allowLoopbackHttp: false }),
      ).toThrow(GeoConfigurationError);
    }
  });

  it("rejects plain http unless it is a loopback mock in a relaxed profile", () => {
    expect(() =>
      assertSafeProviderUrl("http://169.254.169.254/latest/meta-data", "X", {
        allowLoopbackHttp: true,
      }),
    ).toThrow(GeoConfigurationError);
    expect(() =>
      assertSafeProviderUrl("http://127.0.0.1:8080", "X", {
        allowLoopbackHttp: false,
      }),
    ).toThrow(GeoConfigurationError);
    expect(
      assertSafeProviderUrl("http://127.0.0.1:8080", "X", {
        allowLoopbackHttp: true,
      }).port,
    ).toBe("8080");
  });

  it("rejects embedded credentials", () => {
    expect(() =>
      assertSafeProviderUrl("https://user:pass@geo.example.test", "X", {
        allowLoopbackHttp: false,
      }),
    ).toThrow(/must not embed credentials/);
  });
});

describe("defaults", () => {
  it("uses OpenFreeMap and keeps OpenStreetMap attribution", () => {
    const config = production();
    expect(config.map.provider).toBe("openfreemap");
    expect(config.map.styleUrl).toContain("openfreemap.org");
    expect(config.map.attribution).toContain("OpenStreetMap");
    expect(config.map.attribution).toContain("OpenFreeMap");
  });

  it("leaves geocoding off in a hosted profile until it is configured", () => {
    expect(production().geocoding.provider).toBe("disabled");
    // Local development gets the public endpoint, which is what it is for.
    expect(local().geocoding.provider).toBe("nominatim");
    expect(local().geocoding.baseUrl).toContain("openstreetmap.org");
  });

  it("never defaults a public location to the seller's exact point", () => {
    expect(production().privacy.defaultPublicPrecision).toBe("approximate");
    expect(() =>
      production({ LOCATION_DEFAULT_PUBLIC_PRECISION: "exact" }),
    ).toThrow(/never default to exact/);
  });
});

describe("validation", () => {
  it("requires an operator contact once geocoding is enabled in a hosted profile", () => {
    expect(() =>
      production({
        GEOCODING_PROVIDER: "nominatim",
        GEOCODING_BASE_URL: "https://nominatim.example.test",
      }),
    ).toThrow(/GEOCODING_CONTACT_EMAIL is required/);
    expect(
      production({
        GEOCODING_PROVIDER: "nominatim",
        GEOCODING_BASE_URL: "https://nominatim.example.test",
        GEOCODING_CONTACT_EMAIL: "ops@example.test",
      }).geocoding.contactEmail,
    ).toBe("ops@example.test");
  });

  it("rejects an unknown provider rather than falling back silently", () => {
    expect(() => production({ MAP_PROVIDER: "mapbox" })).toThrow(
      /must be one of/,
    );
    expect(() => production({ GEOCODING_PROVIDER: "google" })).toThrow(
      /must be one of/,
    );
  });

  it("rejects an incoherent zoom range", () => {
    expect(() => production({ MAP_MIN_ZOOM: "12", MAP_MAX_ZOOM: "8" })).toThrow(
      /must not exceed/,
    );
    expect(() =>
      production({
        MAP_MIN_ZOOM: "8",
        MAP_MAX_ZOOM: "12",
        MAP_DEFAULT_ZOOM: "3",
      }),
    ).toThrow(/must sit between/);
  });

  it("rejects an out-of-range default centre and non-numeric values", () => {
    expect(() => production({ MAP_DEFAULT_LATITUDE: "200" })).toThrow(
      /must be between/,
    );
    expect(() => production({ MAP_DEFAULT_ZOOM: "north" })).toThrow(
      /must be a number/,
    );
  });

  it("keeps the privacy radius and search radius inside documented bounds", () => {
    expect(() => production({ LOCATION_PRIVACY_RADIUS_METERS: "10" })).toThrow(
      /must be between/,
    );
    expect(() => production({ LOCATION_SEARCH_MAX_RADIUS_KM: "5000" })).toThrow(
      /must be between/,
    );
  });
});

describe("public projection", () => {
  it("carries only values a browser may hold", () => {
    const config = production({
      GEOCODING_PROVIDER: "nominatim",
      GEOCODING_BASE_URL: "https://nominatim.internal.example.test",
      GEOCODING_CONTACT_EMAIL: "ops@example.test",
    });
    const published = publicMapConfig(config);
    const serialized = JSON.stringify(published);
    expect(serialized).not.toContain("nominatim.internal.example.test");
    expect(serialized).not.toContain("ops@example.test");
    expect(Object.keys(published).sort()).toEqual([
      "attribution",
      "defaultCenter",
      "defaultZoom",
      "maxSearchRadiusKm",
      "maxZoom",
      "minZoom",
      "provider",
      "styleUrl",
    ]);
  });
});
