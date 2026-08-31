import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00085_commercial_governance_and_target_catalog.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("commercial governance migration safeguards", () => {
  it("projects the immutable catalog governance arrays without activating v4", () => {
    for (const table of [
      "commercial_plan_migration_mappings",
      "commercial_price_protection_policies",
      "commercial_campaigns",
      "commercial_economics",
      "commercial_provider_mappings",
      "commercial_paid_placement_policies",
      "commercial_offer_definitions",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `REVOKE ALL ON public.${table} FROM anon,authenticated`,
      );
    }
    expect(migration).toContain("sync_commercial_governance_snapshot");
    expect(migration).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(migration).toContain("this migration never changes the active v3");
    expect(migration).not.toMatch(
      /commercial-fr-v4-draft[\s\S]{0,300}'active'/i,
    );
  });

  it("stores environment-scoped provider ids without credential columns", () => {
    expect(migration).toContain("environment VARCHAR(30) NOT NULL");
    expect(migration).toContain("market_code VARCHAR(2) NOT NULL");
    expect(migration).toContain("external_reference_id VARCHAR(300)");
    expect(migration).toContain("commercial_provider_mapping_health_idx");
    const tableStart = migration.indexOf(
      "CREATE TABLE IF NOT EXISTS public.commercial_provider_mappings",
    );
    const providerTable = migration.slice(
      tableStart,
      migration.indexOf("\n);", tableStart),
    );
    expect(providerTable).not.toMatch(/(?:secret|access_token|refresh_token)/i);
  });

  it("makes price-protection evidence append-only and idempotent", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.monetization_price_protection_records",
    );
    expect(migration).toContain("idempotency_key VARCHAR(240) NOT NULL UNIQUE");
    expect(migration).toContain("grant_monetization_price_protection");
    expect(migration).toContain("customer acceptance required");
    expect(migration).toContain("commercial evidence is append-only");
  });

  it("requires independent enterprise approval and freezes accepted terms", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.enterprise_commercial_contracts",
    );
    expect(migration).toContain("approved_by <> created_by");
    expect(migration).toContain("customer_accepted_at IS NOT NULL");
    expect(migration).toContain("protect_accepted_enterprise_contract");
    expect(migration).toContain(
      "accepted enterprise contract terms are immutable",
    );
  });

  it("uses integer minor units and basis points for financial truth", () => {
    expect(migration).toContain("direct_cost_minor BIGINT");
    expect(migration).toContain("locked_amount_minor BIGINT");
    expect(migration).toContain("margin_floor_bps INT");
    expect(migration).not.toMatch(/\b(?:REAL|DOUBLE PRECISION|MONEY)\b/i);
  });

  it("projects each campaign field exactly once", () => {
    const campaignProjection = migration.slice(
      migration.indexOf("INSERT INTO public.commercial_campaigns"),
      migration.indexOf("INSERT INTO public.commercial_economics"),
    );
    expect(
      campaignProjection.match(/item->'eligibleVerticalIds'/g),
    ).toHaveLength(1);
    expect(campaignProjection).toContain(
      "NULLIF(item->>'maximumVerticals','')::INT",
    );
  });
});
