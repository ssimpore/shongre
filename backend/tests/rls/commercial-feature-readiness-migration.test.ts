import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00028_commercial_feature_readiness.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("commercial feature readiness migration safeguards", () => {
  it("normalizes feature truth from immutable configuration snapshots", () => {
    for (const column of [
      "description",
      "feature_type",
      "availability",
      "implementation_status",
      "dependencies",
      "admin_help_text",
    ]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    }
    expect(migration).toContain("sync_commercial_entitlement_metadata");
    expect(migration).toContain("configuration.snapshot->'products'");
    expect(migration).toContain(
      "implementation_status IN ('ready', 'incomplete', 'external_dependency')",
    );
    expect(migration).toContain(
      "availability IN ('enabled', 'beta', 'maintenance', 'disabled')",
    );
    expect(migration).toContain(
      "monetization_product_entitlements_readiness_idx",
    );
  });

  it("filters every grant path to operational entitlements", () => {
    expect(migration).toContain("sync_monetization_subscription_plan_change");
    expect(migration).toContain("grant_subscription_recurring_credits");
    expect(migration).toContain("grant_complimentary_plan");
    expect(migration.match(/implementation_status = 'ready'/g)).toHaveLength(3);
    expect(
      migration.match(/availability IN \('enabled', 'beta'\)/g),
    ).toHaveLength(3);
  });

  it("fulfills paid listing placements once and revokes refunded orders", () => {
    expect(migration).toContain("fulfill_listing_promotion_order");
    expect(migration).toContain("quote.quote_snapshot->>'listingId'");
    expect(migration).toContain("source_order_id");
    expect(migration).toContain(
      "ON CONFLICT (listing_id, product_id, source_order_id)",
    );
    expect(migration).toContain("NEW.status IN ('refunded', 'cancelled')");
    expect(migration).toContain("AFTER INSERT OR UPDATE OF status");
    for (const productId of [
      "premium.urgent",
      "premium.search_bump",
      "premium.highlight",
      "premium.spotlight",
    ]) {
      expect(migration).toContain(`'${productId}'`);
    }
  });
});
