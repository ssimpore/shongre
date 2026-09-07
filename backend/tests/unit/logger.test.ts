import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Logger,
  redactLogContext,
} from "../../src/infrastructure/logging/logger.js";
import { requestContext } from "../../src/infrastructure/observability/request-context.js";

const originalEnvironment = process.env.APP_ENV;
const originalEnvironmentId = process.env.ENVIRONMENT_ID;
const originalSecret = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalEnvironment === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = originalEnvironment;
  if (originalEnvironmentId === undefined) delete process.env.ENVIRONMENT_ID;
  else process.env.ENVIRONMENT_ID = originalEnvironmentId;
  if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = originalSecret;
});

describe("structured logger", () => {
  it("keeps concurrent request identities isolated across asynchronous work", async () => {
    const output = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = new Logger("Domain");
    await Promise.all(
      ["request-a", "request-b"].map((requestId) =>
        requestContext.run(
          { requestId, actorId: requestId + "-actor" },
          async () => {
            await Promise.resolve();
            logger.warn(requestId);
          },
        ),
      ),
    );
    logger.warn("outside-request");
    const payloads = output.mock.calls.map(([message]) =>
      JSON.parse(String(message)),
    );
    for (const requestId of ["request-a", "request-b"]) {
      expect(
        payloads.find((payload) => payload.message === requestId),
      ).toMatchObject({
        requestId,
        actorId: requestId + "-actor",
      });
    }
    expect(
      payloads.find((payload) => payload.message === "outside-request"),
    ).not.toHaveProperty("requestId");
  });

  it("adds immutable environment identity and redacts nested credentials", () => {
    process.env.APP_ENV = "staging";
    process.env.ENVIRONMENT_ID = "shongre-staging";
    process.env.STRIPE_SECRET_KEY = "sk_test_sensitive_value";
    const output = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    new Logger("Worker").warn("provider_request", {
      level: "FORGED",
      accessToken: "plain-token",
      nested: {
        error: "request failed with sk_test_sensitive_value",
        authorization: "Bearer abc.def.ghi",
      },
    });

    const payload = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      level: "WARN",
      scope: "Worker",
      appEnvironment: "staging",
      environmentId: "shongre-staging",
      accessToken: "[REDACTED]",
      nested: {
        error: "request failed with [REDACTED]",
        authorization: "[REDACTED]",
      },
    });
  });

  it("handles circular context without failing log serialization", () => {
    const shared = { occurredAt: new Date("2026-09-06T12:00:00.000Z") };
    const circular: Record<string, unknown> = { first: shared, second: shared };
    circular.self = circular;
    expect(redactLogContext({ circular })).toEqual({
      circular: {
        first: { occurredAt: "2026-09-06T12:00:00.000Z" },
        second: { occurredAt: "2026-09-06T12:00:00.000Z" },
        self: "[Circular]",
      },
    });
  });
});
