import { describe, expect, it } from "vitest";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoTrendingRepository } from "../../src/infrastructure/database/repositories/trending.repository.js";
import { TrendingService } from "../../src/modules/trending/trending.service.js";

describe("TrendingService", () => {
  it("rejects malformed market codes before querying listings", async () => {
    const service = new TrendingService(
      new DemoTrendingRepository(),
      new DemoListingRepository(),
    );

    await expect(
      service.getSection({ marketCode: "FRA" }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("serves active physical and digital listings and honors hidden overrides", async () => {
    const trendingRepository = new DemoTrendingRepository();
    const service = new TrendingService(
      trendingRepository,
      new DemoListingRepository(),
    );

    const visible = await service.getSection({ marketCode: "FR" });
    expect(visible.enabled).toBe(true);
    expect(visible.topics).toHaveLength(2);
    expect(
      visible.topics.every((topic) =>
        topic.listings.every((listing) => listing.status === "published"),
      ),
    ).toBe(true);
    expect(visible.topics.map((topic) => topic.id)).toContain(
      "category:digital_products.downloads.documents",
    );

    await trendingRepository.upsertOverride("FR", {
      topicKey: "bicycles",
      topicType: "category",
      isHidden: true,
    });
    const hidden = await service.getSection({ marketCode: "FR" });
    expect(hidden.topics).toHaveLength(1);
    expect(hidden.topics[0].id).toBe(
      "category:digital_products.downloads.documents",
    );
  });
});
