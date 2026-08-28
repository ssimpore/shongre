import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/00076_multilingual_search_vectors.sql",
  ),
  "utf8",
);

describe("multilingual search-vector migration", () => {
  it("uses locale-neutral dictionaries across multi-market catalogs", () => {
    expect(migration).toContain("to_tsvector('simple'");
    expect(migration).not.toContain("to_tsvector('french'");
    expect(migration).toContain("search_vector_version");
  });

  it("backfills in bounded repeatable SKIP LOCKED batches", () => {
    expect(migration).toContain("reindex_multilingual_search_batch");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("LEAST(GREATEST(p_limit, 1), 1000)");
  });
});
