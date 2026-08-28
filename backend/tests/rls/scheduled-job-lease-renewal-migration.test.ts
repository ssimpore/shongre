import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00072_scheduled_job_lease_renewal.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("scheduled job lease renewal migration", () => {
  it("renews only a live lease held by the same owner", () => {
    expect(migration).toContain("renew_scheduled_job_lease");
    expect(migration).toContain("owner_id = p_owner_id");
    expect(migration).toContain("leased_until > NOW()");
    expect(migration).toContain("TO service_role");
  });
});
