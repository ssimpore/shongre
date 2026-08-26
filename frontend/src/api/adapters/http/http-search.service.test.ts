import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "./http-client";
import { HttpSearchService } from "./http-search.service";

vi.mock("./http-client", () => ({
  httpClient: { post: vi.fn() },
}));

describe("HttpSearchService", () => {
  beforeEach(() => {
    vi.mocked(httpClient.post).mockReset();
  });

  it("maps backend listings to the frontend listing contract", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({
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
  });
});
