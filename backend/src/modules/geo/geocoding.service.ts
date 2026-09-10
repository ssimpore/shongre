import {
  isValidCoordinate,
  type GeoCoordinate,
  type GeocodingResult,
} from "@shongre/contracts/geospatial";
import type { GeoGeocodingConfig } from "./geo.config.js";
import type {
  GeocodingProvider,
  GeocodingQuery,
  ReverseGeocodingProvider,
  ReverseGeocodingQuery,
} from "./geo.contracts.js";
import {
  addressCacheKey,
  buildProviderQuery,
  isSearchableAddressQuery,
  type AddressQueryInput,
} from "./geo.address.js";

/**
 * The only path to a geocoding provider.
 *
 * A free geocoder is a shared, rate-limited, revocable resource. Reaching one
 * from a browser — one request per keystroke, per visitor, with no cache —
 * is how a platform gets blocked, and it is also how the operator's contact
 * identity ends up in every visitor's network tab. So the provider is reached
 * from here and nowhere else, and this owns the four things a caller would
 * otherwise each get wrong:
 *
 *   1. A cache, because the same town is typed thousands of times.
 *   2. In-flight deduplication, because a hundred concurrent publishers
 *      resolving "Paris" is one upstream request, not a hundred.
 *   3. A rate limit measured against the provider's policy, not the caller's
 *      patience.
 *   4. A bounded retry, so a transient 502 does not surface as a failed
 *      publication while a persistent one does not become a retry storm.
 */

export interface GeocodingCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export interface GeocodingRateLimiter {
  /** Resolves when a slot is available; rejects when the budget is exhausted. */
  acquire(): Promise<void>;
}

export interface GeocodingTelemetry {
  record(event: {
    operation: "forward" | "reverse";
    outcome: "hit" | "miss" | "error" | "rate_limited" | "disabled";
    durationMs: number;
    provider: string;
    /** Never the query itself: an address is personal data. */
    resultCount?: number;
  }): void;
}

export class GeocodingUnavailableError extends Error {
  constructor(readonly reason: "disabled" | "rate_limited" | "provider_error") {
    super(`Geocoding unavailable: ${reason}`);
    this.name = "GeocodingUnavailableError";
  }
}

export interface GeocodingServiceDependencies {
  config: GeoGeocodingConfig;
  forwardProvider: GeocodingProvider | null;
  reverseProvider: ReverseGeocodingProvider | null;
  cache: GeocodingCache;
  rateLimiter: GeocodingRateLimiter;
  telemetry?: GeocodingTelemetry;
  /** Injected so retry backoff is instant under test rather than real seconds. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class GeocodingService {
  /** Keyed by cache key: one upstream request per distinct query in flight. */
  private readonly inFlight = new Map<string, Promise<GeocodingResult[]>>();

  constructor(private readonly deps: GeocodingServiceDependencies) {}

  get enabled(): boolean {
    return (
      this.deps.config.provider !== "disabled" &&
      this.deps.forwardProvider !== null
    );
  }

  /**
   * Written place to coordinates, restricted to one country.
   *
   * The country is not a ranking hint. A postcode is only unique inside a
   * country — 1000 is Brussels and also a Swiss range — so a result outside
   * the requested market is discarded rather than demoted.
   */
  async forward(
    input: AddressQueryInput & { locale?: string; signal?: AbortSignal },
  ): Promise<GeocodingResult[]> {
    const startedAt = this.deps.now?.() ?? Date.now();
    const provider = this.deps.forwardProvider;
    if (!this.enabled || !provider) {
      this.telemetry("forward", "disabled", startedAt, "none");
      return [];
    }

    const written = buildProviderQuery(input);
    if (!isSearchableAddressQuery(written)) return [];

    const key = `geo:fwd:${addressCacheKey(input)}:${input.locale ?? ""}`;
    const cached = await this.readCache(key);
    if (cached) {
      this.telemetry("forward", "hit", startedAt, provider.id, cached.length);
      return cached;
    }

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const request = this.resolveForward({
      provider,
      key,
      query: {
        query: written,
        countryCode: input.countryCode.toUpperCase(),
        locale: input.locale,
        limit: this.deps.config.maxResults,
        signal: input.signal,
      },
      startedAt,
    }).finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, request);
    return request;
  }

  async reverse(input: ReverseGeocodingQuery): Promise<GeocodingResult | null> {
    const startedAt = this.deps.now?.() ?? Date.now();
    const provider = this.deps.reverseProvider;
    if (
      this.deps.config.provider === "disabled" ||
      !provider ||
      !isValidCoordinate(input.coordinate)
    ) {
      this.telemetry("reverse", "disabled", startedAt, "none");
      return null;
    }

    // Five decimal places is about a metre; rounding the cache key stops two
    // pins a hand's width apart from being two upstream requests.
    const key = `geo:rev:${round(input.coordinate.latitude)}:${round(
      input.coordinate.longitude,
    )}:${input.countryCode ?? ""}:${input.locale ?? ""}`;
    const cached = await this.readCache(key);
    if (cached) {
      this.telemetry("reverse", "hit", startedAt, provider.id, cached.length);
      return cached[0] ?? null;
    }

    try {
      await this.deps.rateLimiter.acquire();
    } catch {
      this.telemetry("reverse", "rate_limited", startedAt, provider.id);
      throw new GeocodingUnavailableError("rate_limited");
    }

    try {
      const result = await this.withRetry(() => provider.reverse(input));
      if (result) await this.writeCache(key, [result]);
      this.telemetry("reverse", "miss", startedAt, provider.id, result ? 1 : 0);
      return result;
    } catch {
      this.telemetry("reverse", "error", startedAt, provider.id);
      throw new GeocodingUnavailableError("provider_error");
    }
  }

  private async resolveForward({
    provider,
    key,
    query,
    startedAt,
  }: {
    provider: GeocodingProvider;
    key: string;
    query: GeocodingQuery;
    startedAt: number;
  }): Promise<GeocodingResult[]> {
    try {
      await this.deps.rateLimiter.acquire();
    } catch {
      this.telemetry("forward", "rate_limited", startedAt, provider.id);
      throw new GeocodingUnavailableError("rate_limited");
    }

    try {
      const results = await this.withRetry(() => provider.forward(query));
      const inMarket = results.filter(
        (result) =>
          result.countryCode.toUpperCase() === query.countryCode &&
          isValidCoordinate(result.coordinate),
      );
      await this.writeCache(key, inMarket);
      this.telemetry(
        "forward",
        "miss",
        startedAt,
        provider.id,
        inMarket.length,
      );
      return inMarket;
    } catch (error) {
      if (error instanceof GeocodingUnavailableError) throw error;
      this.telemetry("forward", "error", startedAt, provider.id);
      throw new GeocodingUnavailableError("provider_error");
    }
  }

  /**
   * Bounded exponential backoff.
   *
   * Unbounded retry against a shared free provider converts one slow minute
   * into a ban. The ceiling is small on purpose: a publication flow is waiting.
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const sleep = this.deps.sleep ?? defaultSleep;
    let lastError: unknown;
    for (
      let attempt = 0;
      attempt <= this.deps.config.maxRetries;
      attempt += 1
    ) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        // An abort is the caller changing their mind, not the provider failing.
        if (error instanceof Error && error.name === "AbortError") throw error;
        if (attempt === this.deps.config.maxRetries) break;
        await sleep(Math.min(2_000, 250 * 2 ** attempt));
      }
    }
    throw lastError;
  }

  private async readCache(key: string): Promise<GeocodingResult[] | null> {
    try {
      const raw = await this.deps.cache.get(key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as GeocodingResult[]) : null;
    } catch {
      // A poisoned cache entry must not fail the request it was meant to speed
      // up; treating it as a miss re-resolves and overwrites it.
      return null;
    }
  }

  private async writeCache(
    key: string,
    results: GeocodingResult[],
  ): Promise<void> {
    try {
      await this.deps.cache.set(
        key,
        JSON.stringify(results),
        this.deps.config.cacheTtlSeconds,
      );
    } catch {
      // Caching is an optimisation. Losing it degrades throughput, not results.
    }
  }

  private telemetry(
    operation: "forward" | "reverse",
    outcome: "hit" | "miss" | "error" | "rate_limited" | "disabled",
    startedAt: number,
    provider: string,
    resultCount?: number,
  ): void {
    this.deps.telemetry?.record({
      operation,
      outcome,
      provider,
      durationMs: (this.deps.now?.() ?? Date.now()) - startedAt,
      ...(resultCount === undefined ? {} : { resultCount }),
    });
  }
}

function round(value: number): string {
  return value.toFixed(5);
}

/**
 * A fixed-window limiter over one process.
 *
 * The upstream budget is per-platform, so a multi-instance deployment must back
 * this with the shared store; the interface exists so that swap is one class.
 */
export class InProcessGeocodingRateLimiter implements GeocodingRateLimiter {
  private windowStartedAt = 0;
  private used = 0;

  constructor(
    private readonly limitPerMinute: number,
    private readonly now: () => number = Date.now,
  ) {}

  async acquire(): Promise<void> {
    const now = this.now();
    if (now - this.windowStartedAt >= 60_000) {
      this.windowStartedAt = now;
      this.used = 0;
    }
    if (this.used >= this.limitPerMinute) {
      throw new GeocodingUnavailableError("rate_limited");
    }
    this.used += 1;
  }
}

/** Cache of last resort: correct, bounded, and gone when the process restarts. */
export class InMemoryGeocodingCache implements GeocodingCache {
  private readonly entries = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor(
    private readonly maxEntries = 5_000,
    private readonly now: () => number = Date.now,
  ) {}

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.entries.size >= this.maxEntries) {
      // Oldest insertion first: a Map iterates in insertion order.
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlSeconds * 1_000,
    });
  }
}

export type { GeoCoordinate };
