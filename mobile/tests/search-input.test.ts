import { describe, expect, it } from "vitest";
import {
  mobileSavedSearchTargetId,
  parseMobileSearchPriceRange,
} from "@/features/listings/search-input";

describe("mobile search price input", () => {
  it("keeps alerts for distinct categories and price ranges separate", () => {
    const base = { marketCode: "FR", query: "vélo", locale: "fr-FR" };
    const first = mobileSavedSearchTargetId({
      ...base,
      categoryId: "vehicles.bikes",
      minPriceMinor: 1000,
    });
    expect(first).toBe(
      mobileSavedSearchTargetId({
        ...base,
        categoryId: "vehicles.bikes",
        minPriceMinor: 1000,
      }),
    );
    expect(first).not.toBe(
      mobileSavedSearchTargetId({
        ...base,
        categoryId: "vehicles.cars",
        minPriceMinor: 1000,
      }),
    );
    expect(first).not.toBe(
      mobileSavedSearchTargetId({
        ...base,
        categoryId: "vehicles.bikes",
        minPriceMinor: 2000,
      }),
    );
  });
  it("accepts empty and localized decimal bounds", () => {
    expect(parseMobileSearchPriceRange("", "")).toMatchObject({
      minimum: undefined,
      maximum: undefined,
      minimumError: "",
      maximumError: "",
    });
    expect(parseMobileSearchPriceRange("10,50", "25")).toMatchObject({
      minimum: 10.5,
      maximum: 25,
      minimumError: "",
      maximumError: "",
    });
  });

  it("identifies invalid and negative bounds", () => {
    expect(parseMobileSearchPriceRange("abc", "-1")).toMatchObject({
      minimumError: "Saisissez un prix minimum valide.",
      maximumError: "Saisissez un prix maximum valide.",
    });
  });

  it("identifies an inverted range on both related fields", () => {
    expect(parseMobileSearchPriceRange("30", "20")).toMatchObject({
      minimumError: "Le prix minimum doit être inférieur au maximum.",
      maximumError: "Le prix maximum doit être supérieur au minimum.",
    });
  });
});
