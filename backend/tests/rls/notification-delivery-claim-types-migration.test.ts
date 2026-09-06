import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00103_notification_delivery_claim_types.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("notification delivery claim type migration", () => {
  it("casts bounded notification columns to the RPC's declared text types", () => {
    expect(migration).toContain("n.title::TEXT");
    expect(migration).toContain("n.market_code::TEXT");
    expect(migration).toContain("n.type::TEXT");
  });

  it("preserves atomic leasing and server-only execution", () => {
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
