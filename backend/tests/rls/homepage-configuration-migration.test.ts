import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00077_homepage_configuration.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("homepage configuration migration", () => {
  it("stores market-scoped revisions, controlled sections and relational deal rules", () => {
    expect(migration).toContain("homepage_configuration_revisions");
    expect(migration).toContain("homepage_sections");
    expect(migration).toContain("homepage_offer_rules");
    expect(migration).toContain("homepage_offer_overrides");
    expect(migration).toContain("homepage_configuration_audit_events");
    expect(migration).toContain("UNIQUE (market_code, locale, revision)");
  });

  it("is deny-by-default and exposes its atomic write function only to the service role", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain(
      "save_homepage_configuration_revision(JSONB,UUID,TEXT,BOOLEAN)",
    );
    expect(migration).toContain("TO service_role");
  });
});
