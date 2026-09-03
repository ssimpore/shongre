import { describe, expect, it } from "vitest";
import {
  colors,
  nativeColors,
  nativeRadius,
  nativeSpacing,
  radius,
  themeFontFamilies,
  themeFontWeights,
  themeColors,
  themeSpacing,
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

  it("keeps primary controls WCAG AA readable", () => {
    expect(
      contrast(themeColors.white, themeColors.primary),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps native scale adapters aligned with canonical geometry", () => {
    expect(nativeSpacing.lg).toBe(16);
    expect(nativeRadius.control).toBe(Number.parseFloat(radius.control) * 16);
    expect(nativeRadius.listingCard).toBe(
      Number.parseFloat(radius["listing-card"]) * 16,
    );
    expect(nativeRadius.card).toBe(Number.parseFloat(radius.card) * 16);
  });

  it("keeps listing cards compact through semantic shared tokens", () => {
    expect(themeSpacing["listing-card"]).toBe("13rem");
    expect(radius["listing-card"]).toBe("0.875rem");
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
