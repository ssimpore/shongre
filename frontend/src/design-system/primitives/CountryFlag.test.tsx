import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CountryFlag } from "./CountryFlag";

describe("CountryFlag", () => {
  it.each(["FR", "BE", "CH", "SN", "BF", "LU", "GB", "DE", "ES", "NL", "IT"])(
    "renders %s as inline SVG instead of font-dependent emoji",
    (countryCode) => {
      const markup = renderToStaticMarkup(
        <CountryFlag countryCode={countryCode} />,
      );

      expect(markup).toContain("<svg");
      expect(markup).toContain(`data-country-code="${countryCode}"`);
      expect(markup).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
    },
  );

  it("normalizes country codes and remains decorative beside visible labels", () => {
    const markup = renderToStaticMarkup(<CountryFlag countryCode=" fr " />);

    expect(markup).toContain('data-country-code="FR"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
  });
});
