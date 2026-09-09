/// <reference types="node" />

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveLayoutColumns } from "@shongre/design-tokens";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) =>
  readFileSync(path.join(root, relative), "utf8");

/**
 * Card grids are the surface where a native app most visibly fails to be an
 * iPad app: a single column stretched to 1024pt. These screens are the three
 * that render listing cards, and each has to widen with the window rather than
 * assume a phone.
 */
const LISTING_GRID_SCREENS = [
  "app/(tabs)/index.tsx",
  "app/(tabs)/search.tsx",
  "app/account/favorites.tsx",
] as const;

describe("adaptive native layout", () => {
  it.each(LISTING_GRID_SCREENS)("%s widens its listing grid", (screen) => {
    const source = read(screen);
    expect(source).toContain("useLayoutMode");
    expect(source).toContain("numColumns={columns}");
    // React Native cannot change a list's column count in place, so the count
    // has to be part of the list's identity or a rotation renders a broken grid.
    expect(source).toMatch(/key=\{`[a-z-]+-\$\{columns\}`\}/);
    expect(source).toContain("columnWrapperStyle={columns > 1 ? styles.row");
  });

  it("reads the window rather than sampling it once", () => {
    const hook = read("src/hooks/useLayoutMode.ts").replace(
      /\/\*[\s\S]*?\*\/|\/\/.*/g,
      "",
    );
    expect(hook).toContain("useWindowDimensions");
    // A one-off `Dimensions.get` does not re-render on rotation, which is the
    // exact case this hook exists to handle.
    expect(hook).not.toContain("Dimensions.get");
  });

  it("gives a phone one column and a tablet more", () => {
    expect(resolveLayoutColumns(390)).toBe(1);
    expect(resolveLayoutColumns(820)).toBeGreaterThan(1);
    expect(resolveLayoutColumns(1366)).toBeGreaterThan(
      resolveLayoutColumns(820),
    );
  });
});
