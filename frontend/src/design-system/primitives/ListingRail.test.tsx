import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ListingGrid } from "./ListingGrid";
import { ListingRail } from "./ListingRail";

describe("listing layout primitives", () => {
  it("keeps rail cells token-sized and stretchable for wrapped cards", () => {
    const html = renderToStaticMarkup(
      <ListingRail label="Annonces">
        <div data-testid="tracking-wrapper">card</div>
      </ListingRail>,
    );

    expect(html).toContain("listing-rail-cell w-listing-card");
    expect(html).toContain("listing-rail-track");
    expect(html).toContain("max-w-viewport-full");
    expect(html).toContain("pt-1.5 pb-4");
  });

  it("uses the shared listing-card width token for desktop grid columns", () => {
    const html = renderToStaticMarkup(
      <ListingGrid>
        <div>card</div>
      </ListingGrid>,
    );

    expect(html).toContain("sm:grid-cols-listing-grid-fixed");
  });

  it("fills a result row with token-sized responsive columns", () => {
    const html = renderToStaticMarkup(
      <ListingGrid fluid>
        <div>card</div>
      </ListingGrid>,
    );

    expect(html).toContain("listing-grid-fluid");
    expect(html).toContain("sm:grid-cols-listing-grid-fluid");
  });

  it("owns one full-width track for horizontal list results", () => {
    const html = renderToStaticMarkup(
      <ListingGrid variant="list">
        <div>card</div>
      </ListingGrid>,
    );

    expect(html).toContain('data-listing-grid-variant="list"');
    expect(html).toContain("listing-grid-list sm:grid-cols-1");
    expect(html).not.toContain("sm:grid-cols-listing-grid-fixed");
    expect(html).not.toContain("sm:grid-cols-listing-grid-fluid");
  });
});
