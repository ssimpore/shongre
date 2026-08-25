import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00062_country_context_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("country context hardening migration", () => {
  it("removes implicit France defaults from country-sensitive writes", () => {
    for (const table of [
      "profiles",
      "organizations",
      "listings",
      "saved_searches",
      "notifications",
      "crm_accounts",
      "crm_contacts",
      "marketing_profiles",
    ]) {
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).toContain("ALTER COLUMN country DROP DEFAULT");
    expect(migration).toContain("ALTER COLUMN market_code DROP DEFAULT");
    expect(migration).not.toContain("SET DEFAULT 'FR'");
  });

  it("ties country columns to the canonical market registry", () => {
    expect(migration).toContain("REFERENCES public.markets(code)");
    expect(migration).toContain("NOT VALID");
    expect(migration).toContain("VALIDATE CONSTRAINT");
  });

  it("retires the legacy notification RPC and optimizes auth policy checks", () => {
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.create_notification_with_deliveries",
    );
    expect(migration).toContain("(SELECT auth.uid())");
    expect(migration).not.toMatch(/auth_user_id\s*=\s*auth\.uid\(\)/);
  });
});
