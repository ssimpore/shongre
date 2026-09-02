import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00093_multi_currency.sql"),
  "utf8",
);

describe("multi-currency migration", () => {
  it("stores exact rates and market-supported currencies", () => {
    expect(migration).toContain("supported_currencies TEXT[]");
    expect(migration).toContain("rate_numerator BIGINT");
    expect(migration).toContain("rate_denominator BIGINT");
    expect(migration).not.toContain("DOUBLE PRECISION");
  });

  it("keeps configuration private and every write auditable", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON public.currency_definitions");
    expect(migration).toContain("currency_configuration_audit");
    expect(migration).toContain("p_actor_id");
    expect(migration).toContain("p_reason");
  });

  it("applies the governed market currency set during approval", () => {
    expect(migration).toContain("apply_approved_market_currencies");
    expect(migration).toContain("default currency must be supported");
    expect(migration).toContain("candidate_snapshot->'supportedCurrencies'");
    expect(migration).toContain("market currencies must exist and be enabled");
  });
});
