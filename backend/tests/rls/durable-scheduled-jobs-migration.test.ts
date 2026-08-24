import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00037_durable_scheduled_jobs.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("durable scheduled jobs", () => {
  it("coordinates workers through expiring database leases", () => {
    expect(migration).toContain("leased_until TIMESTAMPTZ");
    expect(migration).toContain("next_run_at TIMESTAMPTZ");
    expect(migration).toContain("ON CONFLICT (job_name) DO UPDATE");
    expect(migration).toContain("scheduled_jobs.leased_until <= NOW()");
  });

  it("keeps the scheduler control plane server-only", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("SET search_path = ''");
  });
});
