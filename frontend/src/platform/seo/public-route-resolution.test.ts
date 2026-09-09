import { describe, it, expect } from "vitest";
import { AppError } from "../../api/errors/app-error";
import { resolutionForError } from "./public-route-data";

/**
 * Public route resolvers used to collapse every failure into `not_found`, so a
 * rate limit or transport error answered 404 on a live listing — which asks
 * crawlers to drop published inventory. `resolveSeller` had no catch at all and
 * answered 500. This pins the classification both halves now share.
 */
describe("public route data failure classification", () => {
  it("treats an explicit NOT_FOUND as an absent resource", () => {
    const resolution = resolutionForError(
      new AppError({ code: "NOT_FOUND", message: "Introuvable." }),
      "listing",
    );
    expect(resolution.status).toBe("not_found");
    expect(resolution.data).toBeNull();
  });

  it.each([
    "RATE_LIMITED",
    "NETWORK_ERROR",
    "TIMEOUT",
    "INTERNAL_ERROR",
    "UNAUTHENTICATED",
    "FORBIDDEN",
  ] as const)("treats %s as unavailable, never as absent", (code) => {
    const resolution = resolutionForError(
      new AppError({ code, message: "Échec." }),
      "job",
    );
    expect(resolution.status).toBe("unavailable");
    expect(resolution.status).not.toBe("not_found");
  });

  it("treats an unclassified throw as unavailable", () => {
    for (const thrown of [
      new Error("socket hang up"),
      "a string",
      null,
      undefined,
      {},
    ]) {
      expect(resolutionForError(thrown, "seller").status).toBe("unavailable");
    }
  });

  it("preserves the resource type so the response can explain itself", () => {
    for (const kind of [
      "listing",
      "seller",
      "job",
      "collection",
      "vertical_resource",
    ] as const) {
      const resolution = resolutionForError(new Error("boom"), kind);
      expect(resolution.status).toBe("unavailable");
      if (resolution.status === "unavailable") {
        expect(resolution.resourceType).toBe(kind);
      }
    }
  });
});
