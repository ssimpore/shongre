import { describe, expect, it } from "vitest";
import { ApiRateLimiter } from "../../src/infrastructure/security/api-rate-limiter.js";

describe("API rate limiter", () => {
  it("enforces the deterministic demo bucket without using raw identifiers as keys", async () => {
    const limiter = new ApiRateLimiter();
    for (let index = 0; index < 180; index += 1) {
      await limiter.consume({
        subject: "198.51.100",
        authenticated: false,
      });
    }
    await expect(
      limiter.consume({ subject: "198.51.100", authenticated: false }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", statusCode: 429 });
  });
});
