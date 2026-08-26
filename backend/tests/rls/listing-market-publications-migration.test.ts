import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00063_listing_market_publications.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("listing market publications migration", () => {
  it("models one shared listing with explicit market-scoped state", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.listing_market_publications");
    expect(migration).toContain("PRIMARY KEY (listing_id, market_code)");
    expect(migration).toContain("listing_market_one_primary_idx");
    expect(migration).toContain("price_minor BIGINT");
    expect(migration).toContain("available_services JSONB");
    expect(migration).not.toContain("fr_listings");
    expect(migration).not.toContain("be_listings");
  });

  it("backfills legacy data without assuming two decimal places", () => {
    expect(migration).toContain("'XOF'");
    expect(migration).toContain("listing.price * 1000");
    expect(migration).toContain("ALTER COLUMN currency DROP DEFAULT");
    expect(migration).toContain("ALTER COLUMN market_code DROP DEFAULT");
  });

  it("uses deny-by-default RLS with ownership and admin checks", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("status = 'active'");
    expect(migration).toContain("compliance_state = 'approved'");
    expect(migration).toContain("profile.auth_user_id = (SELECT auth.uid())");
    expect(migration).toContain("public.is_admin()");
  });
});
