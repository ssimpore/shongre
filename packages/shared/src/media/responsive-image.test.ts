import { describe, expect, it } from "vitest";
import {
  buildResponsiveFallbackUrl,
  buildSizedImageUrl,
  buildSrcSet,
  DEFAULT_WIDTH_LADDER,
  IMAGE_SIZES,
  isResizableSource,
} from "./responsive-image";

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
  it("returns undefined for sources it cannot safely rewrite", () => {
    expect(buildSrcSet(undefined)).toBeUndefined();
    expect(buildSrcSet("/local/cover.jpg")).toBeUndefined();
    expect(buildSrcSet("https://atelier-nordique.fr/logo.png")).toBeUndefined();
  });

  it("emits a width entry per eligible ladder step", () => {
    const entries = buildSrcSet(UNSPLASH)!.split(", ");
    expect(entries).toHaveLength(
      DEFAULT_WIDTH_LADDER.filter((width) => width <= 800).length,
    );
    entries.forEach((entry, index) => {
      const width = DEFAULT_WIDTH_LADDER[index];
      expect(entry).toContain(`w=${width}`);
      expect(entry.endsWith(` ${width}w`)).toBe(true);
    });
  });

  it("preserves other CDN parameters while rewriting only the width", () => {
    const first = buildSrcSet(UNSPLASH)!.split(", ")[0];
    expect(first).toContain("auto=format");
    expect(first).toContain("fit=crop");
    expect(first).toContain("q=80");
    expect(first).not.toContain("w=800");
  });

  it("never offers a source wider than the original", () => {
    const widths = buildSrcSet("https://images.unsplash.com/photo-x?w=320")!
      .split(", ")
      .map((entry) => Number(entry.match(/ (\d+)w$/)![1]));
    expect(Math.max(...widths)).toBeLessThanOrEqual(320);
  });

  it("still emits a ladder for a source narrower than every step", () => {
    const set = buildSrcSet("https://images.unsplash.com/photo-x?w=64")!;
    expect(set.split(", ")).toHaveLength(1);
    expect(set).toContain(`${DEFAULT_WIDTH_LADDER[0]}w`);
  });

  it("uses the full ladder when the source declares no width", () => {
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

describe("buildSizedImageUrl", () => {
  it("builds a bounded fallback for a known provider", () => {
    expect(buildSizedImageUrl(UNSPLASH, 64)).toContain("w=64");
    expect(
      buildSizedImageUrl("https://images.unsplash.com/photo-x?w=40", 64),
    ).toContain("w=40");
  });

  it("leaves unknown providers to their original source", () => {
    expect(
      buildSizedImageUrl("https://atelier-nordique.fr/logo.png", 64),
    ).toBeUndefined();
  });
});

describe("buildResponsiveFallbackUrl", () => {
  it("uses bounded fallbacks for canonical media slots", () => {
    expect(buildResponsiveFallbackUrl(UNSPLASH, IMAGE_SIZES.card)).toContain(
      "w=640",
    );
    expect(buildResponsiveFallbackUrl(UNSPLASH, IMAGE_SIZES.gallery)).toContain(
      "w=640",
    );
  });

  it("derives a two-density fallback for fixed custom slots", () => {
    expect(buildResponsiveFallbackUrl(UNSPLASH, "48px")).toContain("w=96");
  });
});

describe("IMAGE_SIZES", () => {
  it("declares a usable hint for every slot", () => {
    Object.values(IMAGE_SIZES).forEach((value) => {
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value).toMatch(/px|vw/);
    });
  });

  it("matches a full-width mobile card and the fixed desktop rail width", () => {
    expect(IMAGE_SIZES.card).toContain("calc(100vw - 2rem)");
    expect(IMAGE_SIZES.card).toMatch(/208px$/);
    expect(IMAGE_SIZES.compact).toBe("208px");
  });
});
