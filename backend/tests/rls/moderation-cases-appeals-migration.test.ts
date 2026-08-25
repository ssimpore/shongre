import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00051_moderation_cases_and_appeals.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("moderation cases and appeals migration", () => {
  it("creates one canonical case per report and an immutable event history", () => {
    expect(migration).toContain("report_id UUID NOT NULL UNIQUE");
    expect(migration).toContain("create_moderation_case_after_report");
    expect(migration).toContain("moderation_case_events");
  });

  it("applies report decisions and target state changes in one transaction", () => {
    expect(migration).toContain("resolve_moderation_case");
    expect(migration).toContain("target_state_before");
    expect(migration).toContain(
      "UPDATE public.listings SET status = 'archived'",
    );
    expect(migration).toContain("UPDATE public.profiles SET status = 'banned'");
    expect(migration).toContain("FOR UPDATE");
  });

  it("limits appeals, requires independent review, and can restore prior state", () => {
    expect(migration).toContain("INTERVAL '30 days'");
    expect(migration).toContain("moderation_appeals_one_active_per_case_idx");
    expect(migration).toContain("appeal reviewer must be independent");
    expect(migration).toContain("target_state_before->>'status'");
  });

  it("keeps sensitive reporter and enforcement data server-only", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SET search_path = ''");
  });
});
