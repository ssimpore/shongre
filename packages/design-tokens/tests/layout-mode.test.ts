import { describe, expect, it } from "vitest";
import {
  LAYOUT_MODE_COLUMNS,
  LAYOUT_MODE_MIN_WIDTH,
  resolveLayoutColumns,
  resolveLayoutMode,
} from "../src/breakpoints";
import { themeBreakpoints } from "../src/theme";

describe("layout modes", () => {
  it("derives its thresholds from the shared breakpoint scale", () => {
    expect(LAYOUT_MODE_MIN_WIDTH.regular).toBe(
      Number.parseFloat(themeBreakpoints.md) * 16,
    );
    expect(LAYOUT_MODE_MIN_WIDTH.expanded).toBe(
      Number.parseFloat(themeBreakpoints.lg) * 16,
    );
  });

  it.each([
    ["iPhone SE portrait", 375, "compact"],
    ["iPhone 14 portrait", 390, "compact"],
    ["just below the tablet threshold", 767, "compact"],
    ["iPad mini portrait", 768, "regular"],
    ["iPad Air portrait", 820, "regular"],
    ["iPhone 14 Pro Max landscape", 932, "regular"],
    ["iPad Pro 11 landscape", 1194, "expanded"],
    ["iPad Pro 12.9 landscape", 1366, "expanded"],
  ])("puts %s (%ipx) in the %s band", (_name, width, expected) => {
    expect(resolveLayoutMode(width)).toBe(expected);
  });

  it("falls back to compact for a width the platform has not reported yet", () => {
    for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(resolveLayoutMode(width)).toBe("compact");
    }
  });

  it("never returns fewer than one column", () => {
    for (const columns of Object.values(LAYOUT_MODE_COLUMNS)) {
      expect(columns).toBeGreaterThanOrEqual(1);
    }
    expect(resolveLayoutColumns(320)).toBe(1);
    expect(resolveLayoutColumns(834)).toBe(2);
    expect(resolveLayoutColumns(1280)).toBe(3);
  });

  it("widens monotonically, so a rotation never loses a column", () => {
    let previous = 0;
    for (let width = 200; width <= 1600; width += 4) {
      const columns = resolveLayoutColumns(width);
      expect(columns).toBeGreaterThanOrEqual(previous);
      previous = columns;
    }
  });
});
