import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/00025_platform_finance_ledger.sql", import.meta.url)),
  "utf8",
);

describe("platform finance ledger migration safeguards", () => {
  it("creates the canonical finance entities with integer minor units", () => {
    [
      "finance_accounts",
      "finance_transactions",
      "finance_ledger_entries",
      "finance_revenue_schedules",
      "finance_reconciliation_cases",
      "finance_payouts",
      "finance_credit_notes",
    ].forEach((table) => {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`REVOKE ALL ON public.${table} FROM anon, authenticated`);
    });
    expect(migration).not.toMatch(/finance_[a-z_]+[\s\S]{0,200}\bNUMERIC\s*\(/i);
  });

  it("enforces immutable balanced posting and explicit corrections", () => {
    expect(migration).toContain("assert_finance_transaction_balanced");
    expect(migration).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(migration).toContain("posted finance transactions are immutable");
    expect(migration).toContain("reversal_of_transaction_id");
    expect(migration).toContain("idempotency_key VARCHAR(240) NOT NULL UNIQUE");
  });

  it("projects reliable monetization orders and quarantines ambiguous legacy rows", () => {
    expect(migration).toContain("sync_monetization_order_finance");
    expect(migration).toContain("monetization_order_finance_projection");
    expect(migration).toContain("Commande historique sans ventilation fiable");
    expect(migration).toContain("ON CONFLICT (source_table, source_id) DO NOTHING");
  });

  it("recognizes deferred subscription revenue with locking and idempotent entries", () => {
    expect(migration).toContain("recognize_due_finance_revenue");
    expect(migration).toContain("FOR UPDATE OF revenue_schedule SKIP LOCKED");
    expect(migration).toContain("finance-recognition:");
    expect(migration).toContain("'4870','side','debit'");
    expect(migration).toContain("'7062','side','credit'");
    expect(migration).toContain("AT TIME ZONE market.timezone");
    expect(migration).toContain("Europe/Brussels");
  });

  it("separates platform visibility from reconciliation and pricing control", () => {
    expect(migration).toContain("finance.platform.read");
    expect(migration).toContain("finance.reconciliation.manage");
    expect(migration).toContain("finance.account.read.own");
    expect(migration).toContain("finance.organization.read.own");
  });
});
