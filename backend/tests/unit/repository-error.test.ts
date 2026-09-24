import { beforeEach, describe, expect, it, vi } from "vitest";

const logged = vi.hoisted(() => vi.fn());
const warned = vi.hoisted(() => vi.fn());
vi.mock(
  "../../src/infrastructure/logging/logger.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../src/infrastructure/logging/logger.js")
    >()),
    logger: { error: logged, warn: warned },
  }),
);

import { databaseFailure } from "../../src/infrastructure/database/repositories/repository-error.js";
import { AppError } from "../../src/shared/errors/app-error.js";

function thrown(action: () => never): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

describe("databaseFailure", () => {
  beforeEach(() => {
    logged.mockReset();
    warned.mockReset();
  });

  it("logs the provider's code and message, and fails closed as a 503", () => {
    const error = thrown(() =>
      databaseFailure("support.getCase", {
        code: "57014",
        message: "canceling statement due to statement timeout",
        details: null,
      }),
    );
    expect(error).toMatchObject({ code: "NETWORK_ERROR", statusCode: 503 });
    expect(logged).toHaveBeenCalledWith(
      "Database repository operation failed",
      expect.objectContaining({
        operation: "support.getCase",
        errorCode: "57014",
        errorMessage: "canceling statement due to statement timeout",
      }),
    );
  });

  it("answers a malformed identifier as an absent resource, not an outage", () => {
    // `/compte/support/<not-a-uuid>` used to render "service unavailable".
    const error = thrown(() =>
      databaseFailure("support.getCase", {
        code: "22P02",
        message: 'invalid input syntax for type uuid: "support-case-absent"',
        details: null,
      }),
    );
    expect(error).toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
    expect(logged).not.toHaveBeenCalled();
    expect(warned).toHaveBeenCalledWith(
      "Database repository rejected a malformed value",
      { operation: "support.getCase", errorCode: "22P02" },
    );
    // Any other unparseable value is the caller's bad input.
    expect(
      thrown(() =>
        databaseFailure("orders.list", {
          code: "22P02",
          message: 'invalid input value for enum order_status: "paid-ish"',
        }),
      ),
    ).toMatchObject({ code: "BAD_REQUEST", statusCode: 400 });
  });

  it("passes an AppError from an inner guard through unchanged", () => {
    // Repositories wrap whole methods in a second guard. A deliberate
    // validation error inside must stay a 400, not become an outage.
    const validation = new AppError({
      code: "VALIDATION_ERROR",
      message: "Devise du marché introuvable.",
    });
    expect(thrown(() => databaseFailure("listings.search", validation))).toBe(
      validation,
    );
    expect(logged).not.toHaveBeenCalled();
  });
});
