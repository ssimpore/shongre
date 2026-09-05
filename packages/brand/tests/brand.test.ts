import { describe, expect, it } from "vitest";
import { colors } from "@shongre/design-tokens";
import { brand } from "../src";
import { webBrandAssets } from "../src/web-assets.generated";

describe("brand contract", () => {
  it("exposes the official versioned identity", () => {
    expect(brand).toMatchObject({
      name: "SHONGRE.",
      signature: "SHONGRE.",
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      primaryColor: colors.brand.primary,
      inkColor: colors.brand.ink,
    });
    expect(brand.primaryColor).toBe(colors.brand.primary);
    expect(webBrandAssets.version).toBe(brand.version);
    expect(webBrandAssets.cacheKey).toBe(brand.cacheKey);
  });

  it("exposes the generated Web runtime registry", () => {
    expect(webBrandAssets.favicon.png.map(({ sizes }) => sizes)).toEqual([
      "16x16",
      "32x32",
      "48x48",
      "64x64",
      "96x96",
    ]);
    expect(webBrandAssets.icon.primary.src).toMatch(
      new RegExp(`\\?brand=${brand.version}$`),
    );
    expect(webBrandAssets.social.openGraphLight).toMatchObject({
      width: 1200,
      height: 630,
    });
  });
});
