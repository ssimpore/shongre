import { describe, expect, it } from "vitest";
import {
  getTaxonomyV4OptionLabel,
  getTaxonomyV4Label,
  getTaxonomyV4RootLabel,
  isTaxonomyV4DescendantOf,
  resolveTaxonomyV4Identity,
  resolveTaxonomyV4Root,
} from "./taxonomy-v4-identity";

describe("taxonomy v4 identity projection", () => {
  it("resolves ids, source keys, slugs, and compiled aliases", () => {
    expect(resolveTaxonomyV4Identity("vehicles.cars.city_cars")?.id).toBe(
      "vehicles.cars.city_cars",
    );
    expect(resolveTaxonomyV4Identity("home_garden.furniture")?.sourceKey).toBe(
      "home_garden.furniture",
    );
    expect(resolveTaxonomyV4Identity("maison-jardin")?.id).toBe("home_garden");
    expect(resolveTaxonomyV4Identity("baby_kids")?.id).toBe("baby_family");
  });

  it("returns the localized universe for exact and future descendant ids", () => {
    expect(getTaxonomyV4RootLabel("electronics.smartphones", "fr-FR")).toBe(
      "Électronique",
    );
    expect(
      getTaxonomyV4RootLabel("home_garden.furniture.sofas.modular", "fr-CH"),
    ).toBe("Maison");
    expect(getTaxonomyV4RootLabel("electronics.computers", "en-US")).toBe(
      "Electronics",
    );
    expect(resolveTaxonomyV4Root("unknown.branch")).toBeUndefined();
  });

  it("matches canonical descendants through ids, slugs, and legacy aliases", () => {
    expect(
      isTaxonomyV4DescendantOf("equipement-bebe", "bebe-puericulture-enfants"),
    ).toBe(true);
    expect(
      isTaxonomyV4DescendantOf(
        "real_estate.rentals.apartments",
        "real_estate.rentals",
      ),
    ).toBe(true);
    expect(isTaxonomyV4DescendantOf("jobs.offers.it_data", "jobs.offers")).toBe(
      true,
    );
    expect(isTaxonomyV4DescendantOf("vehicles.cars", "real_estate")).toBe(
      false,
    );
  });

  it("turns stored option keys into their canonical public labels", () => {
    expect(getTaxonomyV4OptionLabel("brand", "citroen", "fr-FR")).toBe(
      "Citroën",
    );
    expect(getTaxonomyV4OptionLabel("brand", "seat_cupra", "en-US")).toBe(
      "SEAT / CUPRA",
    );
    expect(getTaxonomyV4OptionLabel("brand", "custom-brand")).toBeUndefined();
  });

  it("localizes an exact compact category label", () => {
    expect(getTaxonomyV4Label("vehicles.cars", "fr-CH")).toBe("Voitures");
    expect(getTaxonomyV4Label("vehicles.cars", "en-US")).toBe("Cars");
  });
});
