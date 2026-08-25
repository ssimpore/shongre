import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00060_marketing_automation_analytics.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Marketing automation and analytics migration", () => {
  it("persists versioned automation, immutable steps, message attribution, tracking and conversions", () => {
    for (const table of [
      "automation_definitions",
      "automation_definition_versions",
      "automation_executions",
      "automation_execution_steps",
      "marketing_automation_messages",
      "marketing_tracking_tokens",
      "marketing_conversions",
      "marketing_provider_webhook_receipts",
      "marketing_webhook_subscriptions",
      "marketing_webhook_deliveries",
    ])
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    expect(migration).toContain(
      "Automation and marketing event history is immutable",
    );
  });

  it("claims work with skip-locked queues and grants only the service role", () => {
    expect(
      migration.match(/FOR UPDATE OF[\s\S]*?SKIP LOCKED/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.claim_automation_execution() TO service_role",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.claim_marketing_webhook_delivery() TO service_role",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.claim_automation_execution() FROM PUBLIC, anon, authenticated",
    );
  });

  it("reserves campaign quota atomically and protects every tenant table with forced RLS", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.reserve_marketing_campaign_quota",
    );
    expect(migration).toContain("PERFORM public.consume_monetization_quota");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("is_marketing_tenant_member(tenant_id)");
    expect(migration).toContain("REVOKE ALL PRIVILEGES ON");
  });

  it("stores webhook secrets as an authenticated-encryption envelope", () => {
    expect(migration).toContain("signing_secret_ciphertext BYTEA NOT NULL");
    expect(migration).toContain("signing_secret_iv BYTEA NOT NULL");
    expect(migration).toContain("signing_secret_tag BYTEA NOT NULL");
    expect(migration).not.toMatch(/signing_secret\s+TEXT/i);
  });
});
