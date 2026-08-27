import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00067_crm_prospecting_platform.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Shongre Prospects migration", () => {
  it("extends CRM with market-aware profiles, evidence, scoring and attribution", () => {
    for (const table of [
      "crm_prospecting_profiles",
      "crm_prospecting_profile_markets",
      "crm_prospect_source_catalog",
      "crm_prospect_source_markets",
      "crm_prospect_discovery_runs",
      "crm_prospect_candidates",
      "crm_prospect_evidence",
      "crm_field_provenance",
      "crm_prospect_scores",
      "crm_prospect_ai_insights",
      "crm_prospect_import_commands",
      "crm_prospect_conversion_links",
      "crm_prospect_attribution_events",
      "crm_prospect_conversions",
      "crm_prospect_usage_ledger",
    ])
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    expect(migration).toContain(
      "UNIQUE (tenant_id, market_code, idempotency_key)",
    );
    expect(migration).toContain("official_identifier_scheme");
    expect(migration).toContain("source_fingerprint");
  });

  it("forces tenant RLS and protects evidence, provenance, scores and usage", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("is_crm_tenant_member(tenant_id)");
    expect(migration).toContain("crm_prospect_evidence_immutable");
    expect(migration).toContain("crm_field_provenance_immutable");
    expect(migration).toContain("crm_prospect_scores_immutable");
    expect(migration).toContain("crm_prospect_ai_insights_immutable");
    expect(migration).toContain("crm_prospect_usage_ledger_immutable");
    expect(migration).toContain(
      "REVOKE ALL ON public.crm_prospect_source_catalog",
    );
  });

  it("keeps unapproved external and first-party source contracts inactive", () => {
    expect(migration).toContain("'INACTIVE_REVIEW_REQUIRED'");
    expect(migration).toContain("'shongre_internal_first_party'");
    expect(migration).toContain("'aggregated_market_opportunity'");
    expect(migration).toContain("'approval-required'");
    expect(migration).not.toMatch(
      /api[_-]?key|secret[_-]?key|access[_-]?token/i,
    );
  });

  it("reuses identity, organizations, CRM, Marketing and Provider Platform", () => {
    expect(migration).not.toMatch(
      /CREATE TABLE IF NOT EXISTS public\.(users|organizations|crm_accounts|crm_contacts|marketing_campaigns|marketing_suppressions|provider_connections)\b/,
    );
    expect(migration).toContain("REFERENCES public.organizations(id)");
    expect(migration).toContain("REFERENCES public.crm_accounts(id)");
    expect(migration).toContain("REFERENCES public.marketing_campaigns(id)");
    expect(migration).toContain("REFERENCES public.provider_connections(id)");
  });
});
