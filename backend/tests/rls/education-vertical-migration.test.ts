import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00030_education_vertical_rename.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Education vertical migration safeguards", () => {
  it("runs transactionally and leaves one canonical business vertical", () => {
    expect(migration).toContain("BEGIN;");
    expect(migration).toContain("COMMIT;");
    expect(migration).toContain("'education','Éducation'");
    expect(migration).toContain(
      "DELETE FROM public.business_verticals WHERE id = 'cours'",
    );
  });

  it("migrates every persisted foreign-key scope without recreating subscriptions", () => {
    for (const table of [
      "monetization_product_commercial_profiles",
      "monetization_product_entitlements",
      "monetization_entitlements",
      "monetization_quote_items",
      "monetization_subscriptions",
      "monetization_usage_records",
      "monetization_trial_consumptions",
      "monetization_complimentary_grants",
    ]) {
      expect(migration).toContain(`UPDATE public.${table}`);
    }
    expect(migration).not.toMatch(
      /INSERT INTO public\.monetization_subscriptions/i,
    );
    expect(migration).not.toMatch(/provider_subscription_id\s*=/i);
    expect(migration).not.toMatch(/price_id\s*=/i);
  });

  it("merges quota usage and preserves append-only evidence guards", () => {
    expect(migration).toContain("entitlement.education.");
    expect(migration).toContain(
      "used_count = public.monetization_usage_counters.used_count + EXCLUDED.used_count",
    );
    for (const trigger of [
      "immutable_quote_items",
      "immutable_monetization_usage_records",
      "immutable_monetization_complimentary_grants",
    ]) {
      expect(migration).toContain(`DISABLE TRIGGER ${trigger}`);
      expect(migration).toContain(`ENABLE TRIGGER ${trigger}`);
    }
  });

  it("keeps historical snapshots while collapsing finance and analytics dimensions", () => {
    expect(migration).not.toMatch(
      /UPDATE public\.commercial_configuration_versions/i,
    );
    expect(migration).toContain("finance_vertical_revenue_attribution");
    expect(migration).toContain("monetization_vertical_subscription_metrics");
    expect(migration).toContain("commission_analytics_daily");
    expect(migration.match(/THEN 'education'/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("moves discovery canonicals while retaining the tutoring and course identities", () => {
    expect(migration).toContain("WHERE type = 'tutoring'");
    expect(migration).toContain("'/education/professeur/' || tutor.slug");
    expect(migration).toContain("UPDATE public.course_offers");
    expect(migration).not.toMatch(/RENAME (?:TABLE|COLUMN).*course/i);
  });
});
