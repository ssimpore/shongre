import { describe, expect, it } from "vitest";
import { DemoTaxonomyRepository } from "../../src/infrastructure/database/repositories/taxonomy.repository.js";
import { TaxonomyService } from "../../src/modules/taxonomy/taxonomy.service.js";
import { TaxonomyValidationService } from "../../src/modules/taxonomy/taxonomy.validation.js";

describe("taxonomy publication validation", () => {
  const validation = new TaxonomyValidationService(
    new TaxonomyService(new DemoTaxonomyRepository()),
  );

  it("rejects missing required vehicle fields and rogue attributes", async () => {
    const result = await validation.validateListingAttributes(
      "vehicles.cars.city_cars",
      {
        mileage: 120000,
        unknown_field: "not allowed",
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["ATTRIBUTE_REQUIRED", "UNKNOWN_ATTRIBUTE"]),
    );
  });

  it("accepts a complete vehicle attribute payload", async () => {
    const result = await validation.validateListingAttributes(
      "vehicles.cars.city_cars",
      {
        title: "Renault Mégane d'occasion",
        description: "Berline entretenue avec historique disponible.",
        images: ["https://images.example.test/megane.jpg"],
        price: 1_250_000,
        listing_intent: "sell",
        price_type: "fixed",
        currency: "EUR",
        city: "Lyon",
        vehicle_type: "car",
        brand: "renault",
        model: "megane",
        model_year: 2020,
        mileage: 120000,
        fuel_type: "petrol",
        transmission: "manual",
        condition: "very_good",
      },
    );

    expect(result).toEqual({ isValid: true, issues: [] });
  });
});
