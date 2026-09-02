import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00094_market_scoped_listing_drafts.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("market-scoped listing draft migration", () => {
  it("partitions drafts by account and market without dropping legacy data", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS market_code");
    expect(migration).toContain("draft_data ->> 'marketCode'");
    expect(migration).toContain("PRIMARY KEY (user_id, market_code)");
    expect(migration).toContain("REFERENCES public.markets(code)");
    expect(migration).not.toMatch(/DROP TABLE|TRUNCATE/i);
  });
});
