import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00024_monetization_lifecycle.sql",
    import.meta.url,
  ),
  "utf8",
);

const atomicTransitionMigration = readFileSync(
  new URL(
    "../../supabase/migrations/00087_atomic_subscription_catalog_transitions.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("monetization lifecycle migration safeguards", () => {
  it("creates the operational billing and lifecycle entities", () => {
    for (const table of [
      "monetization_billing_customers",
      "monetization_subscription_items",
      "monetization_payments",
      "monetization_invoices",
      "monetization_refunds",
      "monetization_credit_transactions",
      "monetization_usage_records",
      "monetization_subscription_events",
      "monetization_tax_rules",
      "monetization_usage_limits",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `REVOKE ALL ON public.${table} FROM anon, authenticated`,
      );
    }
  });

  it("keeps evidence ledgers append-only and credit consumption atomic", () => {
    expect(migration).toContain("immutable_monetization_invoice_lines");
    expect(migration).toContain("immutable_monetization_credit_transactions");
    expect(migration).toContain("immutable_monetization_usage_records");
    expect(migration).toContain("immutable_monetization_subscription_events");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("insufficient % credits");
  });

  it("restricts lifecycle transitions and makes jobs idempotent", () => {
    expect(migration).toContain("invalid subscription transition");
    expect(migration).toContain("transition_monetization_subscription");
    expect(migration).toContain("run_monetization_maintenance");
    expect(migration).toContain("ON CONFLICT DO NOTHING");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
  });

  it("reconciles orders, payments, refunds and invoices", () => {
    expect(migration).toContain("monetization_reconciliation");
    expect(migration).toContain("captured_minor");
    expect(migration).toContain("refunded_minor");
    expect(migration).toContain("invoiced_minor");
    expect(migration).toContain("reconciliation_status");
  });

  it("uses granular capabilities and deduplicated lifecycle notifications", () => {
    expect(migration).toContain("monetization.refunds.approve");
    expect(migration).toContain("monetization.credits.adjust");
    expect(migration).toContain("notifications_subscription_event_once_idx");
    expect(migration).toContain("subscription.cancellation_scheduled");
    expect(migration).toContain("subscription.trial_ending");
  });

  it("serializes catalog-backed plan changes in one authorized transaction", () => {
    expect(atomicTransitionMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.apply_monetization_subscription_change",
    );
    expect(atomicTransitionMigration).toContain("FOR UPDATE");
    expect(atomicTransitionMigration).toContain("stale subscription state");
    expect(atomicTransitionMigration).toContain("organization_members");
    expect(atomicTransitionMigration).toContain(
      "AND idempotency_key = p_idempotency_key",
    );
    expect(atomicTransitionMigration).toContain(
      "CREATE TRIGGER sync_monetization_subscription_plan_change",
    );
  });

  it("retains exact catalog evidence and fails closed on payment failure", () => {
    for (const field of [
      "configuration_version_id",
      "product_version_id",
      "market_code",
      "currency",
      "scheduled_configuration_version_id",
    ]) {
      expect(atomicTransitionMigration).toContain(field);
    }
    expect(atomicTransitionMigration).toContain(
      "hydrate_monetization_subscription_catalog_evidence",
    );
    expect(atomicTransitionMigration).toContain(
      "apply_monetization_payment_failure_policy",
    );
    expect(atomicTransitionMigration).toContain(
      "enforce_monetization_payment_failure_access",
    );
  });
});
