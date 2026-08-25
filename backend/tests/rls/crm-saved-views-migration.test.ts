import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00057_crm_saved_view_boundaries.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM saved-view boundaries migration", () => {
  it("enforces personal ownership and team scope", () => {
    expect(migration).toContain("visibility = 'personal'");
    expect(migration).toContain("owner_id IS NOT NULL");
    expect(migration).toContain("visibility = 'team'");
    expect(migration).toContain("team_id IS NOT NULL");
  });

  it("prevents ambiguous duplicate names per visibility scope", () => {
    expect(migration).toContain("crm_saved_views_personal_name_uidx");
    expect(migration).toContain("crm_saved_views_team_name_uidx");
    expect(migration).toContain("crm_saved_views_workspace_name_uidx");
    expect(migration).toContain("crm_saved_views_tenant_name_uidx");
  });

  it("removes direct browser access and keeps service-role persistence", () => {
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.crm_saved_views FROM anon, authenticated",
    );
    expect(migration).toContain("TO service_role");
  });
});
