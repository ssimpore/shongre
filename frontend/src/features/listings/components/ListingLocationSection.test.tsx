import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The section only needs copy. Importing the real provider would pull the HTTP
// transport and its runtime configuration into a render-shape test.
vi.mock("../../../i18n/I18nProvider", () => ({
  useTranslation: () => ({
    locale: "fr-FR",
    t: (key: string) =>
      key === "listings.characteristics.location" ? "Localisation" : key,
  }),
}));

import { ListingLocationSection } from "./ListingLocationSection";

/**
 * A listing's location is the fact a reader most wants and the one a seller is
 * least willing to publish exactly.
 *
 * Two rules meet here. A published coordinate is drawn as an approximate area,
 * never a pin. And when the projection published none — which is most of the
 * catalogue, because nothing geocodes what a seller types — the town itself is
 * still a location, so the map is drawn at town scale from the market's city
 * gazetteer. A town the gazetteer does not know gets no map at all: the one
 * thing never allowed is a confident circle over the wrong place.
 */
describe("listing location section", () => {
  it("names the place and its postcode", () => {
    const markup = renderToStaticMarkup(
      <ListingLocationSection city="Les Mathes" postalCode="17570" />,
    );
    // One line, one space: the postcode qualifies the town, it is not a
    // second field.
    expect(markup).toContain("Les Mathes (17570)");
  });

  it("refuses a coordinate that is not a place", () => {
    for (const coordinates of [
      {},
      { latitude: 45.7 },
      { longitude: -1.1 },
      { latitude: null, longitude: null },
      { latitude: Number.NaN, longitude: -1.1 },
      { latitude: Number.POSITIVE_INFINITY, longitude: -1.1 },
      // The placeholder the API writes when it has no coordinate. Drawing it
      // put a Lyon property in the Gulf of Guinea.
      { latitude: 0, longitude: 0 },
      // Out of range is bad data, not a place.
      { latitude: 91, longitude: 2 },
      { latitude: 45, longitude: 181 },
    ]) {
      const markup = renderToStaticMarkup(
        <ListingLocationSection
          city="Les Mathes"
          postalCode="17570"
          {...coordinates}
        />,
      );
      expect(markup).toContain("Les Mathes");
      // Neither the map nor its placeholder: there is nothing truthful to draw,
      // and Les Mathes is not a town the gazetteer can stand in for.
      expect(markup).not.toContain("skeleton-shimmer");
    }
  });

  it("draws the town when the projection published no coordinate", () => {
    // The common case: a seller typed a town, nothing geocoded it, and the
    // section used to show a heading over empty space.
    const markup = renderToStaticMarkup(
      <ListingLocationSection
        id="listing-1"
        marketCode="FR"
        city="Biarritz"
        postalCode="64200"
      />,
    );
    expect(markup).toContain("Biarritz (64200)");
    expect(markup).toContain("skeleton-shimmer");
  });

  it("reads an arrondissement as its city", () => {
    // "Paris 11e" and "Lyon 2e" are how the catalogue writes them, and a
    // gazetteer keyed on bare city names would answer nothing for either.
    for (const city of ["Paris 11e", "Lyon 2e", "Marseille 7e"]) {
      const markup = renderToStaticMarkup(
        <ListingLocationSection id={city} marketCode="FR" city={city} />,
      );
      expect(markup, city).toContain("skeleton-shimmer");
    }
  });

  it("still refuses a town it does not know, rather than centring the market", () => {
    /*
     * The failure this forbids is a surfboard in the Basque Country drawn near
     * Paris because the market centre was the nearest thing to an answer. No
     * map is the correct answer; a plausible wrong one is not.
     */
    for (const city of ["Trifouillis-les-Oies", "France", "Zzz"]) {
      const markup = renderToStaticMarkup(
        <ListingLocationSection id="listing-2" marketCode="FR" city={city} />,
      );
      expect(markup, city).toContain(city);
      expect(markup, city).not.toContain("skeleton-shimmer");
    }
  });

  it("reserves the map area once coordinates exist", () => {
    const markup = renderToStaticMarkup(
      <ListingLocationSection
        city="Les Mathes"
        postalCode="17570"
        latitude={45.7043}
        longitude={-1.1489}
      />,
    );
    // The renderer is lazy, so the server pass emits its fallback rather than
    // the tiles — what matters is that the slot is claimed and sized, so the
    // section does not shift when the map arrives.
    expect(markup).toContain("skeleton-shimmer");
    expect(markup).toContain("h-96");
  });

  it("renders nothing at all when there is no place to name", () => {
    for (const place of [
      {},
      { city: null, postalCode: null },
      { city: "", postalCode: "" },
    ]) {
      expect(renderToStaticMarkup(<ListingLocationSection {...place} />)).toBe(
        "",
      );
    }
  });
});
