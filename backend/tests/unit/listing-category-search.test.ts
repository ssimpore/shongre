import { describe, expect, it } from "vitest";
import { UnifiedDiscoveryService } from "../../src/modules/discovery/discovery.service.js";
import { DemoDiscoveryConfigurationRepository } from "../../src/infrastructure/database/repositories/discovery-configuration.repository.js";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";
import type { Listing } from "../../src/shared/types/index.js";

describe("category discovery repository parity", () => {
  it.each(TAXONOMY_V1_PRIVATE_BUNDLE.categories.map((category) => category.id))(
    "keeps all seller filters consistent for %s",
    async (categoryId) => {
      const records = Object.fromEntries(
        (["private", "professional"] as const).map((publisherType) => {
          const id = `${categoryId}-${publisherType}`;
          const listing: Listing = {
            ...CANONICAL_DEMO_LISTINGS.list_1,
            id,
            categoryId: categoryId,
            sellerId: id,
            publisherUserId: id,
            publisherOrganizationId:
              publisherType === "professional"
                ? `organization-${id}`
                : undefined,
            publisherType,
            duplicateGroupId: undefined,
            seller: undefined,
          };
          return [id, listing];
        }),
      );
      const service = new UnifiedDiscoveryService(
        new DemoListingRepository(records),
        new DemoDiscoveryConfigurationRepository(),
      );
      const filters = { marketCode: "FR", categoryId: categoryId };
      const all = await service.search({ ...filters, sellerType: "all" });
      const individual = await service.search({
        ...filters,
        sellerType: "individual",
      });
      const professional = await service.search({
        ...filters,
        sellerType: "pro",
      });
      expect(all.items.map((listing) => listing.id).sort(), categoryId).toEqual(
        Object.keys(records).sort(),
      );
      expect(
        individual.items.map((listing) => listing.id),
        categoryId,
      ).toEqual([`${categoryId}-private`]);
      expect(
        professional.items.map((listing) => listing.id),
        categoryId,
      ).toEqual([`${categoryId}-professional`]);
    },
  );

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
