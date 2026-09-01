import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00088_solution_catalog.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("solution catalog migration", () => {
  it("stores definitions once with explicit market associations", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.solutions");
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.solution_markets",
    );
    expect(migration).toContain("REFERENCES public.markets(code)");
    expect(migration).toContain(
      "Production intentionally receives no catalog seed from the frontend demo.",
    );
  });

  it("keeps writes transactional, idempotent and audit-backed", () => {
    expect(migration).toContain("mutate_solution_catalog");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("solution_mutation_receipts");
    expect(migration).toContain("solution_lifecycle_history");
    expect(migration).toContain("INSERT INTO public.audit_logs");
  });

  it("denies browser roles and exposes only service-role RPC access", () => {
    expect(migration.match(/ENABLE ROW LEVEL SECURITY/g)?.length).toBe(5);
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("TO service_role");
  });
});
