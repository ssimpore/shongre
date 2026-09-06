import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const seed = readFileSync(
  new URL("../../supabase/seed/seed.sql", import.meta.url),
  "utf8",
);
const runner = readFileSync(
  new URL("../../scripts/seed/seed.ts", import.meta.url),
  "utf8",
);

describe("local database seed entrypoint", () => {
  it("seeds current-schema catalogues without replaying historical migrations", () => {
    expect(seed).not.toMatch(/migrations\//);
    expect(seed).toContain("\\ir courses.sql");
    expect(seed).toContain("\\ir auto.sql");
    expect(seed).toContain("\\ir real-estate.sql");
    expect(seed).not.toContain("\\ir taxonomy-v4.generated.sql");
    expect(seed).toContain("taxonomy-db-import");
  });

  it("adds the synthetic database and Storage scenario after reference data", () => {
    expect(runner).toContain("seedLocalDevelopmentData");
    expect(runner.indexOf("runPsqlFile")).toBeLessThan(
      runner.indexOf("await seedLocalDevelopmentData"),
    );
  });
});
