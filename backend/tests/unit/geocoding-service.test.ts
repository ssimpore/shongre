import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeocodingResult } from "@shongre/contracts/geospatial";
import type { GeoGeocodingConfig } from "../../src/modules/geo/geo.config.js";
import type {
  GeocodingProvider,
  ReverseGeocodingProvider,
} from "../../src/modules/geo/geo.contracts.js";
import {
  GeocodingService,
  GeocodingUnavailableError,
  InMemoryGeocodingCache,
  InProcessGeocodingRateLimiter,
} from "../../src/modules/geo/geocoding.service.js";

const CONFIG: GeoGeocodingConfig = {
  provider: "nominatim",
  baseUrl: "https://geo.example.test",
  userAgent: "Shongre/test",
  contactEmail: "ops@example.test",
  rateLimitPerMinute: 60,
  cacheTtlSeconds: 3_600,
  requestTimeoutMs: 1_000,
  maxRetries: 2,
  maxResults: 5,
};

const result = (overrides: Partial<GeocodingResult> = {}): GeocodingResult => ({
  coordinate: { latitude: 48.8566, longitude: 2.3522 },
  countryCode: "FR",
  city: "Paris",
  postalCode: "75001",
  precision: "exact",
  confidence: "high",
  attribution: "© OpenStreetMap contributors",
  provider: "nominatim",
  ...overrides,
});

function build(
  overrides: {
    forward?: GeocodingProvider | null;
    reverse?: ReverseGeocodingProvider | null;
    config?: Partial<GeoGeocodingConfig>;
    limiter?: { acquire: () => Promise<void> };
  } = {},
) {
  const cache = new InMemoryGeocodingCache();
  const telemetry = { record: vi.fn() };
  const service = new GeocodingService({
    config: { ...CONFIG, ...overrides.config },
    forwardProvider:
      overrides.forward === undefined
        ? { id: "nominatim", forward: vi.fn(async () => [result()]) }
        : overrides.forward,
    reverseProvider:
      overrides.reverse === undefined
        ? { id: "nominatim", reverse: vi.fn(async () => result()) }
        : overrides.reverse,
    cache,
    rateLimiter: overrides.limiter ?? { acquire: async () => undefined },
    telemetry,
    sleep: async () => undefined,
  });
  return { service, cache, telemetry };
}

describe("forward geocoding", () => {
  it("answers nothing at all when no provider is configured", async () => {
    const { service, telemetry } = build({ forward: null });
    expect(service.enabled).toBe(false);
    await expect(
      service.forward({ query: "12 rue de la Paix", countryCode: "FR" }),
    ).resolves.toEqual([]);
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "disabled" }),
    );
  });

  it("does not send a query too short to mean anything", async () => {
    const forward = vi.fn(async () => [result()]);
    const { service } = build({ forward: { id: "nominatim", forward } });
    await service.forward({ query: "pa", countryCode: "FR" });
    expect(forward).not.toHaveBeenCalled();
  });

  it("serves a repeated query from cache instead of the provider", async () => {
    const forward = vi.fn(async () => [result()]);
    const { service, telemetry } = build({
      forward: { id: "nominatim", forward },
    });
    const query = {
      query: "12 rue de la Paix",
      city: "Paris",
      countryCode: "FR",
    };
    await service.forward(query);
    await service.forward(query);
    expect(forward).toHaveBeenCalledTimes(1);
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "hit" }),
    );
  });

  it("folds case and accents into the same cache entry", async () => {
    const forward = vi.fn(async () => [result()]);
    const { service } = build({ forward: { id: "nominatim", forward } });
    await service.forward({ query: "Rue de l'Église", countryCode: "FR" });
    await service.forward({ query: "rue de l'eglise", countryCode: "FR" });
    expect(forward).toHaveBeenCalledTimes(1);
  });

  it("collapses concurrent identical queries into one upstream request", async () => {
    // The upstream call is held open until every caller has had a chance to
    // join it; releasing it early would let the first finish and the rest hit
    // the cache instead, which is a different mechanism.
    let releaseUpstream: (value: GeocodingResult[]) => void = () => {};
    let upstreamEntered: () => void = () => {};
    const entered = new Promise<void>((resolve) => {
      upstreamEntered = resolve;
    });
    const forward = vi.fn(
      () =>
        new Promise<GeocodingResult[]>((resolve) => {
          releaseUpstream = resolve;
          upstreamEntered();
        }),
    );
    const { service } = build({ forward: { id: "nominatim", forward } });
    const query = { query: "Paris centre", countryCode: "FR" };
    const all = Promise.all([
      service.forward(query),
      service.forward(query),
      service.forward(query),
    ]);
    await entered;
    releaseUpstream([result()]);
    const [first, second, third] = await all;
    expect(forward).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("discards a result from another country rather than ranking it down", async () => {
    const forward = vi.fn(async () => [
      result({ countryCode: "BE", city: "Bruxelles" }),
      result(),
    ]);
    const { service } = build({ forward: { id: "nominatim", forward } });
    const results = await service.forward({
      query: "1000",
      countryCode: "FR",
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.countryCode).toBe("FR");
  });

  it("discards a result whose coordinate is not a real place", async () => {
    const forward = vi.fn(async () => [
      result({ coordinate: { latitude: 0, longitude: 0 } }),
    ]);
    const { service } = build({ forward: { id: "nominatim", forward } });
    await expect(
      service.forward({ query: "nowhere at all", countryCode: "FR" }),
    ).resolves.toEqual([]);
  });

  it("retries a transient failure and gives up within the bound", async () => {
    const forward = vi
      .fn<GeocodingProvider["forward"]>()
      .mockRejectedValueOnce(new Error("502"))
      .mockResolvedValueOnce([result()]);
    const { service } = build({ forward: { id: "nominatim", forward } });
    await expect(
      service.forward({ query: "retry me please", countryCode: "FR" }),
    ).resolves.toHaveLength(1);
    expect(forward).toHaveBeenCalledTimes(2);

    const always = vi
      .fn<GeocodingProvider["forward"]>()
      .mockRejectedValue(new Error("502"));
    const { service: failing } = build({
      forward: { id: "nominatim", forward: always },
    });
    await expect(
      failing.forward({ query: "always failing", countryCode: "FR" }),
    ).rejects.toBeInstanceOf(GeocodingUnavailableError);
    // Initial attempt plus maxRetries, and not one more.
    expect(always).toHaveBeenCalledTimes(CONFIG.maxRetries + 1);
  });

  it("does not retry an abort, which is the caller changing their mind", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const forward = vi
      .fn<GeocodingProvider["forward"]>()
      .mockRejectedValue(abort);
    const { service } = build({ forward: { id: "nominatim", forward } });
    await expect(
      service.forward({ query: "abandon this", countryCode: "FR" }),
    ).rejects.toBeInstanceOf(GeocodingUnavailableError);
    expect(forward).toHaveBeenCalledTimes(1);
  });

  it("refuses rather than queues when the shared budget is exhausted", async () => {
    const { service } = build({
      limiter: {
        acquire: async () => {
          throw new GeocodingUnavailableError("rate_limited");
        },
      },
    });
    await expect(
      service.forward({ query: "over the limit", countryCode: "FR" }),
    ).rejects.toMatchObject({ reason: "rate_limited" });
  });
});

describe("reverse geocoding", () => {
  it("rejects a coordinate that is not a real place before any request", async () => {
    const reverse = vi.fn(async () => result());
    const { service } = build({ reverse: { id: "nominatim", reverse } });
    await expect(
      service.reverse({ coordinate: { latitude: 0, longitude: 0 } }),
    ).resolves.toBeNull();
    expect(reverse).not.toHaveBeenCalled();
  });

  it("treats two pins a metre apart as one lookup", async () => {
    const reverse = vi.fn(async () => result());
    const { service } = build({ reverse: { id: "nominatim", reverse } });
    await service.reverse({
      coordinate: { latitude: 48.85661, longitude: 2.35221 },
    });
    await service.reverse({
      coordinate: { latitude: 48.856612, longitude: 2.352214 },
    });
    expect(reverse).toHaveBeenCalledTimes(1);
  });
});

describe("rate limiter", () => {
  let now = 0;
  beforeEach(() => {
    now = 1_000_000;
  });

  it("allows the configured number of requests each minute and no more", async () => {
    const limiter = new InProcessGeocodingRateLimiter(3, () => now);
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    await expect(limiter.acquire()).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
    now += 60_001;
    await expect(limiter.acquire()).resolves.toBeUndefined();
  });
});

describe("in-memory cache", () => {
  it("expires an entry and bounds its own size", async () => {
    let now = 0;
    const cache = new InMemoryGeocodingCache(2, () => now);
    await cache.set("a", "1", 10);
    expect(await cache.get("a")).toBe("1");
    now += 11_000;
    expect(await cache.get("a")).toBeNull();

    now = 0;
    await cache.set("x", "1", 100);
    await cache.set("y", "2", 100);
    await cache.set("z", "3", 100);
    expect(await cache.get("x")).toBeNull();
    expect(await cache.get("z")).toBe("3");
  });
});
