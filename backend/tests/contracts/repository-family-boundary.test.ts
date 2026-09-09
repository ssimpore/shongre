import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repositoriesDirectory = fileURLToPath(
  new URL("../../src/infrastructure/database/repositories", import.meta.url),
);

/**
 * A database-mode repository must never inherit from its demo counterpart.
 *
 * `PostgresEmploymentRepository` and `PostgresRealEstateRepository` did. Every
 * public method happened to be overridden, so nothing was wrong in practice —
 * but each construction still built the whole demo fixture graph in memory, and
 * a method added to the demo base without a matching override would have served
 * fixture data in database mode with no compiler error and no test failure.
 * That is exactly the silent substitution the data-mode rule exists to prevent,
 * so the shape is pinned here rather than left to review.
 */
describe("repository family boundary", () => {
  const sources = readdirSync(repositoriesDirectory)
    .filter((file) => file.endsWith(".ts") && !file.includes(".test."))
    .map((file) => ({
      file,
      source: readFileSync(join(repositoriesDirectory, file), "utf8"),
    }));

  it("finds the repository sources it is meant to police", () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it("never extends a demo repository from a database repository", () => {
    const offenders: string[] = [];
    for (const { file, source } of sources) {
      for (const match of source.matchAll(
        /class\s+(Postgres[A-Za-z]*Repository)\s+extends\s+([A-Za-z]+)/g,
      )) {
        const [, className, base] = match;
        if (base.startsWith("Demo"))
          offenders.push(`${file}: ${className} extends ${base}`);
      }
    }
    expect(
      offenders,
      `database repositories must implement their contract, not inherit fixtures:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("declares the shared contract wherever a demo counterpart exists", () => {
    const undeclared: string[] = [];
    for (const { file, source } of sources) {
      // Only dual-mode repositories can silently substitute fixtures. A
      // database-only reader with no demo sibling has nothing to diverge from.
      if (!/class\s+Demo[A-Za-z]*Repository/.test(source)) continue;
      for (const match of source.matchAll(
        /class\s+(Postgres[A-Za-z]*Repository)([^{]*)\{/g,
      )) {
        const [, className, heritage] = match;
        if (!/\bimplements\b/.test(heritage)) {
          undeclared.push(`${file}: ${className}`);
        }
      }
    }
    expect(
      undeclared,
      `these have a demo counterpart but declare no shared contract, so a missing method is not a compile error:\n${undeclared.join("\n")}`,
    ).toEqual([]);
  });
});
