import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { webBrandAssets } from "@shongre/brand/web";
import { BrandHeaderSignature, BrandIcon, BrandLogo } from "./BrandLogo";

describe("official SHONGRE. brand primitives", () => {
  it("renders an approved responsive full-color signature", () => {
    const markup = renderToStaticMarkup(
      <BrandLogo layout="horizontal" variant="primary" priority />,
    );
    expect(markup).toContain('alt="SHONGRE."');
    expect(markup).toContain(webBrandAssets.logo.horizontal.primary.src);
    expect(markup).toContain(webBrandAssets.logo.horizontal.primary.srcSet);
    expect(markup).toContain('sizes="152px"');
    expect(markup).toContain('fetchPriority="high"');
  });

  it("makes redundant marks decorative without losing intrinsic dimensions", () => {
    const markup = renderToStaticMarkup(
      <BrandIcon variant="mono-white" decorative />,
    );
    expect(markup).toContain('alt=""');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('width="1106"');
    expect(markup).toContain('height="1082"');
  });

  it("uses the shared mask-safe source and radius for primary icons", () => {
    const markup = renderToStaticMarkup(<BrandIcon decorative />);
    expect(markup).toContain(webBrandAssets.icon.primary.src);
    expect(markup).toContain("rounded-sm");
  });

  it("keeps the mask-safe icon, wordmark, and market label independently governed", () => {
    const markup = renderToStaticMarkup(
      <BrandHeaderSignature
        priority
        marketLabel="France"
        marketLabelVisibility="desktop"
      />,
    );
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="SHONGRE."');
    expect(markup).toContain(webBrandAssets.icon.primary.src);
    expect(markup).toContain(webBrandAssets.logo.wordmark.primary.src);
    expect(markup).toContain("rounded-sm");
    expect(markup).toContain("data-brand-market-label");
    expect(markup).toContain("hidden lg:block");
    expect(markup).toContain("France");
    expect(markup).toContain("h-9");
    expect(markup).toContain("w-9");
    expect(markup).toContain("w-24");

    const reverseMarkup = renderToStaticMarkup(
      <BrandHeaderSignature variant="reverse" decorative />,
    );
    expect(reverseMarkup).toContain('data-brand-signature="reverse"');
    expect(reverseMarkup).toContain(webBrandAssets.logo.wordmark.reverse.src);
    expect(reverseMarkup).toContain(webBrandAssets.icon.primary.src);
    expect(reverseMarkup).toContain("rounded-sm");
  });

  it("rejects combinations absent from the approved kit", () => {
    expect(() =>
      renderToStaticMarkup(
        <BrandLogo layout="stacked" variant="mono-orange" />,
      ),
    ).toThrow("Unsupported SHONGRE. logo combination");
  });
});
