import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/00078_taxonomy_v4.sql", import.meta.url),
  "utf8",
);
const seed = readFileSync(
  new URL("../../supabase/seed/taxonomy-v4.generated.sql", import.meta.url),
  "utf8",
);

const normalizedTables = [
  "taxonomy_attribute_groups",
  "taxonomy_option_sets",
  "taxonomy_options",
  "taxonomy_option_parent_links",
  "taxonomy_listing_types",
  "taxonomy_attribute_bindings",
  "taxonomy_dependency_rules",
  "taxonomy_validation_rules",
  "taxonomy_market_availability",
  "taxonomy_seller_rules",
  "taxonomy_imports",
  "taxonomy_audit_events",
] as const;

describe("taxonomy v4 migration", () => {
  it("expands the existing taxonomy model without destructive listing rewrites", () => {
    normalizedTables.forEach((table) =>
      expect(migration).toContain(`public.${table}`),
    );
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS listing_type_id");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS listing_intent");
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.listings/i);
    expect(migration).not.toMatch(
      /ALTER\s+COLUMN\s+listing_type_id\s+SET\s+NOT\s+NULL/i,
    );
  });

  it("forces RLS and keeps policy/import/audit internals admin-only", () => {
    normalizedTables.forEach((table) => {
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`,
      );
    });
    expect(migration).not.toMatch(
      /taxonomy_seller_rules FOR SELECT USING \(TRUE\)/,
    );
    expect(migration).not.toMatch(/taxonomy_imports FOR SELECT USING \(TRUE\)/);
    expect(migration).not.toMatch(
      /taxonomy_audit_events FOR SELECT USING \(TRUE\)/,
    );
  });

  it("uses deterministic conflict targets so a second local seed is empty", () => {
    expect(seed).toContain("BEGIN;");
    expect(seed).toContain("COMMIT;");
    expect(seed).toContain("ON CONFLICT");
    expect(seed).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(seed).not.toMatch(/\bTRUNCATE\b/i);
    expect(seed).toContain(
      "47dfc844bc66504276c1467e8e2d03227370fc66fd831f17a61815d5722c0cf0",
    );
  });
});
