import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";
import { describe, expect, it } from "vitest";
import {
  projectLocalizedListingCharacteristics,
  projectListingCharacteristics as project,
} from "../../src/modules/taxonomy/taxonomy.characteristics.js";

const projectListingCharacteristics = (input: Parameters<typeof project>[0]) =>
  project(input, TAXONOMY_V1_PRIVATE_BUNDLE);

const vehicle = {
  categoryId: "vehicles.cars",
  sellerType: "individual" as const,
  marketCode: "FR",
  locale: "fr-FR",
  attributes: {
    brand: "peugeot",
    model: "208",
    model_year: 2022,
    mileage: 28500,
    fuel_type: "petrol",
    transmission: "manual",
    critair_class: "1",
  },
};
const items = (input = vehicle) =>
  projectListingCharacteristics(input).groups.flatMap((group) => group.items);

describe("backend listing characteristics", () => {
  it("projects authored icons for every reusable field and honors a published override", () => {
    for (const field of TAXONOMY_V1_PRIVATE_BUNDLE.attributes)
      expect(field.iconName, field.code).toBeTruthy();
    const override = {
      ...TAXONOMY_V1_PRIVATE_BUNDLE,
      attributes: TAXONOMY_V1_PRIVATE_BUNDLE.attributes.map((field) =>
        field.code === "model_year"
          ? { ...field, iconName: "leaf" as const }
          : field,
      ),
    };
    expect(
      project(vehicle, override)
        .groups.flatMap((group) => group.items)
        .find((item) => item.code === "model_year")?.icon,
    ).toBe("leaf");
    const detail = projectLocalizedListingCharacteristics(
      vehicle,
      TAXONOMY_V1_PRIVATE_BUNDLE,
      "detail",
    );
    expect(detail.find((item) => item.code === "model_year")).toMatchObject({
      icon: "calendar",
      groupId: "grp.vehicle_identity",
      presentation: "fact",
    });
  });

  it("projects recorded vehicle values without choosing a publishable child category", () => {
    expect(items()).toEqual(
      expect.arrayContaining([
        {
          code: "brand",
          icon: "tag",
          label: "Marque",
          value: "Peugeot",
          presentation: "fact",
        },
        {
          code: "model_year",
          icon: "calendar",
          label: "Année modèle",
          value: "2022",
          presentation: "fact",
        },
        {
          code: "mileage",
          icon: "gauge",
          label: "Kilométrage / Heures",
          value: "28\u202f500 km",
          presentation: "fact",
        },
        {
          code: "fuel_type",
          icon: "fuel",
          label: "Énergie / Carburant",
          value: "Essence",
          presentation: "fact",
        },
        {
          code: "transmission",
          icon: "settings",
          label: "Boîte de vitesses",
          value: "Manuelle",
          presentation: "fact",
        },
        {
          code: "critair_class",
          icon: "leaf",
          label: "Classe Crit’Air",
          value: "Crit’Air 1",
          presentation: "fact",
        },
      ]),
    );
    expect(items()).toHaveLength(7);
    expect(vehicle.categoryId).toBe("vehicles.cars");
  });

  it("uses the recorded leaf and canonical attribute keys", () => {
    const result = projectListingCharacteristics({
      ...vehicle,
      categoryId: "vehicles.cars.city_cars",
      listingTypeId: "vehicles.cars.city_cars.listing",
      intent: "SELL",
      attributes: {
        ...vehicle.attributes,
        model_year: 2024,
        fuel_type: "electric",
        transmission: "automatic",
      },
    }).groups.flatMap((group) => group.items);
    expect(result).toContainEqual({
      code: "model_year",
      icon: "calendar",
      label: "Année modèle",
      value: "2024",
      presentation: "fact",
    });
    expect(result.find((item) => item.code === "fuel_type")?.value).toBe(
      "Électrique",
    );
    expect(result.find((item) => item.code === "transmission")?.value).toBe(
      "Automatique",
    );
  });

  it("omits private, unknown, wrong-category, malformed and absent values", () => {
    const result = projectListingCharacteristics({
      ...vehicle,
      attributes: {
        vin_private: "private-vin",
        registration_private: "private-plate",
        contactCount: 19,
        categoryPath: ["vehicles"],
        siret: "private-only",
        construction_year: 1990,
        model: { secret: "never stringify objects" },
        brand: "",
        mileage: null,
        fuel_type: "invalid-option",
      },
    });
    expect(result).toEqual({ groups: [] });
  });

  it("does not fabricate defaults, choose another listing type or cross an unavailable market", () => {
    expect(
      projectListingCharacteristics({ ...vehicle, attributes: {} }),
    ).toEqual({ groups: [] });
    expect(
      projectListingCharacteristics({
        ...vehicle,
        listingTypeId: "electronics.phones.smartphones.listing",
      }),
    ).toEqual({ groups: [] });
    expect(items({ ...vehicle, marketCode: "SN" })).toEqual([]);
    expect(items({ ...vehicle, categoryId: "missing-category" })).toEqual([]);
  });

  it("localizes backend labels and options and preserves numeric zero", () => {
    const result = items({
      ...vehicle,
      locale: "en-GB",
      attributes: { ...vehicle.attributes, mileage: 0 },
    });
    expect(result).toContainEqual({
      code: "fuel_type",
      icon: "fuel",
      label: "Fuel / Energy",
      value: "Petrol",
      presentation: "fact",
    });
    expect(result).toContainEqual({
      code: "mileage",
      icon: "gauge",
      label: "Mileage / Hours",
      value: "0 km",
      presentation: "fact",
    });
  });

  it("uses the relevant category's public fields and preserves an explicit false", () => {
    const result = projectListingCharacteristics({
      ...vehicle,
      categoryId: "real_estate.sales.apartments",
      attributes: {
        living_area: 65,
        rooms: 3,
        elevator: false,
        model_year: 2022,
        fuel_type: "petrol",
      },
    }).groups.flatMap((group) => group.items);
    expect(result.map((item) => item.code)).toEqual(
      expect.arrayContaining(["living_area", "rooms", "elevator"]),
    );
    expect(result.find((item) => item.code === "elevator")?.value).toBe("Non");
    expect(result.map((item) => item.code)).not.toContain("model_year");
    expect(result.map((item) => item.code)).not.toContain("fuel_type");
  });

  it("marks an affirmative boolean as a capability and everything else as a fact", () => {
    /*
     * Clients render "the flat has a lift" as a named amenity and "65 m²" as a
     * labelled value, so the projection has to say which kind each item is —
     * otherwise every client re-derives it from the word "Oui" and they
     * disagree the moment one of them is localized.
     *
     * A negative boolean stays a fact: "Ascenseur — Non" is information a buyer
     * needs, and it cannot be published as a capability the listing has.
     */
    const project = (attributes: Record<string, unknown>) =>
      projectListingCharacteristics({
        ...vehicle,
        categoryId: "real_estate.sales.apartments",
        attributes,
      }).groups.flatMap((group) => group.items);

    const withLift = project({ living_area: 65, elevator: true });
    expect(withLift).toContainEqual({
      code: "elevator",
      icon: "door",
      label: "Ascenseur",
      value: "Oui",
      presentation: "feature",
    });
    expect(
      withLift.find((item) => item.code === "living_area")?.presentation,
    ).toBe("fact");

    const withoutLift = project({ living_area: 65, elevator: false });
    expect(
      withoutLift.find((item) => item.code === "elevator")?.presentation,
    ).toBe("fact");
  });

  it("preserves public historical facts independently of new seller eligibility", () => {
    const input = { ...vehicle, attributes: { vat_deductible: false } };
    expect(
      projectListingCharacteristics(input).groups.flatMap(
        (group) => group.items,
      ),
    ).toEqual([
      expect.objectContaining({ code: "vat_deductible", value: "Non" }),
    ]);
    expect(
      projectListingCharacteristics({
        ...input,
        sellerType: "professional",
      }).groups.flatMap((group) => group.items),
    ).toEqual([
      expect.objectContaining({ code: "vat_deductible", value: "Non" }),
    ]);
  });
});

describe("published card characteristics", () => {
  it("uses published labels, ordering and visibility while preserving market and privacy boundaries", () => {
    const bundle = structuredClone(TAXONOMY_V1_PRIVATE_BUNDLE);
    const input = {
      ...vehicle,
      categoryId: "vehicles.cars.city_cars",
      listingTypeId: "vehicles.cars.city_cars.listing",
    };
    const mileage = bundle.projections.cardFields.find(
      (row) =>
        row.listingTypeId === input.listingTypeId &&
        row.field.key === "mileage",
    )!;
    mileage.sortOrder = -1;
    mileage.labels["en-US"] = "Recorded distance";
    const rows = projectLocalizedListingCharacteristics(input, bundle);
    expect(rows[0]).toMatchObject({
      code: "mileage",
      labels: { "en-US": "Recorded distance" },
      values: { "en-US": "28,500 km" },
    });
    expect(rows.find((row) => row.code === "fuel_type")?.values["en-US"]).toBe(
      "Petrol",
    );
    expect(rows.some((row) => row.code === "vin_private")).toBe(false);
    expect(
      projectLocalizedListingCharacteristics(
        { ...input, marketCode: "SN" },
        bundle,
      ),
    ).toEqual([]);
    const next = structuredClone(bundle);
    next.bindings.find(
      (row) =>
        row.listingTypeId === input.listingTypeId &&
        row.attributeId === "mileage",
    )!.cardVisible = false;
    expect(
      projectLocalizedListingCharacteristics(input, next).some(
        (row) => row.code === "mileage",
      ),
    ).toBe(false);
  });
});

describe("published vertical card fields", () => {
  it("uses published labels and visibility for validated domain values without guessing a leaf", () => {
    const bundle = structuredClone(TAXONOMY_V1_PRIVATE_BUNDLE);
    bundle.attributes.find((field) => field.id === "fuel_type")!.labels[
      "fr-FR"
    ] = "Carburant publié";
    for (const field of bundle.projections.cardFields) {
      if (field.field.key === "fuel_type")
        field.labels["fr-FR"] = "Carburant publié";
    }
    const taxonomy = new TaxonomyV1Service(bundle, 17);
    const attributes = {
      model_year: 2022,
      mileage: 42000,
      fuel_type: "hybrid",
      vin_private: "secret",
    };
    const result = taxonomy.projectDomainListing("vehicles", "FR", attributes)!;
    expect(result).toMatchObject({ categoryId: "vehicles", revision: 17 });
    expect(result.cardCharacteristics.map((row) => row.code)).toEqual([
      "model_year",
      "mileage",
      "fuel_type",
    ]);
    expect(
      result.cardCharacteristics.find((row) => row.code === "fuel_type"),
    ).toMatchObject({
      labels: { "fr-FR": "Carburant publié" },
      values: { "en-US": "Hybrid" },
    });
    expect(
      taxonomy.projectDomainListing("vehicles", "SN", attributes)
        ?.cardCharacteristics,
    ).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("secret");
    bundle.attributes.find((field) => field.id === "fuel_type")!.cardVisible =
      false;
    expect(
      new TaxonomyV1Service(bundle, 18)
        .projectDomainListing("vehicles", "FR", attributes)
        ?.cardCharacteristics.map((row) => row.code),
    ).not.toContain("fuel_type");
  });
});
