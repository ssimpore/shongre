import { describe, expect, it } from "vitest";
import {
  toApplicationListingCondition,
  toTaxonomyV4ItemCondition,
} from "./publication";

describe("taxonomy v4 publication compatibility", () => {
  it.each([
    ["new_with_tag", "new"],
    ["like_new", "like_new"],
    ["very_good", "very_good"],
    ["good", "good"],
    ["fair", "fair"],
    ["for_parts", "for_parts"],
    ["vehicle_to_repair", "damaged"],
    ["pro_refurbished", "like_new"],
  ])("maps %s to the workbook option %s", (source, expected) => {
    expect(toTaxonomyV4ItemCondition(source)).toBe(expected);
  });

  it("does not invent a condition for unrelated application states", () => {
    expect(toTaxonomyV4ItemCondition("not_applicable")).toBeUndefined();
    expect(toTaxonomyV4ItemCondition(undefined)).toBeUndefined();
  });

  it.each([
    [{ condition: "very_good" }, "very_good"],
    [{ property_condition: "a_rafraichir" }, "re_to_refresh"],
    [{ equipment_condition: "reconditionne" }, "pro_refurbished"],
  ])(
    "projects an explicit v4 condition back to listing compatibility",
    (attributes, expected) => {
      expect(toApplicationListingCondition(attributes, "good")).toBe(expected);
    },
  );
});
