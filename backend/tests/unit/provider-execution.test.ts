import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/shared/errors/app-error.js";
import { ProviderExecutionGuard } from "../../src/integrations/providers/provider-execution.js";

const key = {
  providerId: "test-provider",
  capability: "test.capability",
  marketCode: "FR",
};

describe("provider execution guard", () => {
  it("requires idempotency before retrying a mutation", async () => {
    const guard = new ProviderExecutionGuard();
    await expect(
      guard.execute({
        ...key,
        mutating: true,
        maxAttempts: 2,
        operation: async () => "ok",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("retries a declared transient failure and closes the circuit on success", async () => {
    const guard = new ProviderExecutionGuard();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new AppError({ code: "RATE_LIMITED", message: "slow down" }),
      )
      .mockResolvedValueOnce("ok");

    await expect(
      guard.execute({
        ...key,
        mutating: true,
        idempotencyKey: "operation-1",
        operation,
        isRetryable: () => true,
      }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(guard.getState(key).state).toBe("CLOSED");
  });

  it("opens after repeated failures and rejects without calling upstream", async () => {
    const guard = new ProviderExecutionGuard(2, 60_000);
    const fail = () =>
      guard.execute({
        ...key,
        mutating: false,
        maxAttempts: 1,
        operation: async () => {
          throw new Error("upstream down");
        },
      });

    await expect(fail()).rejects.toThrow("upstream down");
    await expect(fail()).rejects.toThrow("upstream down");
    expect(guard.getState(key).state).toBe("OPEN");
    await expect(fail()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
