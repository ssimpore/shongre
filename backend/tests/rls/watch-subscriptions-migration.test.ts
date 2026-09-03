import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00095_watch_subscriptions.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("watch subscriptions migration", () => {
  it("keeps ownership and market identity on every durable watch record", () => {
    expect(migration).toContain(
      "user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE",
    );
    expect(migration.match(/market_code VARCHAR\(2\) NOT NULL/g)?.length).toBe(
      2,
    );
    expect(migration).toContain(
      "UNIQUE (user_id, market_code, target_type, target_key)",
    );
  });

  it("deduplicates matches and supports immediate, daily, and weekly cadence", () => {
    expect(migration).toContain("UNIQUE (subscription_id, event_id)");
    expect(migration).toContain("WHEN 'daily' THEN NOW() + INTERVAL '1 day'");
    expect(migration).toContain("WHEN 'weekly' THEN NOW() + INTERVAL '7 days'");
    expect(migration).toContain("ELSE NOW()");
    expect(migration).toContain(
      "ON CONFLICT (subscription_id, event_id) DO NOTHING",
    );
    expect(migration).toContain("WITH RECURSIVE category_ancestors");
  });

  it("uses leased outboxes and keeps customer tables backend-only", () => {
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
