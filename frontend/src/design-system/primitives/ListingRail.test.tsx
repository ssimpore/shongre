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
  });

  it("uses the shared listing-card width token for desktop grid columns", () => {
    const html = renderToStaticMarkup(
      <ListingGrid>
        <div>card</div>
      </ListingGrid>,
    );

    expect(html).toContain(
      "sm:grid-cols-[repeat(auto-fill,var(--spacing-listing-card))]",
    );
  });

  it("can fill a result row with responsive columns", () => {
    const html = renderToStaticMarkup(
      <ListingGrid fluid>
        <div>card</div>
      </ListingGrid>,
    );

    expect(html).toContain("listing-grid-fluid");
    expect(html).toContain("sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5");
    expect(html).not.toContain(
      "sm:grid-cols-[repeat(auto-fill,var(--spacing-listing-card))]",
    );
  });
});
