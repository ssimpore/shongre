import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00020_foreign_key_indexes.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("foreign-key index migration", () => {
  it("covers every unindexed public foreign key with all key columns", () => {
    expect(migration).toContain("constraint_row.contype = 'f'");
    expect(migration).toContain(
      "constraint_row.connamespace = 'public'::REGNAMESPACE",
    );
    expect(migration).toContain("CARDINALITY(constraint_row.conkey)");
    expect(migration).toContain("UNNEST(foreign_key.conkey) WITH ORDINALITY");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS");
  });
});
