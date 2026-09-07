import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00111_discovery_event_outbox.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("discovery event outbox migration", () => {
  it("leases work atomically and retains bounded retry failures", () => {
    expect(migration).toContain("claim_discovery_search_events");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("lease_expires_at");
    expect(migration).toContain("'retry'");
    expect(migration).toContain("'dead_letter'");
    expect(migration).toContain("attempt_count >= 10");
  });

  it("deduplicates by request and allows only the service role to process rows", () => {
    expect(migration).toContain("request_id UUID NOT NULL UNIQUE");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("SET search_path = ''");
  });
});
