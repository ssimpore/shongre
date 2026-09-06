import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00099_auto_favorite_market_scope.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("automotive favorite market scope migration", () => {
  it("publishes its locked compatibility transition atomically", () => {
    expect(migration).toContain("BEGIN;");
    expect(migration).toContain(
      "LOCK TABLE public.auto_vehicle_favorites IN SHARE MODE;",
    );
    expect(migration).toContain("COMMIT;");
  });

  it("partitions favorites by account, vehicle and validated action market", () => {
    expect(migration).toContain(
      "PRIMARY KEY (user_id, vehicle_id, market_code)",
    );
    expect(migration).toContain(
      "WHERE UPPER(BTRIM(candidate.market_code)) = normalized_market_code",
    );
    expect(migration).toContain("vehicle.lifecycle = 'published'");
    expect(migration).toContain("vehicle.moderation_status = 'approved'");
  });

  it("adds idempotent scoped RPCs and keeps the old signature only for rollout", () => {
    expect(migration).toContain(
      "public.list_favorite_auto_vehicle_ids(\n  p_user_id UUID,\n  p_market_code VARCHAR",
    );
    expect(migration).toContain(
      "public.set_auto_vehicle_favorite(\n  p_user_id UUID,\n  p_vehicle_id UUID,\n  p_market_code VARCHAR,\n  p_is_favorite BOOLEAN",
    );
    expect(migration).toContain("RETURN p_is_favorite");
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.toggle_auto_vehicle_favorite(",
    );
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
  });

  it("quarantines every legacy row instead of trusting current market membership", () => {
    expect(migration).toContain("'auto_vehicle'");
    expect(migration).toContain("'market_action_provenance_missing'");
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.auto_vehicle_favorites",
    );
    expect(migration).toContain(
      "AFTER DELETE ON public.auto_vehicles\nFOR EACH ROW\nEXECUTE FUNCTION public.purge_auto_favorite_scope_review()",
    );
    expect(migration).not.toContain(
      "INSERT INTO public.auto_vehicle_market_favorites\nSELECT",
    );
    expect(migration).not.toContain("vehicle.market_codes[1]");
  });
});
