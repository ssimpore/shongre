import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00116_notification_market_rpc_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("notification market RPC hardening migration", () => {
  it("removes the pre-market overload reintroduced by delivery", () => {
    expect(migration).toMatch(
      /DROP FUNCTION IF EXISTS public\.create_notification_with_deliveries\([\s\S]*UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT\[\], TIMESTAMPTZ/,
    );
  });

  it("requires an enabled market and a safe internal route", () => {
    expect(migration).toContain("p_market_code TEXT");
    expect(migration).toContain("FROM public.markets");
    expect(migration).toContain("invalid notification market");
    expect(migration).toContain("left(btrim(p_link_route), 2) = '//'");
    expect(migration).toContain("upper(btrim(p_market_code))");
  });

  it("keeps delivery opportunity notifications and least-privilege grants", () => {
    expect(migration).toContain("'delivery_opportunities'");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
