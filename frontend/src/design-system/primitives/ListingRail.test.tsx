import React from "react";
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

  it("uses the shared tokenized grid minimum", () => {
    const html = renderToStaticMarkup(
      <ListingGrid>
        <div>card</div>
      </ListingGrid>,
    );

    expect(html).toContain(
      "sm:grid-cols-[repeat(auto-fill,minmax(var(--spacing-listing-grid-min),1fr))]",
    );
  });
});
