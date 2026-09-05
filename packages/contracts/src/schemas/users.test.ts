import { describe, expect, it } from "vitest";
import { userProfileUpdateSchema } from "./users";

describe("userProfileUpdateSchema", () => {
  it("accepts and normalizes self-service profile fields", () => {
    expect(
      userProfileUpdateSchema.parse({ name: "  Camille  ", country: "fr" }),
    ).toEqual({ name: "Camille", country: "FR" });
  });

  it.each([
    ["status", "active"],
    ["staffRole", "admin"],
    ["customPermissions", ["admin.access"]],
    ["isIdentityVerified", true],
  ])("rejects mass assignment of %s", (field, value) => {
    expect(() =>
      userProfileUpdateSchema.parse({ name: "Camille", [field]: value }),
    ).toThrow();
  });

  it("rejects an empty update", () => {
    expect(() => userProfileUpdateSchema.parse({})).toThrow();
  });
});
