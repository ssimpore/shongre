import { describe, it, expect } from "vitest";
import {
  buildSrcSet,
  isResizableSource,
  DEFAULT_WIDTH_LADDER,
  IMAGE_SIZES,
} from "./responsiveImage";

const UNSPLASH =
  "https://images.unsplash.com/photo-1549399542?auto=format&fit=crop&w=800&q=80";

describe("isResizableSource", () => {
  it("accepts a known resizable host", () => {
    expect(isResizableSource(UNSPLASH)).toBe(true);
  });

  it("rejects sources it cannot safely rewrite", () => {
    expect(isResizableSource(undefined)).toBe(false);
    expect(isResizableSource("")).toBe(false);
    expect(isResizableSource("/local/cover.jpg")).toBe(false);
    expect(isResizableSource("data:image/png;base64,iVBORw0KGgo=")).toBe(false);
    expect(isResizableSource("blob:http://localhost/abc")).toBe(false);
    expect(isResizableSource("https://atelier-nordique.fr/logo.png")).toBe(
      false,
    );
  });
});

describe("buildSrcSet", () => {
  it("returns undefined for sources it cannot rewrite, so no attribute is emitted", () => {
    expect(buildSrcSet(undefined)).toBeUndefined();
    expect(buildSrcSet("/local/cover.jpg")).toBeUndefined();
    expect(buildSrcSet("https://atelier-nordique.fr/logo.png")).toBeUndefined();
  });

  it("emits a w-descriptor entry per ladder step", () => {
    const set = buildSrcSet(UNSPLASH)!;
    const entries = set.split(", ");
    // 800 is the intrinsic width, so the 1080/1440 steps are dropped.
    expect(entries).toHaveLength(
      DEFAULT_WIDTH_LADDER.filter((w) => w <= 800).length,
    );
    entries.forEach((entry, i) => {
      const width = DEFAULT_WIDTH_LADDER[i];
      expect(entry).toContain(`w=${width}`);
      expect(entry.endsWith(` ${width}w`)).toBe(true);
    });
  });

  it("preserves the other CDN parameters while rewriting only w", () => {
    const first = buildSrcSet(UNSPLASH)!.split(", ")[0];
    expect(first).toContain("auto=format");
    expect(first).toContain("fit=crop");
    expect(first).toContain("q=80");
    expect(first).not.toContain("w=800");
  });

  it("never offers a source wider than the original", () => {
    const set = buildSrcSet("https://images.unsplash.com/photo-x?w=320")!;
    const widths = set.split(", ").map((e) => Number(e.match(/ (\d+)w$/)![1]));
    expect(Math.max(...widths)).toBeLessThanOrEqual(320);
  });

  it("still emits a ladder when the source is narrower than every step", () => {
    const set = buildSrcSet("https://images.unsplash.com/photo-x?w=64")!;
    expect(set.split(", ")).toHaveLength(1);
    expect(set).toContain(`${DEFAULT_WIDTH_LADDER[0]}w`);
  });

  it("falls back to the full ladder when the source declares no width", () => {
    const set = buildSrcSet("https://images.unsplash.com/photo-x?auto=format")!;
    expect(set.split(", ")).toHaveLength(DEFAULT_WIDTH_LADDER.length);
  });

  it("honours a caller-supplied ladder", () => {
    const set = buildSrcSet("https://images.unsplash.com/photo-x", [100, 200])!;
    expect(set.split(", ")).toHaveLength(2);
    expect(set).toContain("100w");
    expect(set).toContain("200w");
  });
});

describe("IMAGE_SIZES", () => {
  it("every slot declares a usable sizes hint", () => {
    Object.values(IMAGE_SIZES).forEach((value) => {
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value).toMatch(/px|vw/);
    });
  });
});
