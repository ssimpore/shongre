import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00147_discovery_collection_inventory.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("discovery collection inventory migration", () => {
  it("keeps the batch bounded, market scoped, and restricted to service role", () => {
    expect(migration).toMatch(/jsonb_array_length\(p_groups\) > 100/);
    expect(migration).toMatch(/publication\.market_code = p_market_code/);
    expect(migration).toMatch(/publication\.status = 'active'/);
    expect(migration).toMatch(/publication\.compliance_state = 'approved'/);
    expect(migration).toMatch(/listing\.status = 'published'/);
    expect(migration).toMatch(/SECURITY DEFINER/);
    expect(migration).toMatch(/SET search_path = ''/);
    expect(migration).toMatch(/FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/TO service_role/);
  });

  it("returns an exact count and a deterministic public-media cover", () => {
    expect(migration).toMatch(/COUNT\(DISTINCT eligible\.listing_id\)/);
    expect(migration).toMatch(/JOIN public\.listing_media media/);
    expect(migration).toMatch(/eligible\.sort_date DESC/);
    expect(migration).toMatch(/media\.is_primary DESC/);
    expect(migration).toMatch(/listing_media_listing_display_idx/);
  });
});
