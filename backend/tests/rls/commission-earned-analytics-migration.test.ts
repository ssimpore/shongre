import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/00041_commission_earned_analytics.sql",
  ),
  "utf8",
);

describe("earned commission analytics migration", () => {
  it("excludes unearned checkout quotes from revenue and GMV", () => {
    expect(sql).toContain(
      "calculation.state IN ('earned','partially_reversed','reversed')",
    );
    expect(sql).toContain(
      "REVOKE ALL ON public.commission_analytics_daily FROM anon, authenticated",
    );
  });
});
