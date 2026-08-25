import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00056_crm_shongre_event_inbox.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM Shongre event inbox migration", () => {
  it("leases tenant events atomically with retry and dead-letter states", () => {
    expect(migration).toContain("claim_crm_shongre_events");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("lease_expires_at");
    expect(migration).toContain("'retry'");
    expect(migration).toContain("'dead_letter'");
  });

  it("deduplicates envelopes and commit-ack retries", () => {
    expect(migration).toContain("UNIQUE (source, event_id)");
    expect(migration).toContain("UNIQUE (tenant_id, idempotency_key)");
    expect(migration).toContain("crm_activities_external_event_once_idx");
    expect(migration).toContain("crm_audit_shongre_event_once_idx");
  });

  it("publishes canonical organization and billing events without transferring ownership", () => {
    expect(migration).toContain("organizations_publish_crm_event");
    expect(migration).toContain(
      "monetization_subscription_events_publish_crm_event",
    );
    expect(migration).toContain("apply_crm_shongre_event");
    expect(migration).not.toContain("UPDATE public.monetization_subscriptions");
  });

  it("keeps inbox internals service-role-only", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SET search_path = ''");
  });
});
