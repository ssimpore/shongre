import { describe, expect, it } from "vitest";
import { UnifiedDiscoveryService } from "../../src/modules/discovery/discovery.service.js";
import { DemoDiscoveryConfigurationRepository } from "../../src/infrastructure/database/repositories/discovery-configuration.repository.js";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";

describe("category discovery repository parity", () => {
  it("expands the published hierarchy, including children whose identifiers have another prefix", async () => {
    const categories = [
      "professional_equipment",
      "professional_btp.machinery",
      "professional_equipmentish",
      "vehicles.cycles.bicycles",
    ];
    const repository = new DemoListingRepository(
      Object.fromEntries(
        categories.map((categoryId, index) => {
          const id = `category-${index}`;
          return [id, { ...CANONICAL_DEMO_LISTINGS.list_1, id, categoryId }];
        }),
      ),
    );
    const service = new UnifiedDiscoveryService(
      repository,
      new DemoDiscoveryConfigurationRepository(),
    );
    const result = await service.search({
      marketCode: "FR",
      categoryId: "professional_equipment",
    });
    expect(result.items.map((listing) => listing.categoryId).sort()).toEqual([
      "professional_btp.machinery",
      "professional_equipment",
    ]);
    const leaf = await repository.search({
      marketCode: "FR",
      categoryId: "professional_btp.machinery",
    });
    expect(leaf.items).toHaveLength(1);
    expect(leaf.items[0]?.categoryId).toBe("professional_btp.machinery");
  });
});
