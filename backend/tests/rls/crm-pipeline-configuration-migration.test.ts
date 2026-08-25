import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00054_crm_pipeline_configuration.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM pipeline configuration migration", () => {
  it("saves a pipeline and ordered stages in one PostgreSQL transaction", () => {
    expect(migration).toContain("FUNCTION public.save_crm_pipeline");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("CRM_CONFLICT");
    expect(migration).toContain("CRM_STAGE_IN_USE");
    expect(migration).toContain("position = position + 1000");
  });

  it("keeps the mutation behind the server-side service role", () => {
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("SECURITY INVOKER");
  });
});
