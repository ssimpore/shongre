import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00080_public_taxonomy_terminology.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public taxonomy terminology migration", () => {
  it("keeps the category identity and retires only the former public slug", () => {
    expect(migration).toContain("WHERE id = 'deals_donations'");
    expect(migration).toContain("slug = 'dons-et-objets-gratuits'");
    expect(migration).toContain("to_jsonb('/categorie/don-d-objet'::text)");
    expect(migration).toContain("status = 'retired'");
    expect(migration).toContain("alias = 'dons-solidarite-bons-plans'");
    expect(migration).not.toMatch(/DELETE\s+FROM/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.listings/i);
  });

  it("fails closed instead of overwriting another category slug", () => {
    expect(migration).toContain("AND id <> 'deals_donations'");
    expect(migration).toContain("RAISE EXCEPTION");
  });
});
