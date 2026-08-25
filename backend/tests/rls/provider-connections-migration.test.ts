import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/00052_provider_connections.sql", import.meta.url),
  "utf8",
);

describe("shared provider connections migration", () => {
  it("keeps credentials separate from browser-readable configuration", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.provider_connections");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.provider_credentials");
    expect(migration).toContain("REVOKE ALL ON public.provider_credentials FROM anon, authenticated");
    expect(migration).toContain("secret_reference TEXT");
    expect(migration).not.toContain("secret_value");
  });

  it("supports platform, tenant and user ownership with deny-by-default policy", () => {
    expect(migration).toContain("owner_type IN ('PLATFORM','TENANT','USER')");
    expect(migration).toContain("CREATE POLICY provider_connections_tenant_isolation");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("allow_platform_fallback BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("allow_personal_connections BOOLEAN NOT NULL DEFAULT FALSE");
  });

  it("makes usage and audit evidence immutable", () => {
    expect(migration).toContain("provider usage and audit history is immutable");
    expect(migration).toContain("provider_usage_events_immutable");
    expect(migration).toContain("provider_connection_audit_immutable");
  });
});
