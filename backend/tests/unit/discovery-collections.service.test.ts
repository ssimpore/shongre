import { describe, expect, it, vi } from "vitest";
import { requireApiMarketContext } from "../../src/modules/markets/request-market-context.js";
import { DiscoveryCollectionsService } from "../../src/modules/discovery/discovery-collections.service.js";
import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";

describe("DiscoveryCollectionsService", () => {
  it("resolves every visible root through one exact inventory batch", async () => {
    const taxonomy = new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 47);
    const repository = new DemoListingRepository({});
    const inventory = vi
      .spyOn(repository, "getDiscoveryCollectionInventory")
      .mockResolvedValue([
        {
          rootId: "electronics",
          listingCount: 12,
          coverImageUrl: "https://media.example/electronics.jpg",
        },
      ]);
    const service = new DiscoveryCollectionsService(repository, {
      snapshot: async () => taxonomy,
    });

    const page = await service.getCollections(
      requireApiMarketContext("FR"),
      "fr-FR",
    );

    expect(inventory).toHaveBeenCalledTimes(1);
    expect(inventory).toHaveBeenCalledWith(
      expect.objectContaining({
        marketCode: "FR",
        groups: expect.arrayContaining([
          expect.objectContaining({
            rootId: "electronics",
            categoryIds: expect.arrayContaining([
              "electronics",
              "electronics.smartphones.phones",
            ]),
          }),
        ]),
      }),
    );
    expect(page.taxonomyRevision).toBe(47);
    expect(page.collections).toEqual([
      expect.objectContaining({
        id: "electronics",
        listingCount: 12,
        coverImageUrl: "https://media.example/electronics.jpg",
      }),
    ]);
  });
});
