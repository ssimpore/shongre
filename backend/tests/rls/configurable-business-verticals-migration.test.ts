import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00027_configurable_business_verticals.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("configurable business vertical migration safeguards", () => {
  it("replaces the release-time whitelist with a validated stable-code format", () => {
    expect(migration).toContain("pg_get_constraintdef");
    expect(migration).toContain("DROP CONSTRAINT");
    expect(migration).toContain("business_verticals_id_format_check");
    expect(migration).toContain("^[a-z][a-z0-9_-]{1,29}$");
    expect(migration).toContain("NOT VALID");
    expect(migration).toContain("VALIDATE CONSTRAINT");
  });

  it("preserves the server-only RLS boundary", () => {
    expect(migration).toContain(
      "ALTER TABLE public.business_verticals ENABLE ROW LEVEL SECURITY",
    );
    expect(migration).toContain(
      "REVOKE ALL ON public.business_verticals FROM anon, authenticated",
    );
  });

  it("installs the next immutable catalog release atomically", () => {
    expect(migration).toContain("install_commercial_catalog_release");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("commercial catalog version must increase");
    expect(migration).toContain("SET status = 'archived'");
    expect(migration).toContain("effective_until = target_effective_at");
    expect(migration).toContain("import_commercial_catalog");
    expect(migration).toContain("release activation failed");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
  });

  it("projects promotional free phases without duplicating campaign state", () => {
    expect(migration).toContain("free_period_days");
    expect(migration).toContain("sync_promotion_free_period_days");
    expect(migration).toContain("promotion->>'freePeriodDays'");
  });
});
