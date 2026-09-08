import { describe, expect, it } from "vitest";
import {
  PUBLICATION_CONSTRAINTS,
  publicationInputSchema,
  toApplicationListingCondition,
  toTaxonomyV4ItemCondition,
} from "./publication";

describe("product publication title limit", () => {
  const input = {
    description: "Description du produit avec ses accessoires.",
    amountMinor: 1000,
    currency: "EUR",
    categoryId: "electronics.smartphones.phones",
    marketCode: "FR",
    condition: "good",
    city: "Lyon",
    postalCode: "69002",
  };
  it("accepts the full boundary and rejects one extra character without trimming data", () => {
    expect(PUBLICATION_CONSTRAINTS.title.maxLength).toBe(50);
    const title = "é".repeat(PUBLICATION_CONSTRAINTS.title.maxLength);
    expect(publicationInputSchema.parse({ ...input, title }).title).toBe(title);
    const rejected = publicationInputSchema.safeParse({
      ...input,
      title: `${title}!`,
    });
    expect(rejected.success).toBe(false);
    if (!rejected.success)
      expect(rejected.error.issues[0].path).toEqual(["title"]);
  });
});

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
