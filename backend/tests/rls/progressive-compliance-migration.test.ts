import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00031_progressive_compliance.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("progressive compliance migration safeguards", () => {
  it("models rules, independent checks, reviews, DAC7 and retention separately", () => {
    for (const table of [
      "compliance_rules",
      "compliance_verification_records",
      "compliance_manual_reviews",
      "compliance_dac7_activity_aggregates",
      "compliance_retention_policies",
      "compliance_retention_runs",
      "compliance_provider_events",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
    expect(migration).toContain("LEGAL_REVIEW_REQUIRED");
    expect(migration).toContain("effective_from TIMESTAMPTZ");
    expect(migration).toContain("run_approved_compliance_retention");
    expect(migration).toContain("legal_review_required = FALSE");
    expect(migration).toContain("processed_at IS NOT NULL");
  });

  it("denies browser roles and gives sensitive data an explicit capability", () => {
    expect(migration).toContain("compliance.sensitive.read");
    expect(migration).toContain("compliance.policy.manage");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON public.verification_requests FROM anon, authenticated");
    expect(migration).not.toContain("GRANT SELECT ON public.compliance_tax_profiles TO authenticated");
  });

  it("stores provider event hashes instead of raw payloads and makes audit immutable", () => {
    expect(migration).toContain("payload_hash TEXT NOT NULL");
    expect(migration).toContain("claim_compliance_provider_event");
    expect(migration).toContain("complete_compliance_provider_event");
    expect(migration).toContain("processing_started_at TIMESTAMPTZ");
    expect(migration).not.toMatch(/compliance_provider_events[\s\S]{0,500}payload\s+JSONB/i);
    expect(migration).toContain("compliance audit events are immutable");
    expect(migration).toContain("admin_upsert_compliance_rule");
    expect(migration).toContain("compliance_rule_changes");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.admin_upsert_compliance_rule",
    );
  });

  it("migrates positive legacy states without forcing negative states", () => {
    expect(migration).toContain("legacy_profile_migration");
    expect(migration).toContain("ON CONFLICT (user_id, dimension) DO NOTHING");
    expect(migration).not.toContain("WHERE NOT is_identity_verified");
  });
});
