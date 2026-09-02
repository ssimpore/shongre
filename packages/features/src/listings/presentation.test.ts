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
      }),
    ).toEqual(["Appartement", "68 m²"]);
  });
});
