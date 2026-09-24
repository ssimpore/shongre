import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { RedisRequestBudgetStore } from "../../src/infrastructure/security/api-rate-limiter.js";

/**
 * The per-subject API budget against a real store. The unit suite proves the
 * limiter's decision and failure direction against a stand-in; only Redis can
 * show that concurrent requests on different instances never both take the
 * last slot, because that is a property of the script running atomically.
 *
 * Explicit opt-in to the repository-owned local stack; never a hosted server.
 */
const enabled = process.env.API_RATE_LIMIT_TEST === "local";
const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

describe.skipIf(!enabled)("shared API request budget on Redis", () => {
  const clients: Redis[] = [];
  const connect = () => {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    clients.push(client);
    return client;
  };

  beforeAll(async () => {
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

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.quit().catch(() => {})));
  });

  it("admits exactly the limit across concurrent instances, then locks", async () => {
    const limit = 5;
    const key = `shongre:test:api-rate:${Date.now()}-${Math.random()}`;
    const instances = Array.from(
      { length: 8 },
      () => new RedisRequestBudgetStore(connect()),
    );
    const decisions = await Promise.all(
      Array.from({ length: 40 }, (_unused, index) =>
        instances[index % instances.length]!.consume(
          key,
          limit,
          60_000,
          30_000,
        ),
      ),
    );
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(
      limit,
    );
    const refused = decisions.filter((decision) => !decision.allowed);
    expect(refused.every((decision) => decision.retryAfterMs > 0)).toBe(true);

    // The lock outlives the spent window: a new request is still refused.
    const next = await instances[0]!.consume(key, limit, 60_000, 30_000);
    expect(next.allowed).toBe(false);
    expect(next.retryAfterMs).toBeLessThanOrEqual(30_000);
  });

  it("opens a new window once the lock lapses", async () => {
    const key = `shongre:test:api-rate:${Date.now()}-${Math.random()}`;
    const store = new RedisRequestBudgetStore(connect());
    expect((await store.consume(key, 1, 60_000, 50)).allowed).toBe(true);
    expect((await store.consume(key, 1, 60_000, 50)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect((await store.consume(key, 1, 60_000, 50)).allowed).toBe(true);
  });
});
