import { describe, expect, it } from "vitest";
import { DemoSearchService } from "./demo-search.service";

describe("DemoSearchService unified discovery", () => {
  it("returns private and professional listings together by default", async () => {
    const result = await new DemoSearchService().search({
      marketCode: "FR",
      limit: 100,
    });
    expect(
      result.items.some((listing) => listing.sellerType === "individual"),
    ).toBe(true);
    expect(result.items.some((listing) => listing.sellerType === "pro")).toBe(
      true,
    );
  });

  it("applies an explicit seller filter without changing the default", async () => {
    const result = await new DemoSearchService().search({
      marketCode: "FR",
      sellerType: "individual",
      limit: 100,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((listing) => listing.sellerType === "individual"),
    ).toBe(true);
  });

  it("keeps professional offers from every vertical in the shared search", async () => {
    const result = await new DemoSearchService().search({
      marketCode: "FR",
      sellerType: "pro",
      limit: 50,
    });
    const verticals = new Set(
      result.items.map((listing) => listing.attributes.verticalType),
    );

    expect(result.items.every((listing) => listing.sellerType === "pro")).toBe(
      true,
    );
    expect(Array.from(verticals)).toEqual(
      expect.arrayContaining([
        "automotive",
        "employment",
        "real_estate",
        "tutoring",
      ]),
    );
  });

  it.each([
    ["vehicles", "vehicles.cars", { fuel_type: "diesel" }, "automotive"],
    [
      "real_estate",
      "real_estate.rentals",
      { property_type: "apartment" },
      "real_estate",
    ],
    ["jobs", "jobs.offers", { contract_type: "permanent" }, "employment"],
    [
      "education",
      "education.academic",
      { subject: "Mathématiques" },
      "tutoring",
    ],
  ])(
    "filters %s with canonical vertical attributes",
    async (categorySlug, subCategorySlug, attributes, verticalType) => {
      const result = await new DemoSearchService().search({
        marketCode: "FR",
        categorySlug,
        subCategorySlug,
        attributes,
        limit: 50,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(
        result.items.every(
          (listing) => listing.attributes.verticalType === verticalType,
        ),
      ).toBe(true);
    },
  );

  it("returns data-derived values for taxonomy facets without static options", async () => {
    const result = await new DemoSearchService().search({
      marketCode: "FR",
      categorySlug: "education",
      subCategorySlug: "education.academic",
      limit: 50,
    });

    expect(result.facets?.attributes.subject).toContainEqual({
      value: "Mathématiques",
      count: 5,
    });
  });

  it("exposes every result exactly once across URL-addressable pages", async () => {
    const service = new DemoSearchService();
    const first = await service.search({
      marketCode: "FR",
      page: 1,
      limit: 24,
    });
    const pages = await Promise.all(
      Array.from({ length: first.totalPages }, (_, index) =>
        service.search({ marketCode: "FR", page: index + 1, limit: 24 }),
      ),
    );
    const ids = pages.flatMap((result) =>
      result.items.map((listing) => listing.id),
    );

    expect(new Set(ids).size).toBe(first.total);
    expect(ids).toHaveLength(first.total);
  });

  it("labels every inserted promotion and preserves genuine creation time", async () => {
    const result = await new DemoSearchService().search({
      marketCode: "FR",
      limit: 100,
    });
    const promoted = result.items.find(
      (listing) => listing.discovery?.isSponsored,
    );
    expect(promoted).toBeDefined();
    if (!promoted) throw new Error("Expected a sponsored demo listing");
    expect(promoted.discovery?.promotionLabel).toBeTruthy();
    expect(promoted.discovery?.promotionImpressionId).toMatch(/^spi_/);
    expect(promoted.createdAt).not.toBe(promoted.promotedAt);
  });

  it("supports deterministic empty and error recovery scenarios", async () => {
    await expect(
      new DemoSearchService("empty_search").search({ marketCode: "FR" }),
    ).resolves.toMatchObject({ items: [], total: 0 });
    await expect(
      new DemoSearchService("search_error").search({ marketCode: "FR" }),
    ).rejects.toThrow("Deterministic demo search failure");
  });

  it("returns an explicit Belgian sample without leaking France-only rows", async () => {
    const result = await new DemoSearchService().search({
      marketCode: "BE",
      query: "vélo",
      limit: 50,
    });
    expect(result.items.some((listing) => listing.id === "list-be-201")).toBe(
      true,
    );
    expect(
      result.items.every((listing) =>
        listing.marketPublications?.some(
          (publication) =>
            publication.marketCode === "BE" && publication.status === "active",
        ),
      ),
    ).toBe(true);
  });
});
