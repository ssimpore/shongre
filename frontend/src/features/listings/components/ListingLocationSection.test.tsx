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
 * least willing to publish exactly. The rule this pins is that the map appears
 * only when the public projection actually published coordinates — a listing
 * without them gets the place name and nothing else, rather than a pin at an
 * invented position that reads as an address.
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

  it("shows no map when the projection published no coordinates", () => {
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
      // Neither the map nor its placeholder: there is nothing truthful to draw.
      expect(markup).not.toContain("data-listing-location-map");
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
