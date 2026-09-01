import { describe, expect, it } from "vitest";
import {
  createSolutionInputSchema,
  solutionDefinitionSchema,
} from "./solutions";

const validInput = {
  name: "Shongre Test",
  slug: "test",
  shortDescription: "Description courte",
  description: "Description complète",
  icon: "apps" as const,
  category: "Organisation",
  lifecycle: "AVAILABLE" as const,
  markets: ["FR", "BE"],
  languages: ["fr-FR", "fr-BE"],
  audiences: ["Professionnels"],
  capabilities: ["Tester"],
  launchApplicationId: "solutions" as const,
  launchPath: "/test",
  requiresAuthentication: false,
  requiresEntitlement: false,
  releaseNotes: [],
  sortOrder: 10,
  catalogVisible: true,
  featured: false,
};

describe("solution catalog contracts", () => {
  it("accepts canonical market associations and safe application routes", () => {
    expect(createSolutionInputSchema.parse(validInput)).toMatchObject({
      markets: ["FR", "BE"],
      launchApplicationId: "solutions",
    });
  });

  it("rejects unknown markets, open redirects, and duplicate market scope", () => {
    expect(() =>
      createSolutionInputSchema.parse({ ...validInput, markets: ["ZZ"] }),
    ).toThrow(/COUNTRY_REGISTRY/);
    expect(() =>
      createSolutionInputSchema.parse({
        ...validInput,
        launchPath: "//attacker.example/path",
      }),
    ).toThrow(/rester dans l’application/);
    expect(() =>
      createSolutionInputSchema.parse({
        ...validInput,
        markets: ["FR", "FR"],
      }),
    ).toThrow(/qu’une fois/);
  });

  it("fails closed for incomplete availability and entitlement evidence", () => {
    expect(() =>
      createSolutionInputSchema.parse({
        ...validInput,
        launchApplicationId: undefined,
      }),
    ).toThrow(/destination valide/);
    expect(() =>
      createSolutionInputSchema.parse({
        ...validInput,
        requiresEntitlement: true,
        entitlementKey: undefined,
      }),
    ).toThrow(/exige une clé/);
  });

  it("validates complete transport definitions", () => {
    expect(
      solutionDefinitionSchema.parse({
        ...validInput,
        id: "solution-test",
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
      }).id,
    ).toBe("solution-test");
  });
});
