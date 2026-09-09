import { describe, expect, it } from "vitest";
import type { TaxonomyV1Node } from "@shongre/contracts";
import { projectTaxonomyTreeItems } from "../../src/modules/taxonomy/taxonomy.tree-projection.js";

const node = (
  id: string,
  slug: string,
  level: number,
): TaxonomyV1Node =>
  ({
    id,
    sourceKey: id,
    level,
    slug,
    labels: { "fr-FR": slug },
    iconName: "tag",
    sortOrder: 1,
    status: "active",
    publishable: level > 0,
    sellerEligibility: { individualAllowed: true, professionalAllowed: true },
    marketAvailability: [
      {
        marketCode: "FR",
        status: "active",
        marketplaceEnabled: true,
        indexable: true,
      },
    ],
    seo: { indexable: true },
  }) as unknown as TaxonomyV1Node;

const items = [
  node("vehicles", "vehicules", 0),
  node("vehicles.cars", "voitures", 1),
  node("vehicles.cars.city", "citadines", 2),
  node("real_estate", "immobilier", 0),
];
const aliases = [
  { alias: "autos", canonicalCategoryId: "vehicles.cars" },
] as const;

describe("projectTaxonomyTreeItems", () => {
  it("returns the snapshot untouched when nothing is projected", () => {
    expect(projectTaxonomyTreeItems(items, aliases, {})).toEqual(items);
  });

  it("keeps only the root categories at level zero", () => {
    expect(
      projectTaxonomyTreeItems(items, aliases, { maxLevel: 0 }).map(
        (row) => row.id,
      ),
    ).toEqual(["vehicles", "real_estate"]);
  });

  it("keeps every node at or above the requested depth", () => {
    expect(
      projectTaxonomyTreeItems(items, aliases, { maxLevel: 1 }).map(
        (row) => row.id,
      ),
    ).toEqual(["vehicles", "vehicles.cars", "real_estate"]);
  });

  it("resolves a single category by id, by slug and by alias", () => {
    for (const category of ["vehicles.cars", "voitures", "autos"]) {
      expect(
        projectTaxonomyTreeItems(items, aliases, { category }).map(
          (row) => row.id,
        ),
      ).toEqual(["vehicles.cars"]);
    }
  });

  it("matches an alias without regard to case", () => {
    expect(
      projectTaxonomyTreeItems(items, aliases, { category: "AUTOS" }).map(
        (row) => row.id,
      ),
    ).toEqual(["vehicles.cars"]);
  });

  it("answers empty rather than the whole tree for an unknown category", () => {
    expect(
      projectTaxonomyTreeItems(items, aliases, { category: "inconnu" }),
    ).toEqual([]);
  });

  it("ignores a blank category so the caller keeps the depth it asked for", () => {
    expect(
      projectTaxonomyTreeItems(items, aliases, {
        category: "   ",
        maxLevel: 0,
      }).map((row) => row.id),
    ).toEqual(["vehicles", "real_estate"]);
  });

  it("applies the depth before the category, so a hidden node stays hidden", () => {
    expect(
      projectTaxonomyTreeItems(items, aliases, {
        category: "citadines",
        maxLevel: 1,
      }),
    ).toEqual([]);
  });
});
