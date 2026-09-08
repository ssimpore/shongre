import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiOperation } from "./generated-api-operation";
import { HttpSearchService } from "./http-search.service";

vi.mock("./generated-api-operation", () => ({
  apiOperation: vi.fn(),
}));

describe("HttpSearchService", () => {
  beforeEach(() => {
    vi.mocked(apiOperation).mockReset();
  });

  it("maps backend listings to the frontend listing contract", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      items: [
        {
          id: "listing-1",
          sellerId: "seller-1",
          categoryId: "home.furniture",
          title: "Table",
          description: "Table en chêne",
          price: 120,
          currency: "EUR",
          status: "published",
          condition: "good",
          marketCode: "FR",
          city: "Lyon",
          postalCode: "69001",
          country: "FR",
          allowedDelivery: ["hand_delivery"],
          images: ["https://images.example/table.jpg"],
          attributes: {},
          viewCount: 4,
          favoriteCount: 2,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
          expiresAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      totalRelation: "exact",
      snapshotAt: "2026-08-01T00:00:00.000Z",
      pageInfo: { hasNextPage: false },
      requestId: "82e82ea1-e094-4f12-aa0e-2af272346728",
      rankingVersion: "discovery-v1",
    });

    const result = await new HttpSearchService().search({ marketCode: "FR" });

    expect(result.items[0]).toMatchObject({
      id: "listing-1",
      status: "active",
      coverImageUrl: "https://images.example/table.jpg",
      photos: [
        {
          id: "listing-1:media:0",
          url: "https://images.example/table.jpg",
          isCover: true,
        },
      ],
      deliveryOptions: [{ type: "hand_delivery", available: true, price: 0 }],
    });
    expect(apiOperation).toHaveBeenCalledWith("getListingsSearch", {
      credentials: "omit",
      query: { marketCode: "FR" },
      signal: undefined,
    });
  });

  it("normalizes equivalent filters for cacheable GET and forwards cancellation", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
      totalRelation: "exact",
      snapshotAt: "2026-08-01T00:00:00.000Z",
      pageInfo: { hasNextPage: false },
      requestId: "82e82ea1-e094-4f12-aa0e-2af272346728",
      rankingVersion: "discovery-v1",
    });
    const controller = new AbortController();

    await new HttpSearchService().search(
      {
        marketCode: "fr",
        conditions: ["good", "very_good", "good"],
        attributes: { z: "last", a: "first" },
      },
      { signal: controller.signal },
    );

    expect(apiOperation).toHaveBeenCalledWith("getListingsSearch", {
      credentials: "omit",
      query: {
        attributes: JSON.stringify({ a: "first", z: "last" }),
        conditions: "good,very_good",
        marketCode: "FR",
      },
      signal: controller.signal,
    });
  });

  it("uses POST only when canonical filters exceed the safe URL length", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
      totalRelation: "exact",
      snapshotAt: "2026-08-01T00:00:00.000Z",
      pageInfo: { hasNextPage: false },
      requestId: "82e82ea1-e094-4f12-aa0e-2af272346728",
      rankingVersion: "discovery-v1",
    });
    const filters = {
      marketCode: "FR",
      attributes: { notes: "x".repeat(1_900) },
    };

    await new HttpSearchService().search(filters);

    expect(apiOperation).toHaveBeenCalledWith("postListingsSearch", {
      body: filters,
      credentials: "omit",
      signal: undefined,
    });
  });
});
