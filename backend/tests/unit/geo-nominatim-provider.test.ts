import { describe, expect, it, vi } from "vitest";
import type { GeoGeocodingConfig } from "../../src/modules/geo/geo.config.js";
import {
  NominatimGeocodingProvider,
  type FetchLike,
} from "../../src/modules/geo/providers/nominatim.geocoding-provider.js";

const CONFIG: GeoGeocodingConfig = {
  provider: "nominatim",
  baseUrl: "https://geo.example.test",
  userAgent: "Shongre/1.0",
  contactEmail: "ops@example.test",
  rateLimitPerMinute: 60,
  cacheTtlSeconds: 60,
  requestTimeoutMs: 1_000,
  maxRetries: 0,
  maxResults: 5,
};

const place = (overrides: Record<string, unknown> = {}) => ({
  lat: "48.8566",
  lon: "2.3522",
  display_name: "12,  Rue de la Paix ,  75002 Paris,  France",
  importance: 0.7,
  addresstype: "building",
  address: {
    country_code: "fr",
    state: "Île-de-France",
    county: "Paris",
    city: "Paris",
    postcode: "75002",
  },
  ...overrides,
});

function fetchReturning(payload: unknown, ok = true, status = 200) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl: FetchLike = vi.fn(async (url, init) => {
    calls.push({ url, headers: init?.headers ?? {} });
    return { ok, status, json: async () => payload };
  });
  return { impl, calls };
}

describe("Nominatim adapter", () => {
  it("sends the identity the provider's policy requires", async () => {
    const { impl, calls } = fetchReturning([place()]);
    await new NominatimGeocodingProvider(CONFIG, impl).forward({
      query: "12 rue de la Paix",
      countryCode: "FR",
    });
    expect(calls[0]?.headers["User-Agent"]).toContain("Shongre/1.0");
    expect(calls[0]?.headers["User-Agent"]).toContain("ops@example.test");
    expect(calls[0]?.headers.From).toBe("ops@example.test");
  });

  it("asks the configured endpoint, restricted to the requested country", async () => {
    const { impl, calls } = fetchReturning([place()]);
    await new NominatimGeocodingProvider(CONFIG, impl).forward({
      query: "Paris",
      countryCode: "FR",
      locale: "fr-FR",
      limit: 3,
    });
    const url = new URL(calls[0]!.url);
    expect(url.origin).toBe("https://geo.example.test");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("countrycodes")).toBe("fr");
    expect(url.searchParams.get("limit")).toBe("3");
    expect(url.searchParams.get("accept-language")).toBe("fr-FR");
  });

  it("maps a building to an exact, high-confidence result with attribution", async () => {
    const { impl } = fetchReturning([place()]);
    const [result] = await new NominatimGeocodingProvider(CONFIG, impl).forward(
      { query: "12 rue de la Paix", countryCode: "FR" },
    );
    expect(result).toMatchObject({
      coordinate: { latitude: 48.8566, longitude: 2.3522 },
      countryCode: "FR",
      city: "Paris",
      postalCode: "75002",
      administrativeArea: "Île-de-France",
      precision: "exact",
      confidence: "high",
      provider: "nominatim",
    });
    expect(result?.attribution).toContain("OpenStreetMap");
    // The display name is normalized rather than passed through raw.
    expect(result?.normalizedAddress).toBe(
      "12, Rue de la Paix, 75002 Paris, France",
    );
  });

  it("does not claim street or town precision is a doorstep", async () => {
    const cases: Array<[string, string]> = [
      ["road", "approximate"],
      ["city", "city"],
      ["village", "city"],
      ["postcode", "postal_code"],
    ];
    for (const [addresstype, expected] of cases) {
      const { impl } = fetchReturning([place({ addresstype })]);
      const [result] = await new NominatimGeocodingProvider(
        CONFIG,
        impl,
      ).forward({ query: "somewhere", countryCode: "FR" });
      expect(result?.precision).toBe(expected);
    }
  });

  it("drops a hit with no country, which could not be market-restricted", async () => {
    const { impl } = fetchReturning([
      place({ address: { city: "Nowhere" } }),
      place(),
    ]);
    const results = await new NominatimGeocodingProvider(CONFIG, impl).forward({
      query: "somewhere",
      countryCode: "FR",
    });
    expect(results).toHaveLength(1);
  });

  it("drops a hit with an unparseable coordinate", async () => {
    const { impl } = fetchReturning([place({ lat: "not-a-number" })]);
    await expect(
      new NominatimGeocodingProvider(CONFIG, impl).forward({
        query: "somewhere",
        countryCode: "FR",
      }),
    ).resolves.toEqual([]);
  });

  it("raises the status and never the upstream body, which quotes the address", async () => {
    const { impl } = fetchReturning(
      { error: "no results for 12 rue de la Paix, Paris" },
      false,
      429,
    );
    await expect(
      new NominatimGeocodingProvider(CONFIG, impl).forward({
        query: "12 rue de la Paix",
        countryCode: "FR",
      }),
    ).rejects.toThrow(/responded 429/);
    await expect(
      new NominatimGeocodingProvider(CONFIG, impl).forward({
        query: "12 rue de la Paix",
        countryCode: "FR",
      }),
    ).rejects.not.toThrow(/rue de la Paix/);
  });

  it("reverses a coordinate and refuses one outside the requested country", async () => {
    const { impl } = fetchReturning(place());
    const provider = new NominatimGeocodingProvider(CONFIG, impl);
    await expect(
      provider.reverse({
        coordinate: { latitude: 48.8566, longitude: 2.3522 },
        countryCode: "FR",
      }),
    ).resolves.toMatchObject({ city: "Paris" });
    await expect(
      provider.reverse({
        coordinate: { latitude: 48.8566, longitude: 2.3522 },
        countryCode: "BE",
      }),
    ).resolves.toBeNull();
  });

  it("aborts when the caller does, without waiting for the timeout", async () => {
    const controller = new AbortController();
    const impl: FetchLike = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          );
        }),
    );
    const pending = new NominatimGeocodingProvider(CONFIG, impl).forward({
      query: "abandon me",
      countryCode: "FR",
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
