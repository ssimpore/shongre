import { describe, expect, it } from "vitest";
import { solutionDefinitionSchema } from "@shongre/contracts/solutions";
import {
  canonicalInstant,
  normalizeSolutionDocument,
} from "../../src/infrastructure/database/repositories/solutions.repository.js";

/**
 * `get_solution_catalog` and `mutate_solution_catalog` hand back the
 * `solution_catalog_document` JSONB projection: Postgres serialises every
 * `timestamptz` with microseconds and an explicit offset, which the contract
 * (`z.string().datetime()`) rejects. Until the projection is re-serialised,
 * every catalogue read in database mode fails with 503.
 */
const postgresDocument = {
  id: "fb5d71a1-209d-4209-b25c-eec406d59238",
  name: "Shongre Marketplace",
  slug: "marketplace",
  shortDescription: "La marketplace locale.",
  description: "Petites annonces, paiement suivi, livraison et retrait.",
  icon: "marketplace",
  category: "Marketplace",
  lifecycle: "AVAILABLE",
  availableFrom: "2026-08-01T09:00:00+00:00",
  markets: ["BE", "CH", "FR"],
  languages: ["fr", "en"],
  audiences: ["Particuliers"],
  capabilities: ["Annonces"],
  launchApplicationId: "marketplace",
  launchPath: "/",
  requiresAuthentication: false,
  requiresEntitlement: false,
  releaseNotes: [
    {
      id: "marketplace-catalog-v1",
      title: "Entrée au catalogue",
      body: "Première publication.",
      publishedAt: "2026-08-01T09:00:00+00:00",
    },
  ],
  sortOrder: 10,
  catalogVisible: true,
  featured: true,
  createdAt: "2026-09-17T23:36:14.985257+00:00",
  updatedAt: "2026-09-17T23:36:14.985257+02:00",
};

describe("solutions repository database projection", () => {
  it("re-serialises Postgres timestamps into canonical instants", () => {
    expect(solutionDefinitionSchema.safeParse(postgresDocument).success).toBe(
      false,
    );

    const parsed = solutionDefinitionSchema.parse(
      normalizeSolutionDocument(postgresDocument),
    );

    expect(parsed.createdAt).toBe("2026-09-17T23:36:14.985Z");
    expect(parsed.updatedAt).toBe("2026-09-17T21:36:14.985Z");
    expect(parsed.availableFrom).toBe("2026-08-01T09:00:00.000Z");
    expect(parsed.availableUntil).toBeUndefined();
    expect(parsed.releaseNotes[0]?.publishedAt).toBe(
      "2026-08-01T09:00:00.000Z",
    );
  });

  it("leaves values it cannot interpret for the schema to reject", () => {
    expect(canonicalInstant("not-a-date")).toBe("not-a-date");
    expect(canonicalInstant(undefined)).toBeUndefined();
    expect(canonicalInstant(42)).toBe(42);
    expect(normalizeSolutionDocument(null)).toBeNull();
    expect(normalizeSolutionDocument([1])).toEqual([1]);
    expect(
      solutionDefinitionSchema.safeParse(
        normalizeSolutionDocument({ ...postgresDocument, createdAt: "later" }),
      ).success,
    ).toBe(false);
  });
});
