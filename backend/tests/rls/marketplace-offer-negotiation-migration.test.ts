import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00049_marketplace_offer_negotiation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("marketplace offer negotiation migration", () => {
  it("models money and state explicitly with one pending offer per conversation", () => {
    expect(migration).toContain("amount_minor BIGINT NOT NULL");
    expect(migration).toContain("currency VARCHAR(3) NOT NULL");
    expect(migration).toContain(
      "marketplace_offers_one_pending_per_conversation_idx",
    );
    expect(migration).toContain("WHERE status = 'pending'");
  });

  it("serializes create, response, and withdrawal transitions", () => {
    expect(migration).toContain("create_marketplace_offer");
    expect(migration).toContain("respond_marketplace_offer");
    expect(migration).toContain("withdraw_marketplace_offer");
    expect(migration.match(/FOR UPDATE/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("only the recipient may respond");
    expect(migration).toContain("only the creator may withdraw");
  });

  it("keeps an immutable audit trail and server-only write boundary", () => {
    expect(migration).toContain("marketplace_offer_events");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SET search_path = ''");
  });
});
