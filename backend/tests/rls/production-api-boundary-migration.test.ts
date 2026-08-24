import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00038_production_api_boundary.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("production API persistence boundary", () => {
  it("removes direct browser mutations from every public business table", () => {
    expect(migration).toContain("cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')");
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon, authenticated",
    );
    expect(migration).toContain("TO service_role");
  });

  it("removes the provider-bypassing legacy order release function", () => {
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.release_order_escrow(UUID, UUID)",
    );
  });
});
