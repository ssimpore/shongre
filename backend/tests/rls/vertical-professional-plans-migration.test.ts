import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00026_vertical_professional_plans.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("vertical professional plans migration safeguards", () => {
  it("normalizes verticals, plan profiles, transitions and scoped grants", () => {
    for (const table of [
      "business_verticals",
      "monetization_product_commercial_profiles",
      "monetization_plan_transitions",
      "monetization_trial_consumptions",
      "monetization_complimentary_grants",
      "monetization_complimentary_grant_requests",
      "monetization_complimentary_grant_approvals",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `REVOKE ALL ON public.${table} FROM anon,authenticated`,
      );
    }
    expect(migration).toContain("merge_policy");
    expect(migration).toContain("vertical_id");
    expect(migration).toContain("family_id");
  });

  it("claims one trial per account and family atomically", () => {
    expect(migration).toContain("UNIQUE (account_id, family_id)");
    expect(migration).toContain("claim_monetization_trial");
    expect(migration).toContain("ON CONFLICT (account_id,family_id) DO NOTHING");
    expect(migration).toContain("RETURNS BOOLEAN");
  });

  it("requires four-eyes approval and immutable evidence for grants", () => {
    expect(migration).toContain("CHECK (granted_by <> approved_by)");
    expect(migration).toContain("four-eyes approval required");
    expect(migration).toContain("immutable_monetization_complimentary_grants");
    expect(migration).toContain("decide_complimentary_plan_request");
    expect(migration).toContain("request_complimentary_plan");
    expect(migration).toContain("monetization.complimentary_grants.create");
    expect(migration).toContain(
      "('staff_role','owner','monetization.complimentary_grants.create')",
    );
  });

  it("projects vertical subscription and finance attribution views", () => {
    expect(migration).toContain("monetization_vertical_subscription_metrics");
    expect(migration).toContain("finance_vertical_revenue_attribution");
    expect(migration).toContain("net_revenue_minor");
    expect(migration).toContain("converted_accounts");
  });

  it("synchronizes normalized metadata after catalog publication", () => {
    expect(migration).toContain("sync_vertical_plan_catalog_metadata");
    expect(migration).toContain("sync_vertical_plan_transitions");
    expect(migration).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(migration).toContain(
      "UPDATE public.commercial_configuration_versions SET snapshot = snapshot",
    );
  });

  it("moves entitlements atomically when a subscription plan changes", () => {
    expect(migration).toContain(
      "sync_monetization_subscription_plan_change",
    );
    expect(migration).toContain("status = 'revoked'");
    expect(migration).toContain(
      "ON CONFLICT (source_order_id,product_id,entitlement_key) DO UPDATE",
    );
    expect(migration).toContain(
      "AFTER UPDATE OF product_id,product_version_id,price_id",
    );
  });

  it("grants included credits through the append-only ledger", () => {
    expect(migration).toContain("grant_subscription_recurring_credits");
    expect(migration).toContain("grant_due_subscription_recurring_credits");
    expect(migration).toContain(
      "record_monetization_credit_transaction",
    );
    expect(migration).toContain("subscription-credit:");
  });
});
