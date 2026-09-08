import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00119_restore_automatic_homepage_collections.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("automatic homepage collections repair", () => {
  it("only repairs published, enabled, unconfigured collections, not drafts or manual choices", () => {
    expect(migration).toContain("revision.state = 'published'");
    expect(migration).toContain("AND section.enabled");
    expect(migration).toContain("AND NOT (section.settings ? 'selectionMode')");
    expect(migration).toContain(
      "jsonb_array_length(COALESCE(section.settings->'collectionSlugs', '[]'::jsonb)) = 0",
    );
    expect(migration).toContain("'selectionMode', 'automatic'");
  });
  it("uses the audited revision writer and preserves relational settings and historical records", () => {
    expect(migration).toContain("public.save_homepage_configuration_revision(");
    expect(migration).not.toMatch(/\b(?:DELETE FROM|UPDATE) public\./);
    for (const table of [
      "homepage_offer_rules",
      "homepage_offer_overrides",
      "homepage_universe_subsections",
      "homepage_universe_subsection_markets",
    ])
      expect(migration).toContain(`public.${table}`);
    for (const field of [
      "starts_at",
      "ends_at",
      "mobile_visible",
      "desktop_visible",
      "minimum_listing_count",
      "title_by_locale",
    ])
      expect(migration).toContain(`section.${field}`);
  });
});
