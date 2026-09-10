import { describe, expect, it, vi } from "vitest";
import type Redis from "ioredis";
import { RedisGeocodingRateLimiter } from "../../src/modules/geo/geocoding-rate-limiter.js";
import { GeocodingUnavailableError } from "../../src/modules/geo/geocoding.service.js";

/**
 * The limiter's contract, exercised against a stand-in that runs the same Lua
 * the real store runs. What is being checked is the *decision* — refill,
 * capacity, boundary behaviour, failure direction — not that Redis works.
 *
 * `tests/integration/geocoding-rate-limiter-redis.test.ts` runs the identical
 * script against a real server, because the atomicity is the point and a
 * stand-in cannot prove it.
 */

/** A single-threaded interpreter of the one script this class sends. */
function fakeRedis(now: () => number) {
  const store = new Map<string, { tokens: number; at: number }>();
  const client = {
    status: "ready",
    connect: vi.fn(),
    eval: vi.fn(
      async (
        _script: string,
        _keyCount: number,
        key: string,
        capacityArg: string,
        refillArg: string,
        nowArg: string,
      ) => {
        const capacity = Number(capacityArg);
        const refillPerMs = Number(refillArg);
        const at = Number(nowArg);
        const bucket = store.get(key) ?? { tokens: capacity, at };
        const elapsed = Math.max(0, at - bucket.at);
        let tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
        let allowed = 0;
        if (tokens >= 1) {
          tokens -= 1;
          allowed = 1;
        }
        store.set(key, { tokens, at });
        return allowed;
      },
    ),
  } as unknown as Redis;
  void now;
  return client;
}

function limiter(limitPerMinute: number) {
  let clock = 1_700_000_000_000;
  const client = fakeRedis(() => clock);
  return {
    limiter: new RedisGeocodingRateLimiter({
      limitPerMinute,
      client,
      now: () => clock,
    }),
    advance: (ms: number) => {
      clock += ms;
    },
    client,
  };
}

describe("shared geocoding budget", () => {
  it("allows a full bucket and then refuses", async () => {
    const { limiter: subject } = limiter(3);
    await expect(subject.acquire()).resolves.toBeUndefined();
    await expect(subject.acquire()).resolves.toBeUndefined();
    await expect(subject.acquire()).resolves.toBeUndefined();
    await expect(subject.acquire()).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });

  it("refills over time rather than all at once", async () => {
    const { limiter: subject, advance } = limiter(60);
    for (let index = 0; index < 60; index += 1) await subject.acquire();
    await expect(subject.acquire()).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );

    // One token per second at sixty a minute.
    advance(1_000);
    await expect(subject.acquire()).resolves.toBeUndefined();
    await expect(subject.acquire()).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });

  it("does not admit twice the rate across a minute boundary", async () => {
    /*
     * The reason this is a bucket and not a fixed window. A window resets on a
     * clock edge, so an allowance spent at the end of one minute and another
     * spent at the start of the next arrive back to back — a provider that
     * measures per second sees double the rate it published.
     */
    const { limiter: subject, advance } = limiter(60);
    for (let index = 0; index < 60; index += 1) await subject.acquire();
    advance(60_000 - 1);
    let granted = 0;
    for (let index = 0; index < 60; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await subject.acquire().then(
        () => true,
        () => false,
      );
      if (ok) granted += 1;
    }
    // A window would have handed back all sixty at the edge.
    expect(granted).toBeLessThan(60);
  });

  it("never mints an allowance from a clock that moved backwards", async () => {
    const { limiter: subject, advance } = limiter(2);
    await subject.acquire();
    await subject.acquire();
    advance(-60_000);
    await expect(subject.acquire()).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });

  it("refuses when the store is unreachable, rather than counting alone", async () => {
    /*
     * Closed, not open. An unreachable store is the one moment every instance
     * would otherwise fall back to its own counter — the unmetered state this
     * class removes — arriving exactly when nothing is watching.
     */
    const client = {
      status: "ready",
      connect: vi.fn(),
      eval: vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    } as unknown as Redis;
    const subject = new RedisGeocodingRateLimiter({
      limitPerMinute: 60,
      client,
    });
    await expect(subject.acquire()).rejects.toMatchObject({
      reason: "rate_limited",
    });
  });

  it("connects a lazy client before its first use", async () => {
    const client = {
      status: "wait",
      connect: vi.fn(async () => undefined),
      eval: vi.fn(async () => 1),
    } as unknown as Redis;
    await new RedisGeocodingRateLimiter({
      limitPerMinute: 60,
      client,
    }).acquire();
    expect(client.connect).toHaveBeenCalledTimes(1);
  });
});
