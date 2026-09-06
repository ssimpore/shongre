import { describe, expect, it, vi } from "vitest";
import { retryDatabaseSerializationFailure } from "../../src/infrastructure/database/serialization-retry.js";

describe("database serialization retry", () => {
  it("retries SQLSTATE 40001 and succeeds on the third attempt", async () => {
    const mutation = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { code: "40001" } })
      .mockResolvedValueOnce({ data: null, error: { code: "40001" } })
      .mockResolvedValueOnce({ data: { id: "listing-1" }, error: null });

    await expect(retryDatabaseSerializationFailure(mutation)).resolves.toEqual({
      data: { id: "listing-1" },
      error: null,
    });
    expect(mutation).toHaveBeenCalledTimes(3);
  });

  it("returns the third serialization error without retrying indefinitely", async () => {
    const finalResult = { data: null, error: { code: "40001" } };
    const mutation = vi.fn().mockResolvedValue(finalResult);

    await expect(retryDatabaseSerializationFailure(mutation)).resolves.toBe(
      finalResult,
    );
    expect(mutation).toHaveBeenCalledTimes(3);
  });

  it("does not retry or replace any other returned database error", async () => {
    const result = { data: null, error: { code: "23505" } };
    const mutation = vi.fn().mockResolvedValue(result);

    await expect(retryDatabaseSerializationFailure(mutation)).resolves.toBe(
      result,
    );
    expect(mutation).toHaveBeenCalledOnce();
  });

  it("preserves thrown errors and retries only an exact 40001 code", async () => {
    const serializationError = { code: "40001" };
    const permanentError = { code: "40001-extra" };
    const succeedsAfterSerializationFailure = vi
      .fn()
      .mockRejectedValueOnce(serializationError)
      .mockResolvedValueOnce("ok");

    await expect(
      retryDatabaseSerializationFailure(succeedsAfterSerializationFailure),
    ).resolves.toBe("ok");
    expect(succeedsAfterSerializationFailure).toHaveBeenCalledTimes(2);

    const permanentMutation = vi.fn().mockRejectedValue(permanentError);
    await expect(
      retryDatabaseSerializationFailure(permanentMutation),
    ).rejects.toBe(permanentError);
    expect(permanentMutation).toHaveBeenCalledOnce();
  });
});
