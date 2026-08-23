import { describe, expect, it } from "vitest";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoDiscoveryConfigurationRepository } from "../../src/infrastructure/database/repositories/discovery-configuration.repository.js";
import { UnifiedDiscoveryService } from "../../src/modules/discovery/discovery.service.js";
import type { Listing } from "../../src/shared/types/index.js";

const NOW = "2026-08-23T10:00:00.000Z";

function listing(
  id: string,
  sellerId: string,
  publisherType: "private" | "professional",
  overrides: Partial<Listing> = {},
): Listing {
  return {
    id,
    sellerId,
    publisherType,
    publisherUserId: sellerId,
    publisherOrganizationId:
      publisherType === "professional" ? `org_${sellerId}` : undefined,
    publisherVerificationStatus:
      publisherType === "professional"
        ? "business_verified"
        : "identity_verified",
    categoryId: "bicycles",
    title: `Vélo gravel ${id}`,
    description: "Vélo révisé avec freins à disque et cinq photos détaillées.",
    price: 650,
    currency: "EUR",
    status: "published",
    condition: "tres-bon-etat",
    marketCode: "FR",
    city: "Lyon",
    postalCode: "69002",
    country: "FR",
    allowedDelivery: ["hand_delivery"],
    images: ["one.jpg", "two.jpg", "three.jpg", "four.jpg", "five.jpg"],
    viewCount: 0,
    favoriteCount: 0,
    attributes: { taxonomyValid: true, pricePlausibilityScore: 0.8 },
    createdAt: NOW,
    publishedAt: NOW,
    organicFreshnessAt: NOW,
    updatedAt: NOW,
    expiresAt: "2026-10-23T10:00:00.000Z",
    ...overrides,
  };
}

describe("UnifiedDiscoveryService", () => {
  it("mixes both publisher types and inserts only a labelled paid placement", async () => {
    const records: Record<string, Listing> = {
      private1: listing("private1", "user-1", "private"),
      private2: listing("private2", "user-2", "private"),
      private3: listing("private3", "user-3", "private"),
      private4: listing("private4", "user-4", "private"),
      promoted: listing("promoted", "pro-1", "professional", {
        promotionState: "active",
        promotionType: "sponsored_search",
        promotionSource: "purchase",
        promotionSourceId: "order-paid-1",
        promotionLabel: "Sponsorisé",
        promotionStartAt: "2026-08-22T10:00:00.000Z",
        promotionEndAt: "2099-08-30T10:00:00.000Z",
      }),
    };
    const service = new UnifiedDiscoveryService(
      new DemoListingRepository(records),
      new DemoDiscoveryConfigurationRepository(),
    );
    const result = await service.search({
      marketCode: "FR",
      query: "vélo gravel",
      sortBy: "relevance",
      limit: 20,
    });
    expect(result.items.some((item) => item.publisherType === "private")).toBe(
      true,
    );
    expect(
      result.items.some((item) => item.publisherType === "professional"),
    ).toBe(true);
    expect(
      result.items.find((item) => item.id === "promoted")?.discovery,
    ).toMatchObject({
      isSponsored: true,
      promotionLabel: "Sponsorisé",
    });
    expect(result.items.find((item) => item.id === "promoted")?.createdAt).toBe(
      NOW,
    );
  });

  it("keeps the default seller filter unified and honors an explicit private filter", async () => {
    const service = new UnifiedDiscoveryService(
      new DemoListingRepository({
        private: listing("private", "user-1", "private"),
        pro: listing("pro", "pro-1", "professional"),
      }),
      new DemoDiscoveryConfigurationRepository(),
    );
    const unified = await service.search({ marketCode: "FR" });
    const privateOnly = await service.search({
      marketCode: "FR",
      sellerType: "private",
    });
    expect(unified.items).toHaveLength(2);
    expect(privateOnly.items.map((item) => item.id)).toEqual(["private"]);
  });
});
