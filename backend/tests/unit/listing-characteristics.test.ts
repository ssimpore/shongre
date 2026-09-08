import { describe, expect, it } from "vitest";
import { projectListingCharacteristics } from "../../src/modules/taxonomy/taxonomy.characteristics.js";

const vehicle = {
  categoryId: "vehicles.cars",
  sellerType: "individual" as const,
  marketCode: "FR",
  locale: "fr-FR",
  attributes: {
    brand: "peugeot",
    model: "208",
    year: 2022,
    mileage: 28500,
    fuel: "essence",
    gearbox: "manuelle",
    critair: "1",
  },
};
const items = (input = vehicle) =>
  projectListingCharacteristics(input).groups.flatMap((group) => group.items);

describe("backend listing characteristics", () => {
  it("projects recorded vehicle values without choosing a publishable child category", () => {
    expect(items()).toEqual(
      expect.arrayContaining([
        { code: "brand", label: "Marque", value: "Peugeot" },
        { code: "model_year", label: "Année modèle", value: "2022" },
        {
          code: "mileage",
          label: "Kilométrage / Heures",
          value: "28\u202f500 km",
        },
        { code: "fuel_type", label: "Énergie / Carburant", value: "Essence" },
        { code: "transmission", label: "Boîte de vitesses", value: "Manuelle" },
        {
          code: "critair_class",
          label: "Classe Crit’Air",
          value: "Crit’Air 1",
        },
      ]),
    );
    expect(items()).toHaveLength(7);
    expect(vehicle.categoryId).toBe("vehicles.cars");
  });

  it("uses the selected leaf and canonical values before historical keys", () => {
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
      label: "Année modèle",
      value: "2024",
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
      label: "Fuel / Energy",
      value: "Petrol",
    });
    expect(result).toContainEqual({
      code: "mileage",
      label: "Mileage / Hours",
      value: "0 km",
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
        year: 2022,
        fuel: "essence",
      },
    }).groups.flatMap((group) => group.items);
    expect(result.map((item) => item.code)).toEqual(
      expect.arrayContaining(["living_area", "rooms", "elevator"]),
    );
    expect(result.find((item) => item.code === "elevator")?.value).toBe("Non");
    expect(result.map((item) => item.code)).not.toContain("model_year");
    expect(result.map((item) => item.code)).not.toContain("fuel_type");
  });

  it("restricts professional attributes to the server-resolved seller type", () => {
    const input = { ...vehicle, attributes: { vat_deductible: false } };
    expect(projectListingCharacteristics(input)).toEqual({ groups: [] });
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
