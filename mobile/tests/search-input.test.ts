import { describe, expect, it } from "vitest";
import { parseMobileSearchPriceRange } from "@/features/listings/search-input";

describe("mobile search price input", () => {
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
