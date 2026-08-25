import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/00059_marketing_platform.sql", import.meta.url),
  "utf8",
);

describe("Marketing platform migration", () => {
  it("models marketing resources and immutable consent/delivery history", () => {
    for (const table of [
      "communication_consents", "marketing_profiles", "marketing_lists", "marketing_list_memberships",
      "marketing_segments", "marketing_templates", "marketing_template_versions", "marketing_campaigns",
      "marketing_campaign_versions", "marketing_suppressions", "marketing_campaign_recipients",
      "marketing_delivery_events", "marketing_action_tokens", "marketing_jobs", "marketing_audit_events",
    ]) expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    expect(migration).toContain("Marketing history is immutable");
    expect(migration).toContain("token_hash TEXT NOT NULL UNIQUE");
  });

  it("forces tenant RLS and keeps provider credentials outside marketing tables", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("is_marketing_tenant_member(tenant_id)");
    expect(migration).toContain("REVOKE ALL PRIVILEGES ON");
    expect(migration).not.toMatch(/api_key|secret_key|access_token/i);
  });

  it("separates purpose consent and preserves idempotent background dispatch", () => {
    expect(migration).toContain("'MARKETING','TRANSACTIONAL','CRM_CORRESPONDENCE','SECURITY','SYSTEM'");
    expect(migration).toContain("UNIQUE (tenant_id, idempotency_key)");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("UNIQUE (campaign_version_id, profile_id, variant_id)");
  });
});
