import { describe, expect, it } from "vitest";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";

describe("listing search market isolation", () => {
  it("never returns another country's listings by default market scope", async () => {
    const france = {
      ...CANONICAL_DEMO_LISTINGS.list_1,
      marketCodes: ["FR"],
      marketPublications:
        CANONICAL_DEMO_LISTINGS.list_1.marketPublications?.filter(
          (publication) => publication.marketCode === "FR",
        ),
    };
    const belgium = {
      ...france,
      id: "list_be_1",
      title: "Vélo urbain Bruxelles",
      marketCode: "BE",
      country: "BE",
      city: "Bruxelles",
      postalCode: "1000",
      marketCodes: ["BE"],
      marketPublications: [
        {
          marketCode: "BE" as const,
          status: "active" as const,
          isPrimary: true,
          priceMinor: 25_000,
          currency: "EUR",
          complianceState: "approved" as const,
          sortDate: "2026-08-25T10:00:00.000Z",
        },
      ],
    };
    const repository = new DemoListingRepository({
      [france.id]: france,
      [belgium.id]: belgium,
    });

    const fr = await repository.search({ marketCode: "FR" });
    const be = await repository.search({ marketCode: "BE" });
    const ch = await repository.search({ marketCode: "CH" });

    expect(fr.items.map((listing) => listing.id)).toEqual([france.id]);
    expect(be.items.map((listing) => listing.id)).toEqual([belgium.id]);
    expect(ch.items).toEqual([]);
  });

  it("projects only the promotion effective in the requested market", async () => {
    const listing = {
      ...CANONICAL_DEMO_LISTINGS.list_1,
      promotionState: "active" as const,
      promotionType: "featured" as const,
      promotionStartAt: "2026-01-01T00:00:00.000Z",
      promotionEndAt: "2099-01-01T00:00:00.000Z",
      isFeatured: true,
      marketPublications: [
        {
          marketCode: "FR",
          status: "active" as const,
          isPrimary: true,
          priceMinor: 25_000,
          currency: "EUR",
          complianceState: "approved" as const,
          sortDate: "2026-08-24T09:00:00.000Z",
          promotionState: "active" as const,
          promotionType: "urgent_badge" as const,
          promotionSource: "purchase" as const,
          promotionSourceId: "order-fr-urgent",
          promotionLabel: "Urgent",
          promotionStartAt: "2026-01-01T00:00:00.000Z",
          promotionEndAt: "2099-01-01T00:00:00.000Z",
          promotedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          marketCode: "BE",
          status: "active" as const,
          isPrimary: false,
          priceMinor: 26_500,
          currency: "EUR",
          complianceState: "approved" as const,
          sortDate: "2026-08-25T09:00:00.000Z",
          promotionState: "active" as const,
          promotionType: "featured" as const,
          promotionStartAt: "2026-01-01T00:00:00.000Z",
          promotionEndAt: "2099-01-01T00:00:00.000Z",
        },
      ],
    };
    const repository = new DemoListingRepository({ [listing.id]: listing });

    const france = await repository.search({ marketCode: "FR" });
    const belgium = await repository.search({ marketCode: "BE" });

    expect(france.items[0]).toMatchObject({
      marketCode: "FR",
      promotionState: "active",
      promotionType: "urgent_badge",
      promotionSource: "purchase",
      promotionSourceId: "order-fr-urgent",
      isUrgent: true,
      isFeatured: false,
    });
    expect(
      france.items[0]?.marketPublications?.map(({ marketCode }) => marketCode),
    ).toEqual(["FR"]);
    expect(belgium.items[0]).toMatchObject({
      marketCode: "BE",
      promotionState: "inactive",
      isUrgent: false,
      isFeatured: false,
    });
    expect(belgium.items[0]?.promotionType).toBeUndefined();
    expect(belgium.items[0]?.publishedAt).toBeUndefined();
    expect(
      belgium.items[0]?.marketPublications?.map(({ marketCode }) => marketCode),
    ).toEqual(["BE"]);
  });

  it("fails closed for a single-market legacy promotion without provenance", async () => {
    const listing = {
      ...CANONICAL_DEMO_LISTINGS.list_1,
      promotionState: "active" as const,
      promotionType: "featured" as const,
      promotionStartAt: "2026-01-01T00:00:00.000Z",
      promotionEndAt: "2099-01-01T00:00:00.000Z",
      isFeatured: true,
    };
    const repository = new DemoListingRepository({ [listing.id]: listing });

    const result = await repository.search({ marketCode: "FR" });

    expect(result.items[0]).toMatchObject({
      promotionState: "inactive",
      isUrgent: false,
      isFeatured: false,
    });
    expect(result.items[0]?.promotionType).toBeUndefined();
  });
});
