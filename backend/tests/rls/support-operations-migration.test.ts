import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00045_support_operations.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("support operations migration safeguards", () => {
  it("models the queue, SLA, notes, attachments, macros and immutable events", () => {
    for (const table of [
      "support_sla_policies",
      "support_cases",
      "support_case_notes",
      "support_case_attachments",
      "support_case_events",
      "support_macros",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
    expect(migration).toContain("sla_resolution_due_at TIMESTAMPTZ NOT NULL");
    expect(migration).toContain("private_document_asset_id UUID NOT NULL");
  });

  it("keeps support records server-only and changes audited", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("update_support_case");
    expect(migration).toContain("support_case_events");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("p_last_customer_reply_at TIMESTAMPTZ");
    expect(migration).toContain("p_last_staff_reply_at TIMESTAMPTZ");
  });

  it("indexes the active SLA queue and every new foreign-key access path", () => {
    expect(migration).toContain("support_cases_queue_idx");
    expect(migration).toContain("support_cases_requester_idx");
    expect(migration).toContain("support_cases_assignee_idx");
    expect(migration).toContain("support_case_notes_case_idx");
    expect(migration).toContain("support_case_attachments_case_idx");
  });
});
