import { describe, expect, it } from "vitest";
import type { DiscoveryDocument } from "../src/discovery/unified-discovery";
import {
  DEFAULT_DISCOVERY_CONFIGURATION,
  runUnifiedDiscovery,
  scoreOrganicListing,
} from "../src/discovery/unified-discovery";

const NOW = "2026-08-23T10:00:00.000Z";

function listing(
  id: string,
  publisherId: string,
  publisherType: "private" | "professional",
  overrides: Partial<DiscoveryDocument> = {},
): DiscoveryDocument {
  return {
    id,
    publisherId,
    publisherType,
    marketCodes: ["FR"],
    categoryId: "bicycles",
    title: "Vélo gravel aluminium",
    description: "Vélo révisé avec freins à disque, disponible immédiatement.",
    searchableAttributes: ["gravel", "aluminium"],
    priceMinor: 65000,
    currency: "EUR",
    city: "Lyon",
    status: "published",
    availability: "available",
    moderationStatus: "approved",
    publisherStatus: "active",
    createdAt: "2026-08-15T10:00:00.000Z",
    publishedAt: "2026-08-15T10:00:00.000Z",
    organicFreshnessAt: "2026-08-15T10:00:00.000Z",
    quality: {
      requiredFieldsComplete: true,
      recommendedFieldRatio: 0.8,
      descriptionLength: 250,
      imageCount: 5,
      mediaQuality: 0.8,
      taxonomyValid: true,
      pricePlausibility: 0.8,
    },
    trust: {
      verificationStatus:
        publisherType === "professional"
          ? "business_verified"
          : "identity_verified",
      accountAgeDays: 400,
      rating: 4.8,
      reviewCount: 25,
      responseRate: 92,
      successfulActivityCount: 15,
      confirmedReportCount: 0,
    },
    ...overrides,
  };
}

describe("unified discovery", () => {
  it("gives equivalent organic treatment independent of publisher type and plan", () => {
    const privateListing = listing("private", "private-1", "private");
    const professionalListing = listing("pro", "org-1", "professional");
    professionalListing.trust.verificationStatus = "identity_verified";
    const request = {
      requestId: "fairness",
      marketCode: "FR",
      query: "vélo gravel",
      now: NOW,
    };
    expect(scoreOrganicListing(privateListing, request).organicScore).toBe(
      scoreOrganicListing(professionalListing, request).organicScore,
    );
    expect(String(scoreOrganicListing)).not.toMatch(/subscription|plan|spend/i);
  });

  it("keeps promotion out of organic scoring and labels the inserted placement", () => {
    const organic = listing("organic", "private-1", "private");
    const promoted = listing("promoted", "org-1", "professional", {
      promotion: {
        state: "active",
        type: "sponsored_search",
        source: "purchase",
        sourceId: "paid-order-1",
        startsAt: "2026-08-22T00:00:00.000Z",
        endsAt: "2026-08-30T00:00:00.000Z",
        label: "Sponsorisé",
      },
    });
    expect(
      scoreOrganicListing(organic, {
        requestId: "score",
        marketCode: "FR",
        now: NOW,
      }),
    ).toEqual(
      scoreOrganicListing(promoted, {
        requestId: "score",
        marketCode: "FR",
        now: NOW,
      }),
    );
    const result = runUnifiedDiscovery(
      [
        organic,
        promoted,
        listing("other-1", "private-2", "private"),
        listing("other-2", "private-3", "private"),
        listing("other-3", "private-4", "private"),
      ],
      { requestId: "placement", marketCode: "FR", query: "gravel", now: NOW },
    );
    expect(
      result.items.find((item) => item.document.id === "promoted")
        ?.presentation,
    ).toMatchObject({
      isSponsored: true,
      promotionLabel: "Sponsorisé",
      placementReason: "sponsored_relevant",
    });
  });

  it("rejects irrelevant, expired and refunded sponsored candidates", () => {
    const documents = [
      listing("organic-1", "p1", "private"),
      listing("organic-2", "p2", "private"),
      listing("organic-3", "p3", "private"),
      listing("organic-4", "p4", "private"),
      listing("expired", "p5", "professional", {
        promotion: {
          state: "active",
          type: "sponsored_search",
          source: "purchase",
          sourceId: "order-expired",
          endsAt: "2026-08-22T00:00:00.000Z",
        },
      }),
      listing("refunded", "p6", "professional", {
        promotion: {
          state: "refunded",
          type: "sponsored_search",
          source: "purchase",
          sourceId: "order-refunded",
          endsAt: "2026-08-30T00:00:00.000Z",
        },
      }),
      listing("irrelevant", "p7", "professional", {
        title: "Canapé en velours",
        description: "Mobilier de salon",
        searchableAttributes: [],
        promotion: {
          state: "active",
          type: "sponsored_search",
          source: "purchase",
          sourceId: "order-irrelevant",
          endsAt: "2026-08-30T00:00:00.000Z",
        },
      }),
    ];
    const result = runUnifiedDiscovery(documents, {
      requestId: "invalid-promotions",
      marketCode: "FR",
      query: "vélo gravel",
      now: NOW,
    });
    expect(result.event.sponsoredCandidateCount).toBe(0);
    expect(result.items.every((item) => !item.presentation.isSponsored)).toBe(
      true,
    );
  });

  it("suppresses exact duplicates and prevents one inventory monopolizing the first page", () => {
    const largeInventory = Array.from({ length: 9 }, (_, index) =>
      listing(`large-${index}`, "large-org", "professional", {
        title: `Vélo gravel série ${index}`,
        priceMinor: 50000 + index,
      }),
    );
    const alternatives = Array.from({ length: 8 }, (_, index) =>
      listing(`private-${index}`, `private-${index}`, "private", {
        title: `Vélo gravel particulier ${index}`,
        priceMinor: 60000 + index,
      }),
    );
    const duplicate = listing("duplicate", "private-0", "private", {
      title: "Vélo gravel particulier 0",
      priceMinor: 60000,
    });
    const result = runUnifiedDiscovery(
      [...largeInventory, ...alternatives, duplicate],
      { requestId: "diversity", marketCode: "FR", pageSize: 10, now: NOW },
      DEFAULT_DISCOVERY_CONFIGURATION,
    );
    expect(result.event.duplicateSuppressionCount).toBe(1);
    const firstPage = result.items.filter(
      (item) => !item.presentation.isSponsored,
    );
    expect(
      firstPage.filter((item) => item.document.publisherId === "large-org")
        .length,
    ).toBeLessThanOrEqual(3);
    expect(
      firstPage.some((item) => item.document.publisherType === "private"),
    ).toBe(true);
  });

  it("keeps organic pagination stable when sponsored placements are inserted", () => {
    const documents = Array.from({ length: 26 }, (_, index) =>
      listing(
        `stable-${index}`,
        `publisher-${index}`,
        index % 2 ? "private" : "professional",
        {
          title: `Vélo gravel stable ${index}`,
          priceMinor: 50_000 + index,
          promotion:
            index < 2
              ? {
                  state: "active",
                  type: "sponsored_search",
                  source: "purchase",
                  sourceId: `paid-order-${index}`,
                  endsAt: "2026-08-30T00:00:00.000Z",
                  label: "Sponsorisé",
                }
              : undefined,
        },
      ),
    );
    const request = {
      requestId: "stable-pagination",
      marketCode: "FR",
      pageSize: 10,
      now: NOW,
    };
    const first = runUnifiedDiscovery(documents, { ...request, page: 1 });
    const second = runUnifiedDiscovery(documents, { ...request, page: 2 });
    const firstIds = new Set(first.items.map((item) => item.document.id));
    expect(second.items.every((item) => !firstIds.has(item.document.id))).toBe(
      true,
    );
    expect(first.totalResults).toBe(26);
    expect(first.nextCursor).toBeTruthy();
  });
});
