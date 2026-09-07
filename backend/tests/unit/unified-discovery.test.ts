import { describe, expect, it, vi } from "vitest";
import { DEFAULT_DISCOVERY_CONFIGURATION } from "@shongre/shared";
import { DELIVERY_TAXONOMY_CATEGORY_ID } from "@shongre/contracts/delivery";
import { DemoListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { DemoDiscoveryConfigurationRepository } from "../../src/infrastructure/database/repositories/discovery-configuration.repository.js";
import {
  UnifiedDiscoveryService,
  deliveryRequestToDiscoveryListing,
  toDiscoveryDocument,
} from "../../src/modules/discovery/discovery.service.js";
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
  it("keeps cursor pages stable, non-overlapping, and bound to their filters", async () => {
    const repository = new DemoListingRepository({
      first: listing("first", "user-1", "private", {
        createdAt: "2026-08-23T10:05:00.000Z",
        publishedAt: "2026-08-23T10:05:00.000Z",
        organicFreshnessAt: "2026-08-23T10:05:00.000Z",
      }),
      second: listing("second", "user-2", "private", {
        createdAt: "2026-08-23T10:04:00.000Z",
        publishedAt: "2026-08-23T10:04:00.000Z",
        organicFreshnessAt: "2026-08-23T10:04:00.000Z",
      }),
      third: listing("third", "user-3", "private", {
        createdAt: "2026-08-23T10:03:00.000Z",
        publishedAt: "2026-08-23T10:03:00.000Z",
        organicFreshnessAt: "2026-08-23T10:03:00.000Z",
      }),
      fourth: listing("fourth", "user-4", "private", {
        createdAt: "2026-08-23T10:02:00.000Z",
        publishedAt: "2026-08-23T10:02:00.000Z",
        organicFreshnessAt: "2026-08-23T10:02:00.000Z",
      }),
      fifth: listing("fifth", "user-5", "private", {
        createdAt: "2026-08-23T10:01:00.000Z",
        publishedAt: "2026-08-23T10:01:00.000Z",
        organicFreshnessAt: "2026-08-23T10:01:00.000Z",
      }),
    });
    const service = new UnifiedDiscoveryService(
      repository,
      new DemoDiscoveryConfigurationRepository(),
    );
    const firstPage = await service.search({
      marketCode: "FR",
      sortBy: "date_desc",
      limit: 2,
      conditions: ["tres-bon-etat", "bon-etat"],
    });
    expect(firstPage.pageInfo).toMatchObject({ hasNextPage: true });
    expect(firstPage.pageInfo.nextCursor).toBeTruthy();

    await repository.save(
      listing("future", "user-future", "private", {
        createdAt: "2099-01-01T00:00:00.000Z",
        publishedAt: "2099-01-01T00:00:00.000Z",
        organicFreshnessAt: "2099-01-01T00:00:00.000Z",
        updatedAt: "2099-01-01T00:00:00.000Z",
        expiresAt: "2099-03-01T00:00:00.000Z",
      }),
    );
    const secondPage = await service.search({
      marketCode: "FR",
      sortBy: "date_desc",
      limit: 2,
      conditions: ["bon-etat", "tres-bon-etat"],
      cursor: firstPage.pageInfo.nextCursor,
    });

    expect(secondPage.snapshotAt).toBe(firstPage.snapshotAt);
    expect(secondPage.page).toBe(2);
    expect(secondPage.items.map((item) => item.id)).not.toContain("future");
    expect(
      secondPage.items.some((item) =>
        firstPage.items.some((firstItem) => firstItem.id === item.id),
      ),
    ).toBe(false);
    await expect(
      service.search({
        marketCode: "FR",
        query: "different filters",
        sortBy: "date_desc",
        limit: 2,
        conditions: ["bon-etat", "tres-bon-etat"],
        cursor: firstPage.pageInfo.nextCursor,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

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

  it("converts legacy discovery prices with the currency minor-unit exponent", () => {
    const document = toDiscoveryDocument(
      listing("xof-listing", "user-sn", "private", {
        price: 12_500,
        currency: "XOF",
        marketCode: "SN",
        country: "SN",
      }),
    );

    expect(document.priceMinor).toBe(12_500);
  });

  it("adds only gated public-safe delivery projections to Services discovery", async () => {
    const request = {
      id: "418711cb-aee0-4fa3-a102-8ec6ea2a2cb8",
      slug: "livraison-paris-boulogne",
      marketCode: "FR",
      origin: "order" as const,
      status: "open" as const,
      title: "Livrer un petit meuble",
      description: "Transport local d'un meuble protégé.",
      pickupLocality: { city: "Paris", postalCode: "75011" },
      dropoffLocality: {
        city: "Boulogne-Billancourt",
        postalCode: "92100",
      },
      pickupWindow: {
        startsAt: "2027-01-15T09:00:00.000Z",
        endsAt: "2027-01-15T11:00:00.000Z",
      },
      deliveryWindow: {
        startsAt: "2027-01-15T12:00:00.000Z",
        endsAt: "2027-01-15T16:00:00.000Z",
      },
      package: {
        type: "Petit meuble",
        count: 1,
        approximateWeightGrams: 18_000,
        handlingRequirements: ["Fragile"],
        requiredVehicleType: "van" as const,
        loadingAssistanceRequired: true,
      },
      budget: { amountMinor: 4_500, currency: "EUR" },
      requester: { displayName: "Camille", verified: false },
      applicationCount: 1,
      expiresAt: "2027-01-14T20:00:00.000Z",
      publishedAt: "2026-09-05T12:00:00.000Z",
      version: 2,
    };
    const projection = deliveryRequestToDiscoveryListing(request);
    expect(projection.attributes.canonicalPath).toBe(
      `/livraison/demande/${request.id}`,
    );
    expect(JSON.stringify(projection)).not.toContain("sourceOrderId");
    expect(JSON.stringify(projection)).not.toContain("street");
    expect(
      deliveryRequestToDiscoveryListing({
        ...request,
        marketCode: "SN",
        budget: { amountMinor: 4_500, currency: "XOF" },
      }).price,
    ).toBe(4_500);
    expect(
      deliveryRequestToDiscoveryListing({
        ...request,
        publishedAt: undefined,
      }).publishedAt,
    ).toBeUndefined();
    expect(
      deliveryRequestToDiscoveryListing({
        ...request,
        budget: undefined,
      }).attributes.price_type,
    ).toBe("on_request");

    const service = new UnifiedDiscoveryService(
      new DemoListingRepository({}),
      new DemoDiscoveryConfigurationRepository(),
      DEFAULT_DISCOVERY_CONFIGURATION,
      {
        searchPublic: vi.fn().mockResolvedValue({ items: [request] }),
      } as never,
      { evaluatePublic: vi.fn().mockResolvedValue({ enabled: true }) } as never,
    );
    const result = await service.search({
      marketCode: "FR",
      categoryId: "services",
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      listingIntent: "SERVICE_REQUEST",
      categoryId: DELIVERY_TAXONOMY_CATEGORY_ID,
    });
  });
});
