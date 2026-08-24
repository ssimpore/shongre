import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00032_provider_control_plane.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("provider control-plane migration", () => {
  it("separates configuration, routing, health, events and reconciliation", () => {
    for (const table of [
      "provider_runtime_configurations",
      "provider_routing_rules",
      "provider_health_observations",
      "provider_diagnostic_runs",
      "provider_webhook_endpoints",
      "provider_events",
      "provider_circuit_states",
      "provider_reconciliation_runs",
      "provider_configuration_audit",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
  });

  it("stores references and hashes rather than provider secrets or raw payloads", () => {
    expect(migration).toContain("credential_reference TEXT");
    expect(migration).toContain("secret_reference TEXT NOT NULL");
    expect(migration).toContain("payload_hash TEXT NOT NULL");
    expect(migration).not.toMatch(
      /provider_events[\s\S]{0,700}payload\s+JSONB/i,
    );
    expect(migration).not.toContain("secret_value");
  });

  it("denies browser roles and makes evidence immutable", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain(
      "REVOKE ALL ON public.provider_runtime_configurations FROM anon, authenticated",
    );
    expect(migration).toContain(
      "provider operational evidence and audit records are immutable",
    );
  });
});
