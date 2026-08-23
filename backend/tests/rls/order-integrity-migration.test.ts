import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00019_order_integrity_and_handover.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("order integrity migration safeguards", () => {
  it("prevents concurrent active orders for one listing", () => {
    expect(migration).toContain("orders_one_active_per_listing_idx");
    expect(migration).toContain(
      "duplicate active orders must be reconciled first",
    );
    expect(migration).toContain("synchronize_listing_order_lifecycle");
  });

  it("uses cryptographic entropy and validates handover PIN format", () => {
    expect(migration).toContain("gen_random_bytes");
    expect(migration).toContain("orders_handover_pin_format_check");
    expect(migration).not.toMatch(/FLOOR\s*\(\s*RANDOM\s*\(/i);
  });

  it("protects durable listing drafts with RLS", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.listing_drafts",
    );
    expect(migration).toContain(
      "ALTER TABLE public.listing_drafts ENABLE ROW LEVEL SECURITY",
    );
    expect(migration).toContain(
      'CREATE POLICY "Users manage their own listing draft"',
    );
  });

  it("keeps stateful user actions atomic and service-role scoped", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("toggle_favorite");
    expect(migration).toContain("mark_conversation_read");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.toggle_favorite(UUID, UUID) TO service_role",
    );
  });
});
