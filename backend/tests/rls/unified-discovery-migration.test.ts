import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00018_unified_catalog_discovery.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("unified discovery migration safeguards", () => {
  it("enforces canonical ownership and organization authorization", () => {
    expect(migration).toContain("listings_effective_owner_check");
    expect(migration).toContain("enforce_listing_publisher_integrity");
    expect(migration).toContain("publisher lacks organization permission");
    expect(migration).toContain("listing_ownership_audit");
  });

  it("keeps paid promotion separate from genuine freshness", () => {
    expect(migration).toContain("organic_freshness_at");
    expect(migration).toContain("sync_listing_promotions_from_order");
    expect(migration).toContain("purchase.status = 'paid'");
    expect(migration).not.toMatch(
      /SET\s+created_at\s*=\s*(?:NOW\(\)|promotion)/i,
    );
  });

  it("enables RLS on every new operational and analytics table", () => {
    for (const table of [
      "organization_members",
      "listing_ownership_audit",
      "listing_promotions",
      "discovery_configuration_versions",
      "listing_duplicate_reviews",
      "discovery_search_events",
      "promotion_impressions",
    ]) {
      expect(migration).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
    }
  });

  it("validates, versions and audits administrator ranking changes", () => {
    expect(migration).toContain("publish_discovery_configuration_version");
    expect(migration).toContain(
      "organic weights must contain eight signals and sum to one",
    );
    expect(migration).toContain(
      "sponsored policy must preserve useful organic results",
    );
    expect(migration).toContain("'discovery_configuration'");
    expect(migration).toContain("pg_advisory_xact_lock");
  });
});
