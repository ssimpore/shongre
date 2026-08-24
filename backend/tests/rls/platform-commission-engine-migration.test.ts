import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00029_platform_commission_engine.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("platform commission engine migration safeguards", () => {
  it("normalizes policies while retaining the immutable commercial snapshot", () => {
    expect(migration).toContain("commission_policy_versions");
    expect(migration).toContain("commission_rule_versions");
    expect(migration).toContain("commercial_configuration_sync_commissions");
    expect(migration).toContain("configuration_version_id");
  });

  it("stores append-only calculations and reversals in integer minor units", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.commission_calculations",
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.commission_reversals",
    );
    expect(migration).toContain("commission financial history is immutable");
    expect(migration).toContain("idempotency_key VARCHAR(240)");
    expect(migration).toContain("enforce_commission_reversal_balance");
    expect(migration).toContain(
      "cumulative commission reversal exceeds original base",
    );
    expect(migration).not.toMatch(
      /commission_(?:calculations|reversals)[\s\S]{0,600}\bNUMERIC\s*\(/i,
    );
  });

  it("projects commission and refund entries into the existing balanced ledger", () => {
    expect(migration).toContain("post_commission_calculation_to_ledger");
    expect(migration).toContain("post_commission_reversal_to_ledger");
    for (const account of ["'7064'", "'4457'", "'4670'", "'7091'"]) {
      expect(migration).toContain(account);
    }
    expect(migration).toContain("'commission-ledger:' || target.id");
    expect(migration).not.toContain("reversal_of_transaction_id");
  });

  it("denies browser roles and exposes indexed finance analytics", () => {
    for (const table of [
      "commission_policy_versions",
      "commission_rule_versions",
      "commission_calculations",
      "commission_reversals",
    ]) {
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `REVOKE ALL ON public.${table} FROM anon, authenticated`,
      );
    }
    expect(migration).toContain("commission_rule_scope_gin_idx");
    expect(migration).toContain("commission_analytics_daily");
    expect(migration).toContain("effective_take_rate_bps");
  });

  it("contracts the duplicate Courses rate only after legacy policy backfill", () => {
    const backfill = migration.indexOf("Expand/backfill");
    const drop = migration.indexOf("DROP COLUMN IF EXISTS commission_rate_bps");
    expect(backfill).toBeGreaterThan(0);
    expect(drop).toBeGreaterThan(backfill);
    expect(migration).toContain("commission.courses.fr");
    expect(migration).toContain("commission-policy-courses-fr");
  });
});
