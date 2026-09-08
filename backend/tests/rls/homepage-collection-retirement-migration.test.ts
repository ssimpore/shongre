import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00117_remove_legacy_homepage_collection_slugs.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("legacy homepage collection retirement", () => {
  it("creates audited revisions instead of modifying historical configuration", () => {
    expect(migration).toContain("public.save_homepage_configuration_revision(");
    expect(migration).toContain("revision.state IN ('published', 'draft')");
    expect(migration).not.toMatch(/\b(?:DELETE FROM|UPDATE) public\./);
    expect(migration).toContain("JOIN public.homepage_sections section");
  });

  it("removes only obsolete selections and retains taxonomy selections in order", () => {
    expect(migration).toContain(
      "(section.settings->'collectionSlugs') ?| v_legacy_slugs",
    );
    expect(migration).toContain(
      "WHERE NOT (selected.slug = ANY(v_legacy_slugs))",
    );
    expect(migration).toContain("ORDER BY selected.ordinality");
    expect(migration).toContain("'pepites-semaine'");
    expect(migration).toContain("'vous-aimerez-aussi'");
  });

  it("preserves relational offer rules and universe subsections", () => {
    for (const table of [
      "homepage_offer_rules",
      "homepage_offer_overrides",
      "homepage_universe_subsections",
      "homepage_universe_subsection_markets",
    ]) {
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).toContain("v_existing.state = 'published'");
  });
});
