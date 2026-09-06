import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00040_remove_demo_identities.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("demo identity cleanup migration", () => {
  it("removes normalized verification evidence before the protected profiles", () => {
    const evidenceDelete = migration.indexOf(
      "DELETE FROM public.compliance_verification_records",
    );
    const profileDelete = migration.indexOf("DELETE FROM public.profiles");

    expect(evidenceDelete).toBeGreaterThan(-1);
    expect(profileDelete).toBeGreaterThan(evidenceDelete);
    expect(migration).toContain("verification.user_id = profile.id");
  });

  it("scopes cleanup by both immutable fixture id and email transactionally", () => {
    expect(migration).toContain("BEGIN;");
    expect(migration).toContain("COMMIT;");
    expect(migration.match(/\(profile\.id, profile\.email\) IN/g)).toHaveLength(
      1,
    );
    expect(migration).toContain(
      "('00000000-0000-0000-0000-000000000004'::uuid, 'admin@shongre.com')",
    );
  });
});
