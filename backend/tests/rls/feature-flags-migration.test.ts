import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00046_feature_flag_control_plane.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("feature flag control-plane migration", () => {
  it("models definitions, scoped rules and immutable events", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.feature_flags",
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.feature_flag_rules",
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.feature_flag_events",
    );
    expect(migration).toContain("rollout_percentage BETWEEN 0 AND 100");
  });

  it("keeps browser roles out and makes changes transactional and audited", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("upsert_feature_flag_rule");
    expect(migration).toContain("feature_flag_events");
  });

  it("indexes evaluation and targeted account/organization rules", () => {
    expect(migration).toContain("feature_flag_rules_evaluation_idx");
    expect(migration).toContain("feature_flag_rules_account_idx");
    expect(migration).toContain("feature_flag_rules_organization_idx");
  });
});
