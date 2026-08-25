import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00061_multi_country_platform.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("multi-country platform migration", () => {
  it("stores routing and policy configuration for all initial target markets", () => {
    for (const code of ["FR", "BE", "CH", "SN", "BF"]) {
      expect(migration).toContain(`('${code}'`);
    }
    for (const column of [
      "primary_domain",
      "base_path",
      "launch_status",
      "supported_locales",
      "marketplace_policy",
      "payment_policy",
      "tax_policy",
      "compliance_policy",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("markets_domain_path_unique_idx");
  });

  it("keeps shared entities global and models only their market availability", () => {
    expect(migration).toContain("category_market_availability");
    expect(migration).toContain("organization_markets");
    expect(migration).toContain("store_markets");
    expect(migration).not.toContain("fr_categories");
    expect(migration).not.toContain("be_listings");
  });

  it("protects one-use domain handoffs behind forced RLS and a service-only RPC", () => {
    expect(migration).toContain("auth_domain_handoffs");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("consume_auth_domain_handoff");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.consume_auth_domain_handoff(TEXT) FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.consume_auth_domain_handoff(TEXT) TO service_role",
    );
  });

  it("carries market and internal route through notification delivery", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS market_code");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS link_route");
    expect(migration).toContain("p_market_code TEXT");
    expect(migration).toContain("p_link_route TEXT");
    expect(migration).toContain("n.market_code::TEXT");
    expect(migration).toContain("TO service_role");
  });
});
