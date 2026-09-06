import { describe, expect, it } from "vitest";
import {
  professionalAccountUpgradeSchema,
  userProfileUpdateSchema,
} from "./users";

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

describe("professionalAccountUpgradeSchema", () => {
  it("accepts legal organization input without privileged account fields", () => {
    expect(
      professionalAccountUpgradeSchema.parse({
        companyName: "  Atelier Exemple  ",
        businessIdentifier: "81234567800012",
        legalForm: "SAS",
        businessAddress: "1 rue du Marché",
      }),
    ).toMatchObject({
      companyName: "Atelier Exemple",
      businessIdentifier: "81234567800012",
    });
  });

  it("rejects attempts to self-assign verification or a Staff role", () => {
    expect(() =>
      professionalAccountUpgradeSchema.parse({
        companyName: "Atelier Exemple",
        businessIdentifier: "81234567800012",
        legalForm: "SAS",
        businessAddress: "1 rue du Marché",
        isBusinessVerified: true,
        staffRole: "admin",
      }),
    ).toThrow();
  });
});
