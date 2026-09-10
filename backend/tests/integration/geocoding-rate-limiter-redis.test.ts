import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { RedisGeocodingRateLimiter } from "../../src/modules/geo/geocoding-rate-limiter.js";
import { GeocodingUnavailableError } from "../../src/modules/geo/geocoding.service.js";

/**
 * The shared budget, against a real store.
 *
 * The unit suite proves the decision — refill, capacity, boundary, failure
 * direction — against a stand-in. It cannot prove the property the class exists
 * for: that two callers racing for the last token do not both get it. That is a
 * fact about Redis executing the script atomically, and only Redis can show it.
 *
 * Explicit opt-in to the repository-owned local stack, like the other
 * integration suites; never a hosted server.
 */
const enabled = process.env.GEOCODING_RATE_LIMIT_TEST === "local";
const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

describe.skipIf(!enabled)("shared geocoding budget on Redis", () => {
  const clients: Redis[] = [];

  beforeAll(async () => {
    /*
     * Say why, rather than let it surface as an assertion.
     *
     * With the store unreachable the limiter does exactly what it should — it
     * refuses everything — so every expectation here fails at once and reports
     * "expected 0 to be 5", which describes the symptom of a correct fail-closed
     * path and names nothing an operator can act on.
     */
    const probe = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    try {
      await probe.connect();
      await probe.ping();
    } catch (error) {
      throw new Error(
        `This suite needs the repository-owned Redis at ${url}. Run \`make redis-up\`, or set REDIS_URL to a reachable server. (${
          error instanceof Error ? error.message : "unreachable"
        })`,
      );
    } finally {
      probe.disconnect();
    }
  });
  const connect = () => {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    clients.push(client);
    return client;
  };

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.quit().catch(() => {})));
  });

  it("hands the last token to exactly one of many concurrent callers", async () => {
    /*
     * The race this class exists to lose safely. Each limiter stands for an
     * application instance with its own connection; read-modify-write from the
     * client would let several of them read the same remaining token and all
     * spend it, which is how a configured rate becomes a multiple of itself.
     */
    const capacity = 5;
    const attempts = 40;
    const instances = Array.from(
      { length: 8 },
      () =>
        new RedisGeocodingRateLimiter({
          limitPerMinute: capacity,
          client: connect(),
          // Frozen, so refill cannot quietly widen the allowance mid-race.
          now: () => 1_700_000_000_000,
        }),
    );
    // A key nothing else in the environment shares.
    const isolate = `${Date.now()}-${Math.random()}`;
    for (const instance of instances) {
      (instance as unknown as { key: string }).key =
        `shongre:test:geocoding:${isolate}`;
    }

    const outcomes = await Promise.all(
      Array.from({ length: attempts }, (_unused, index) =>
        instances[index % instances.length]!.acquire().then(
          () => "granted" as const,
          (error) => {
            expect(error).toBeInstanceOf(GeocodingUnavailableError);
            return "refused" as const;
          },
        ),
      ),
    );

    const granted = outcomes.filter((outcome) => outcome === "granted").length;
    expect(granted).toBe(capacity);
    expect(outcomes).toHaveLength(attempts);
  });

  it("refills against the real clock, not per instance", async () => {
    /* Three tokens, not sixty. The property is that two instances draw from one
       bucket and that time refills it; a larger capacity only adds round trips,
       which is how this timed out on a busy machine while proving nothing more. */
    const capacity = 3;
    const isolate = `${Date.now()}-${Math.random()}`;
    let clock = 1_700_000_000_000;
    const build = () => {
      const instance = new RedisGeocodingRateLimiter({
        limitPerMinute: capacity,
        client: connect(),
        now: () => clock,
      });
      (instance as unknown as { key: string }).key =
        `shongre:test:geocoding:${isolate}`;
      return instance;
    };
    const first = build();
    const second = build();

    for (let index = 0; index < capacity; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await first.acquire();
    }
    // The second instance sees an exhausted budget, not a fresh one of its own.
    await expect(second.acquire()).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );

    // Twenty seconds is one token at three a minute.
    clock += 20_000;
    await expect(second.acquire()).resolves.toBeUndefined();
    // And that one token was the shared one, so the first instance has none.
    await expect(first.acquire()).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });
});
