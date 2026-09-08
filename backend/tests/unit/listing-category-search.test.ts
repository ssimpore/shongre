import { describe, expect, it } from "vitest";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";

describe("category discovery repository parity", () => {
  it("includes exact and descendant categories like PostgreSQL, without matching similar prefixes", async () => {
    const categories = [
      "home_garden",
      "home_garden.furniture.chairs",
      "home_gardenish",
      "vehicles.bicycles",
    ];
    const repository = new DemoListingRepository(
      Object.fromEntries(
        categories.map((categoryId, index) => {
          const id = `category-${index}`;
          return [id, { ...CANONICAL_DEMO_LISTINGS.list_1, id, categoryId }];
        }),
      ),
    );
    const result = await repository.searchDiscoveryCandidates(
      { marketCode: "FR", categoryId: "home_garden" },
      { limit: 50 },
    );
    expect(result.items.map((listing) => listing.categoryId).sort()).toEqual([
      "home_garden",
      "home_garden.furniture.chairs",
    ]);
    const leaf = await repository.search({
      marketCode: "FR",
      categoryId: "home_garden.furniture.chairs",
    });
    expect(leaf.items).toHaveLength(1);
    expect(leaf.items[0]?.categoryId).toBe("home_garden.furniture.chairs");
  });
});
