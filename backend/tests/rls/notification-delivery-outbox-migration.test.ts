import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00050_notification_delivery_outbox.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("notification delivery outbox migration", () => {
  it("leases work atomically and supports retry plus dead-letter states", () => {
    expect(migration).toContain("claim_notification_deliveries");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("lease_expires_at");
    expect(migration).toContain("'retry'");
    expect(migration).toContain("'dead_letter'");
  });

  it("uses stable idempotency keys and immutable attempt and receipt records", () => {
    expect(migration).toContain("idempotency_key TEXT NOT NULL UNIQUE");
    expect(migration).toContain("notification_delivery_attempts");
    expect(migration).toContain("notification_delivery_receipts");
    expect(migration).toContain(
      "UNIQUE (provider_id, provider_message_id, status, occurred_at)",
    );
  });

  it("keeps preferences and delivery internals server-only", () => {
    expect(migration).toContain("notification_preferences");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SET search_path = ''");
  });
});
