import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ListingDiscoveryRail } from "./ListingDiscoveryRail";

/**
 * Every detail page ends with the same two questions — what else does this
 * seller have, and what else is like this — and used to answer them in four
 * different shapes. What is pinned here is the one shape, and the rule that an
 * empty answer is no section rather than a heading over nothing.
 */
const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe("listing discovery rail", () => {
  it("renders its cards under a heading, in a scrollable rail", () => {
    const html = render(
      <ListingDiscoveryRail
        kind="seller"
        title="Les annonces de ce pro"
        subtitle="Les autres annonces publiées par ce vendeur."
      >
        <article data-card="a">Une</article>
        <article data-card="b">Deux</article>
      </ListingDiscoveryRail>,
    );
    expect(html).toContain("Les annonces de ce pro");
    expect(html).toContain("Les autres annonces publiées par ce vendeur.");
    expect(html).toContain('data-listing-discovery-rail="seller"');
    expect(html).toContain('data-card="a"');
    expect(html).toContain('data-card="b"');
    // The same titled, bounded section the facts and the location above it use.
    expect(html).toContain('data-detail-section="true"');
    expect(html).toContain('data-detail-section-surface="card"');
  });

  it("is absent entirely when there is nothing to show", () => {
    // A heading and a rule promising content that never arrives reads as a
    // broken page, not an empty one.
    for (const children of [
      [],
      null,
      undefined,
      false,
      [null, undefined, false],
    ]) {
      expect(
        render(
          <ListingDiscoveryRail kind="similar" title="Annonces similaires">
            {children}
          </ListingDiscoveryRail>,
        ),
      ).toBe("");
    }
  });

  it("offers the way out only when there is somewhere to go", () => {
    const withLink = render(
      <ListingDiscoveryRail
        kind="seller"
        title="Les annonces de ce pro"
        moreHref="/profil/atelier-nordique"
        moreLabel="Voir plus d’annonces"
      >
        <article>Une</article>
      </ListingDiscoveryRail>,
    );
    expect(withLink).toContain('href="/profil/atelier-nordique"');
    expect(withLink).toContain("Voir plus d’annonces");
    expect(withLink).toContain('data-listing-rail-more="seller"');

    const withoutLink = render(
      <ListingDiscoveryRail kind="similar" title="Annonces similaires">
        <article>Une</article>
      </ListingDiscoveryRail>,
    );
    expect(withoutLink).toContain("Annonces similaires");
    expect(withoutLink).not.toContain("data-listing-rail-more");
  });
});
