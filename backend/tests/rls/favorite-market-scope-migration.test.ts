import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00098_favorite_market_scope.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("favorite market scope migration", () => {
  it("creates an authoritative account, listing and action-market relation", () => {
    expect(migration).toContain(
      "PRIMARY KEY (user_id, listing_id, market_code)",
    );
    expect(migration).toContain(
      "market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code)",
    );
    expect(migration).toContain(
      "publication.market_code = normalized_market_code",
    );
    expect(migration).toContain("publication.status = 'active'");
    expect(migration).toContain("publication.compliance_state = 'approved'");
  });

  it("uses idempotent market-scoped RPCs while retaining a draining compatibility path", () => {
    expect(migration).toContain(
      "public.list_favorite_listing_ids(\n  p_user_id UUID,\n  p_market_code VARCHAR",
    );
    expect(migration).toContain(
      "public.set_favorite(\n  p_user_id UUID,\n  p_listing_id UUID,\n  p_market_code VARCHAR,\n  p_is_favorite BOOLEAN",
    );
    expect(migration).toContain("RETURN p_is_favorite");
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.toggle_favorite(",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.set_favorite(UUID, UUID, VARCHAR, BOOLEAN)",
    );
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(migration).toContain(
      "'favorite:' || p_user_id::TEXT || ':' || p_listing_id::TEXT",
    );
  });

  it("quarantines every unscoped legacy row instead of inventing an action market", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.favorite_market_scope_review",
    );
    expect(migration).toContain("'market_action_provenance_missing'");
    expect(migration).toContain(
      "ON CONFLICT (favorite_kind, user_id, resource_id) DO NOTHING",
    );
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.favorites FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "AFTER DELETE ON public.listings\nFOR EACH ROW\nEXECUTE FUNCTION public.purge_listing_favorite_scope_review()",
    );
    expect(migration).not.toContain(
      "INSERT INTO public.listing_market_favorites\nSELECT",
    );
    expect(migration).not.toContain("SET market_code = listing.market_code");
  });
});
