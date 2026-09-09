import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  deriveShongreOrangeTokens,
  mixHex,
} from "../src/brand-orange";
import { brandPalette } from "../src/brand.generated.js";
import {
  colors,
  iconStrokeWidths,
  nativeAspect,
  nativeBorders,
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
  nativeTypography,
  radius,
  themeFontFamilies,
  themeFontWeights,
  themeColors,
  themeLetterSpacing,
  themeSpacing,
  themeText,
} from "../src/index";

const luminance = (hex: string): number => {
  const channels = [1, 3, 5].map(
    (index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrast = (a: string, b: string): number => {
  const [first, second] = [luminance(a), luminance(b)];
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

describe("canonical design tokens", () => {
  it("keeps shared semantic colors identical in Web and native adapters", () => {
    expect(nativeColors.action.primary).toBe(colors.action.primary);
    expect(nativeColors.surface.default).toBe(colors.surface.default);
    expect(nativeColors.status.error).toBe(colors.status.error);
  });

  it("preserves the official active SHONGRE. palette", () => {
    expect(colors.brand).toEqual({
      primary: brandPalette.orange,
      ink: brandPalette.ink,
      background: brandPalette.white,
      surfaceSubtle: brandPalette.mist,
    });
    expect(colors.text.primary).toBe(colors.brand.ink);
    expect(colors.surface.default).toBe(colors.brand.background);
    expect(colors.surface.subtle).toBe(colors.brand.surfaceSubtle);
  });

  it("keeps primary controls WCAG AA readable", () => {
    expect(
      contrast(themeColors["text-inverse"], themeColors.primary),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(themeColors.primary, themeColors["primary-light"]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("derives every Shongre Orange role from the single canonical swatch", () => {
    const derived = deriveShongreOrangeTokens(
      colors.brand.primary,
      colors.brand.ink,
      colors.brand.background,
    );
    expect({
      canonical: themeColors["brand-primary"],
      interactive: themeColors.primary,
      hover: themeColors["primary-hover"],
      active: themeColors["primary-active"],
      disabled: themeColors["primary-disabled"],
      disabledBorder: themeColors["primary-disabled-border"],
      light: themeColors["primary-light"],
      surfaceFaint: themeColors["primary-surface-faint"],
      surface: themeColors["primary-surface"],
      surfaceSelected: themeColors["primary-surface-selected"],
      surfaceStrong: themeColors["primary-surface-strong"],
      border: themeColors["primary-border"],
      borderSoft: themeColors["primary-border-soft"],
      borderStrong: themeColors["primary-border-strong"],
      surfaceSoft: themeColors["primary-surface-soft"],
      onInverseSoft: themeColors["primary-on-inverse-soft"],
      onInverseMuted: themeColors["primary-on-inverse-muted"],
      fill: themeColors["primary-fill"],
      emphasis: themeColors["primary-emphasis"],
      ring: themeColors["primary-ring"],
      ringStrong: themeColors["primary-ring-strong"],
      shadow: themeColors["primary-shadow"],
      shadowStrong: themeColors["primary-shadow-strong"],
      overlay: themeColors["primary-overlay"],
      onDark: themeColors["primary-on-dark"],
      onDarkRing: themeColors["primary-on-dark-ring"],
      onDarkBorder: themeColors["primary-on-dark-border"],
    }).toEqual(derived);
    expect(themeColors.focus).toBe(derived.interactive);
    expect(themeColors["category-vehicles"]).toBe(derived.interactive);
    expect(themeColors["category-sport"]).toBe(derived.fill);
    expect(
      contrastRatio(themeColors.primary, themeColors["text-inverse"]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(themeColors["primary-disabled"], themeColors["text-main"]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        themeColors["primary-on-dark"],
        mixHex(colors.brand.ink, colors.brand.primary, 0.2),
      ),
    ).toBeGreaterThanOrEqual(4.75);
  });

  it("exposes the inverse-surface roles application code needs on dark chrome", () => {
    expect(colors.action.primaryOnDark).toBe(themeColors["primary-on-dark"]);
    expect(colors.status.infoOnInverse).toBe(themeColors["info-on-inverse"]);
    expect(colors.accent.staffOnInverse).toBe(themeColors["staff-on-inverse"]);
    // Every inverse role must stay readable on the canonical dark surface.
    for (const role of [
      colors.text.inverseBright,
      colors.text.inverseMuted,
      colors.text.inverseSubtle,
    ]) {
      expect(contrast(role, colors.surface.inverseDeep)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("propagates a representative canonical orange change through every derived role", () => {
    const original = deriveShongreOrangeTokens(
      colors.brand.primary,
      colors.brand.ink,
      colors.brand.background,
    );
    const changed = deriveShongreOrangeTokens(
      mixHex(colors.brand.primary, colors.brand.background, 0.2),
      colors.brand.ink,
      colors.brand.background,
    );
    for (const key of Object.keys(original) as (keyof typeof original)[]) {
      expect(changed[key], `${key} follows the canonical swatch`).not.toBe(
        original[key],
      );
    }
  });

  it("does not expose raw hue ramps or absolute white/black escape hatches", () => {
    const rawColorName =
      /^(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?$|^(?:white|black)$/;
    expect(
      Object.keys(themeColors).filter((key) => rawColorName.test(key)),
    ).toEqual([]);
  });

  it("keeps native scale adapters aligned with canonical geometry", () => {
    expect(nativeSpacing.lg).toBe(16);
    expect(nativeRadius.control).toBe(Number.parseFloat(radius.control) * 16);
    expect(nativeRadius.listingCard).toBe(
      Number.parseFloat(radius["listing-card"]) * 16,
    );
    expect(nativeRadius.card).toBe(Number.parseFloat(radius.card) * 16);
    expect(nativeBorders.hairline).toBe(1);
    expect(nativeSizing.fieldMultilineMin).toBe(112);
    expect(nativeSizing.avatar2xl).toBe(128);
    expect(nativeSizing.brandLogoCompact).toBe(120);
    expect(nativeSizing.brandLogoStandard).toBe(160);
    expect(nativeAspect.listingCard).toBe(4 / 5);
    expect(nativeAspect.media).toBe(4 / 3);
    expect(iconStrokeWidths.regular).toBe(2);
    expect(nativeTypography.size.overline).toBe(
      Number.parseFloat(themeText.overline) * 16,
    );
    expect(nativeTypography.size.xs).toBe(Number.parseFloat(themeText.xs) * 16);
    expect(nativeTypography.letterSpacing.wide).toBe(
      Number.parseFloat(themeLetterSpacing.wide) * nativeTypography.size.micro,
    );
  });

  it("keeps listing cards compact through semantic shared tokens", () => {
    expect(themeSpacing["listing-card"]).toBe("13rem");
    expect(themeSpacing["listing-card-mobile-max"]).toBe("19rem");
    expect(themeSpacing["listing-card-media-height"]).toBe("16rem");
    expect(themeSpacing["environment-toolbar-height"]).toBe("3.5rem");
    expect(radius["listing-card"]).toBe("0.625rem");
    expect(radius["listing-card"]).toBe(radius.control);
    expect(nativeRadius.listingCard).toBe(nativeRadius.control);
  });

  it("owns one Web application font family and caps the weight hierarchy", () => {
    expect(themeFontFamilies.sans).toBe(
      "var(--font-nunito-sans, 'Nunito Sans'), Helvetica, Arial, sans-serif",
    );
    expect(themeFontFamilies).not.toHaveProperty("display");
    expect(themeFontWeights).toEqual({
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    });
  });
});
