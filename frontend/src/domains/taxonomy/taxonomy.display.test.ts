import { describe, expect, it } from "vitest";
import { getListingSubCategoryLabel } from "./taxonomy.display";
describe("published category labels", () => {
  it("uses the response label and leaves missing data empty", () => {
    expect(
      getListingSubCategoryLabel({ subCategoryLabel: "Téléphones actualisés" }),
    ).toBe("Téléphones actualisés");
    expect(getListingSubCategoryLabel({ subCategoryLabel: "" })).toBe("");
  });
});
