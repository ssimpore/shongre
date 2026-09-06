import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00097_listing_promotion_market_scope.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("listing promotion market scope migration", () => {
  it("binds promotion evidence to an exact listing publication", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS market_code VARCHAR(2)",
    );
    expect(migration).toContain("listing_promotions_market_publication_fk");
    expect(migration).toContain(
      "REFERENCES public.listing_market_publications(listing_id, market_code)",
    );
    expect(migration).toContain(
      "promotion source market does not match target publication",
    );
    expect(migration).toContain("promotion source evidence is immutable");
    expect(migration).toContain("promotion market is immutable once resolved");
  });

  it("uses immutable source evidence and fails closed for ambiguous history", () => {
    expect(migration).toContain(
      "COALESCE(order_row.market_code, quote.market_code)",
    );
    expect(migration).toContain("configuration.market_code");
    expect(migration).toContain("source_market_conflict");
    expect(migration).toContain("HAVING COUNT(*) = 1");
    expect(migration).toMatch(
      /SET status = 'failed',[\s\S]*WHERE market_code IS NULL[\s\S]*status IN \('scheduled', 'active'\)/,
    );
    expect(migration).not.toMatch(/COALESCE\([^)]*'FR'/);
  });

  it("refreshes only the requested market publication", () => {
    expect(migration).toContain("refresh_listing_market_effective_promotion");
    expect(migration).toContain(
      "promotion.market_code = normalized_market_code",
    );
    expect(migration).toContain("publication.status = 'active'");
    expect(migration).toContain("publication.compliance_state = 'approved'");
    expect(migration).toContain("IF primary_publication THEN");
  });

  it("keeps the public publication projection backend managed", () => {
    expect(migration).toContain(
      "listing_market_effective_promotion_shape_check",
    );
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE public.listing_market_publications",
    );
    expect(migration).toContain(
      "GRANT INSERT, UPDATE, DELETE ON TABLE public.listing_market_publications",
    );
    expect(migration).toContain("TO service_role");
    expect(migration).not.toContain(
      "ADD COLUMN IF NOT EXISTS promotion_source_id",
    );
  });

  it("keeps the one-argument refresh function for rollback compatibility", () => {
    expect(migration).toMatch(
      /refresh_listing_effective_promotion\(\s*p_listing_id UUID\s*\)/,
    );
    expect(migration).toContain(
      "refresh_listing_promotion_after_publication_change_trigger",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.refresh_listing_market_effective_promotion(UUID, VARCHAR)",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.refresh_listing_effective_promotion(UUID)",
    );
  });
});
