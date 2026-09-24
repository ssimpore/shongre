import { describe, expect, it } from "vitest";
import {
  ApiRateLimiter,
  InProcessRequestBudgetStore,
  type RequestBudgetStore,
} from "../../src/infrastructure/security/api-rate-limiter.js";

describe("API rate limiter", () => {
  it("enforces the per-subject budget without using raw identifiers as keys", async () => {
    const keys: string[] = [];
    const inner = new InProcessRequestBudgetStore();
    const recording: RequestBudgetStore = {
      consume: (key, ...rest) => {
        keys.push(key);
        return inner.consume(key, ...rest);
      },
      close: () => inner.close(),
    };
    const limiter = new ApiRateLimiter(recording);
    for (let index = 0; index < 180; index += 1) {
      await limiter.consume({ subject: "198.51.100", authenticated: false });
    }
    await expect(
      limiter.consume({ subject: "198.51.100", authenticated: false }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      statusCode: 429,
      details: { retryAfterSeconds: expect.any(Number) },
    });
    expect(keys.some((key) => key.includes("198.51.100"))).toBe(false);
    // Another subject keeps its own budget.
    await expect(
      limiter.consume({ subject: "203.0.113", authenticated: false }),
    ).resolves.toBeUndefined();
  });

  it("fails closed as a 503 when the budget store cannot answer", async () => {
    const limiter = new ApiRateLimiter({
      consume: async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:6380");
      },
      close: async () => undefined,
    });
    await expect(
      limiter.consume({ subject: "user-1", authenticated: true }),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR", statusCode: 503 });
  });

  it("keeps a lock until it lapses, then opens a new window", async () => {
    const store = new InProcessRequestBudgetStore();
    expect((await store.consume("k", 1, 60_000, 20)).allowed).toBe(true);
    expect((await store.consume("k", 1, 60_000, 20)).allowed).toBe(false);
    expect((await store.consume("k", 1, 60_000, 20)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    // The window is still open but its allowance is spent; the lock lapsing
    // does not refill it.
    expect((await store.consume("k", 1, 60_000, 20)).allowed).toBe(false);
  });
});
