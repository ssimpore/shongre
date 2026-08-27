import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00066_unified_analytics.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Unified analytics migration", () => {
  it("creates the event, aggregate, delivery, privacy and sync model", () => {
    for (const table of [
      "analytics_events",
      "analytics_provider_deliveries",
      "analytics_daily_metrics",
      "analytics_search_daily",
      "analytics_seo_daily",
      "analytics_sync_state",
      "analytics_retention_policies",
      "analytics_privacy_requests",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
    expect(migration).toContain("event_id VARCHAR(160) NOT NULL UNIQUE");
    expect(migration).toContain("UNIQUE (event_id, provider)");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("attempt_count < 8");
  });

  it("forces RLS and makes raw history append-only outside explicit privacy work", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON TABLE");
    expect(migration).toContain("analytics_events is append-only");
    expect(migration).toContain("app.analytics_privacy_rewrite");
  });

  it("uses authoritative finance records for revenue and defines retention", () => {
    expect(migration).toContain("FROM public.finance_transactions");
    expect(migration).toContain("amount_minor");
    expect(migration).toContain("apply_analytics_retention");
    expect(migration).toContain("anonymize_analytics_subject");
    expect(migration).not.toMatch(/DOUBLE PRECISION.*(?:revenue|amount)/i);
  });
});
