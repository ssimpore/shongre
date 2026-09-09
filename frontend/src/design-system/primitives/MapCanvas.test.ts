import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

/**
 * Every map in the product draws on one basemap, created in one place.
 *
 * Five surfaces used to carry their own copy of the Leaflet lifecycle, and the
 * copies drifted: two of them passed `attributionControl: false`, removing the
 * OpenStreetMap credit that is a *condition* of using those tiles. A duplicated
 * lifecycle is how that happens — the sixth map anyone adds inherits whichever
 * copy they paste. So the rule is checked rather than remembered.
 */

const SOURCE_ROOT = new URL("../..", import.meta.url).pathname;
const PRIMITIVE = "design-system/primitives/MapCanvas.tsx";
const CODE = new Set([".ts", ".tsx"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return CODE.has(extname(entry)) ? [full] : [];
  });
}

/**
 * Comments are stripped before matching, because the rule is about what the
 * code does — this file and the primitive both *describe* the mistake, and a
 * check that cannot tell an explanation from an instance is a check that has
 * to be silenced the first time someone documents the thing it forbids.
 */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const files = sourceFiles(SOURCE_ROOT)
  .map((path) => ({
    path: path.slice(SOURCE_ROOT.length),
    source: readFileSync(path, "utf8"),
  }))
  .filter(({ path }) => !/\.test\.tsx?$/.test(path))
  .map((file) => ({ ...file, source: withoutComments(file.source) }));

describe("map lifecycle", () => {
  it("is created in exactly one place", () => {
    const creators = files
      .filter(({ source }) => /\bL\.map\s*\(/.test(source))
      .map(({ path }) => path);
    expect(creators).toEqual([PRIMITIVE]);
  });

  it("adds the basemap tiles in exactly one place", () => {
    // A second tile layer somewhere else is how a map ends up on a provider
    // that has started demanding an API key while the others have not.
    const layers = files
      .filter(({ source }) => /\bL\.tileLayer\s*\(/.test(source))
      .map(({ path }) => path);
    expect(layers).toEqual([PRIMITIVE]);
  });

  it("never suppresses the attribution the tiles are licensed on", () => {
    const suppressors = files
      .filter(({ source }) => /attributionControl\s*:\s*false/.test(source))
      .map(({ path }) => path);
    expect(suppressors).toEqual([]);
  });

  it("states the attribution requirement where the map is built", () => {
    const primitive = files.find(({ path }) => path === PRIMITIVE);
    expect(primitive).toBeDefined();
    expect(primitive!.source).toContain("attributionControl: true");
  });
});
