import { describe, expect, it } from "vitest";
import { resolveSafeReturn } from "./safe-return";

describe("resolveSafeReturn", () => {
  it("preserves an internal route with query and hash", () => {
    expect(resolveSafeReturn("/annonce/42?offer=1#message")).toBe(
      "/annonce/42?offer=1#message",
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "%2F%2Fevil.example%2Fsteal",
    "/\\evil.example",
    "javascript:alert(1)",
    "/connexion",
    "/auth/callback",
  ])("collapses unsafe or looping target %s", (candidate) => {
    expect(resolveSafeReturn(candidate, "/compte")).toBe("/compte");
  });
});
