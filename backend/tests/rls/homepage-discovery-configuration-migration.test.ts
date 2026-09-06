import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00109_homepage_discovery_configuration.sql",
    import.meta.url,
  ),
  "utf8",
);
const collectionBackfill = readFileSync(
  new URL(
    "../../supabase/migrations/00110_homepage_collection_selection_backfill.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("homepage discovery configuration migration", () => {
  it("persists section thresholds and normalized universe category targeting", () => {
    expect(migration).toContain("minimum_listing_count");
    expect(migration).toContain("homepage_universe_subsections");
    expect(migration).toContain("homepage_universe_subsection_markets");
    expect(migration).toContain("UNIQUE (section_id, category_id)");
    expect(migration).toContain("REFERENCES public.categories(id)");
    expect(migration).toContain("REFERENCES public.markets(code)");
  });

  it("keeps writes service-only, RLS-forced, atomic and audited", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain(
      "save_homepage_configuration_revision(JSONB,UUID,TEXT,BOOLEAN)",
    );
    expect(migration).toContain("homepage_configuration_audit_events");
    expect(migration).toContain("TO service_role");
  });

  it("moves legacy collection selection into an audited database revision", () => {
    expect(collectionBackfill).toContain("collectionSlugs");
    expect(collectionBackfill).toContain(
      "save_homepage_configuration_revision",
    );
    expect(collectionBackfill).toContain(
      "Migration vers la sélection administrable des collections",
    );
  });
});
