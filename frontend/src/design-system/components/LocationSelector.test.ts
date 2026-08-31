import { describe, expect, it } from "vitest";
import { locationSelectorValueFromSelection } from "./location-selector.model";

describe("locationSelectorValueFromSelection", () => {
  it("maps a city and radius into a search-filter value", () => {
    expect(
      locationSelectorValueFromSelection({
        city: "Lyon",
        postalCode: "69000",
        radiusKm: 20,
        label: "Lyon (+20 km)",
      }),
    ).toEqual({ city: "Lyon", radiusKm: 20 });
  });

  it("clears both search parameters for the whole-market selection", () => {
    expect(
      locationSelectorValueFromSelection({
        city: "Toute la France",
        postalCode: "",
        radiusKm: 0,
        label: "Toute la France",
      }),
    ).toEqual({ city: undefined, radiusKm: undefined });
  });
});
