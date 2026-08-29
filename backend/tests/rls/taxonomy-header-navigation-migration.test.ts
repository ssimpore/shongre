import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00081_taxonomy_header_navigation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("taxonomy header navigation migration", () => {
  it("stores a market-scoped selection with stable ordering", () => {
    expect(migration).toContain("public.taxonomy_header_configurations");
    expect(migration).toContain("public.taxonomy_header_categories");
    expect(migration).toContain("PRIMARY KEY (market_code, category_id)");
    expect(migration).toContain("UNIQUE (market_code, display_order)");
    expect(migration).toContain("CHECK (display_order >= 0)");
  });

  it("keeps direct table access deny-by-default and the mutation backend-only", () => {
    for (const table of [
      "taxonomy_header_configurations",
      "taxonomy_header_categories",
    ]) {
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`,
      );
    }
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.replace_taxonomy_header_categories[\s\S]+FROM PUBLIC, anon, authenticated/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.replace_taxonomy_header_categories[\s\S]+TO service_role/,
    );
  });

  it("validates root categories, active-market eligibility, revisions, and audit evidence", () => {
    expect(migration).toContain("category.parent_id IS NOT NULL");
    expect(migration).toContain("availability.marketplace_enabled");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("current_revision <> p_expected_revision");
    expect(migration).toContain("header_navigation.updated");
    expect(migration).toContain("p_change_reason");
  });
});
