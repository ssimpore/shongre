import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

/**
 * Every map in the product draws on one basemap, created in one place.
 *
 * Five surfaces used to carry their own copy of the renderer's lifecycle, and
 * the copies drifted: two of them disabled the attribution control, removing
 * the OpenStreetMap credit that is a *condition* of using the data. A
 * duplicated lifecycle is how that happens — the sixth map anyone adds inherits
 * whichever copy they paste. So the rule is checked rather than remembered.
 *
 * The renderer changed from Leaflet to MapLibre; the rule did not.
 */

const SOURCE_ROOT = new URL("../../..", import.meta.url).pathname;
const PRIMITIVE = "design-system/primitives/map/MapContainer.tsx";
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
      .filter(({ source }) => /new\s+MapLibreMap\s*\(/.test(source))
      .map(({ path }) => path);
    expect(creators).toEqual([PRIMITIVE]);
  });

  it("resolves the basemap style in exactly one place", () => {
    // A second style URL somewhere else is how a map ends up on a provider that
    // has started demanding an API key while the others have not.
    const resolvers = files
      .filter(({ source }) => /getMapConfig\s*\(\s*\)/.test(source))
      .map(({ path }) => path)
      .filter((path) => path !== "platform/map/map-source.ts");
    expect(resolvers).toEqual([PRIMITIVE]);
  });

  it("never suppresses the attribution the data is licensed on", () => {
    const suppressors = files
      .filter(({ source }) => /attributionControl\s*:\s*false/.test(source))
      .map(({ path }) => path);
    expect(suppressors).toEqual([]);
  });

  it("keeps Leaflet out of the tree entirely", () => {
    // One renderer. Two would mean two basemaps, two attribution stories and
    // two bundles, which is the state this migration removed.
    const leafletUsers = files
      .filter(({ source }) =>
        /from\s+["']leaflet["']|\bL\.(map|marker|tileLayer|divIcon|latLng)\b/.test(
          source,
        ),
      )
      .map(({ path }) => path);
    expect(leafletUsers).toEqual([]);
  });
});
