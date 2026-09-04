import { describe, expect, it } from "vitest";
import { getListingCardCharacteristics } from "./presentation";

describe("getListingCardCharacteristics", () => {
  it("keeps category decision fields while removing dedicated and internal values", () => {
    expect(
      getListingCardCharacteristics({
        conditionLabel: "Bon état",
        characteristics: [
          "1 290 currency_minor",
          "Appartement",
          "68 m²",
          "3 pièces",
          "Bon état",
          "Appartement",
        ],
        characteristicIcons: [
          "tag",
          "home",
          "ruler",
          "layout-grid",
          "tag",
          "home",
        ],
      }),
    ).toEqual([
      { icon: "home", label: "Appartement" },
      { icon: "ruler", label: "68 m²" },
    ]);
  });

  it("uses the shared fallback icon for legacy characteristic strings", () => {
    expect(
      getListingCardCharacteristics({
        conditionLabel: "",
        characteristics: ["Artisanal"],
      }),
    ).toEqual([{ icon: "tag", label: "Artisanal" }]);
  });
});
