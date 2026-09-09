import { describe, it, expect, vi } from "vitest";

// Shape/contract tests, not database integration. Same guard as
// repository-contracts.test.ts: constructing a repository must not open I/O.
vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: () =>
    new Proxy(
      {},
      {
        get() {
          throw new Error("Repository shape tests must not query Supabase");
        },
      },
    ),
}));

import {
  identifierColumn,
  isUuid,
} from "../../src/infrastructure/database/repositories/repository-identifier.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";

/**
 * Public seller routes (`/profil/:slug`, `/boutique/:slug`, `/vendeur/:slug`,
 * `/u/:slug`) address a profile by slug, while `profiles.id` is a `uuid`.
 * Comparing a slug against that column is not a miss — PostgreSQL raises
 * `invalid input syntax for type uuid`, the repository converts it to a 503 and
 * the seller page answers 500. These tests pin the two halves of the fix: the
 * column choice, and the fact that both repository families accept either form.
 */

const A_UUID = "522be342-1e8c-58ea-b7aa-115dfb8c4186";

describe("public profile identifier resolution", () => {
  describe("identifierColumn", () => {
    it("compares a UUID against the id column", () => {
      expect(isUuid(A_UUID)).toBe(true);
      expect(identifierColumn(A_UUID)).toBe("id");
    });

    it("compares a slug against the slug column", () => {
      expect(isUuid("camille-martin")).toBe(false);
      expect(identifierColumn("camille-martin")).toBe("slug");
    });

    it("never routes a non-UUID to the uuid column", () => {
      for (const value of [
        "camille-martin",
        "atelier-nordique",
        "",
        "not-a-uuid",
        // A near-miss: right shape, invalid version nibble.
        "522be342-1e8c-98ea-b7aa-115dfb8c4186",
        `${A_UUID} or 1=1`,
      ]) {
        expect(identifierColumn(value)).toBe("slug");
      }
    });

    it("accepts an explicit slug column for tables that name it differently", () => {
      expect(identifierColumn("some-slug", "public_slug")).toBe("public_slug");
      expect(identifierColumn(A_UUID, "public_slug")).toBe("id");
    });
  });

  describe("repository family parity", () => {
    const repo = new DemoUserRepository();

    it("resolves a public profile by id and by slug", async () => {
      const seller = (await repo.getAll()).find(
        (user) =>
          user.status === "active" &&
          (user.staffStatus ?? "none") === "none" &&
          Boolean(user.slug),
      );
      expect(
        seller,
        "the demo scenario must expose a public seller",
      ).toBeTruthy();

      const byId = await repo.findPublicById(seller!.id);
      const bySlug = await repo.findPublicById(seller!.slug);
      expect(byId?.id).toBe(seller!.id);
      // The divergence that hid the outage: demo resolved only by id, so the
      // service's slug fallback masked the Postgres repository's type error.
      expect(bySlug?.id).toBe(seller!.id);
    });

    it("returns null rather than throwing for an unknown identifier", async () => {
      await expect(repo.findPublicById("aucun-vendeur")).resolves.toBeNull();
      await expect(
        repo.findPublicById("00000000-0000-4000-8000-000000000000"),
      ).resolves.toBeNull();
    });

    it("bounds the public professional directory", async () => {
      const professionals = await repo.listPublicProfessionals("FR");
      expect(professionals.length).toBeLessThanOrEqual(
        SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.database.discoveryCandidateLimit,
      );
      expect(
        professionals.every(
          (profile) => profile.accountType === "professional",
        ),
      ).toBe(true);
      expect(
        professionals.every(
          (profile) => profile.country.toUpperCase() === "FR",
        ),
      ).toBe(true);
    });

    it("isolates the directory by market", async () => {
      const belgian = await repo.listPublicProfessionals("BE");
      expect(
        belgian.every((profile) => profile.country.toUpperCase() === "BE"),
      ).toBe(true);
      const french = await repo.listPublicProfessionals("FR");
      expect(
        french.some((profile) =>
          belgian.some((other) => other.id === profile.id),
        ),
      ).toBe(false);
    });
  });
});
