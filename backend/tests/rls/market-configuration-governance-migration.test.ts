import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/00075_market_configuration_governance.sql",
  ),
  "utf8",
);

describe("market configuration governance migration", () => {
  it("requires optimistic versioning, a reason and four-eyes review", () => {
    expect(migration).toContain("base_version");
    expect(migration).toContain("market configuration version conflict");
    expect(migration).toContain("four-eyes approval required");
    expect(migration).toContain("length(trim(reason)) >= 8");
  });

  it("applies the snapshot and immutable audit in one approval function", () => {
    expect(migration).toContain("approve_market_configuration_change");
    expect(migration).toContain(
      "INSERT INTO public.market_configuration_audit",
    );
    expect(migration).toContain("before_snapshot");
    expect(migration).toContain("approval_actor_id");
  });
});
