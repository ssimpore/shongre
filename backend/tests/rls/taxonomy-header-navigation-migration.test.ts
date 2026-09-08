import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00081_taxonomy_header_navigation.sql",
    import.meta.url,
  ),
  "utf8",
);
const linksMigration = readFileSync(
  new URL(
    "../../supabase/migrations/00118_taxonomy_header_links.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("taxonomy header navigation migration", () => {
  it("keeps navigation links in the same locked, audited backend-only aggregate", () => {
    expect(linksMigration).toContain("PRIMARY KEY (market_code, target)");
    expect(linksMigration).toContain(
      "REFERENCES public.taxonomy_header_configurations(market_code)",
    );
    expect(linksMigration).toContain(
      "ALTER TABLE public.taxonomy_header_links ENABLE ROW LEVEL SECURITY",
    );
    expect(linksMigration).toContain(
      "ALTER TABLE public.taxonomy_header_links FORCE ROW LEVEL SECURITY",
    );
    expect(linksMigration).toContain(
      "REVOKE ALL ON public.taxonomy_header_links FROM PUBLIC, anon, authenticated",
    );
    expect(linksMigration).toContain(
      "next_revision := public.replace_taxonomy_header_categories(",
    );
    expect(linksMigration).toContain("p_links JSONB DEFAULT NULL");
    expect(linksMigration).toContain("header_navigation.links_updated");
    expect(linksMigration).toContain(
      "target IN ('category_overview', 'promotions')",
    );
  });
  it("stores a market-scoped selection with stable ordering", () => {
    expect(migration).toContain("public.taxonomy_header_configurations");
    expect(migration).toContain("public.taxonomy_header_categories");
    expect(migration).toContain("PRIMARY KEY (market_code, category_id)");
    expect(migration).toContain("UNIQUE (market_code, display_order)");
    expect(migration).toContain("CHECK (display_order >= 0)");
    expect(migration).toContain("default_items.market_code");
    expect(migration).toContain("default_items.category_id");
    expect(migration).toContain("default_items.display_order");
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
