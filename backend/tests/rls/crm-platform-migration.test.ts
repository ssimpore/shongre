import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/00053_crm_platform.sql", import.meta.url),
  "utf8",
);

describe("CRM platform migration", () => {
  it("models the generic CRM core and completeness resources relationally", () => {
    for (const table of [
      "crm_workspaces",
      "crm_accounts",
      "crm_contacts",
      "crm_contact_accounts",
      "crm_pipelines",
      "crm_pipeline_stages",
      "crm_opportunities",
      "crm_tasks",
      "crm_activities",
      "crm_products",
      "crm_quotes",
      "crm_custom_field_definitions",
      "crm_saved_views",
      "crm_duplicate_decisions",
      "crm_workflows",
      "crm_sequences",
      "crm_data_jobs",
      "crm_audit_events",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
  });

  it("forces tenant RLS and does not grant blanket access to pre-existing tables", () => {
    expect(migration).toContain("ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.%I FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("(SELECT public.is_crm_tenant_member(tenant_id))");
    expect(migration).not.toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public");
  });

  it("protects lifecycle, financial and immutable history invariants", () => {
    expect(migration).toContain("amount_minor BIGINT");
    expect(migration).toContain("currency CHAR(3)");
    expect(migration).toContain("validate_crm_opportunity_stage");
    expect(migration).toContain("CRM activity and audit history is immutable");
    expect(migration).toContain("version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)");
  });
});
