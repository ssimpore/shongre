import { describe, expect, it } from "vitest";
import {
  isActiveMarketResolvedListingPromotion,
  marketResolvedListingPromotionSchema,
} from "./discovery";

const promotion = {
  state: "active",
  type: "featured",
  marketCode: "FR",
  source: "purchase",
  sourceId: "order-1",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-09-30T00:00:00.000Z",
} as const;

describe("market-resolved listing promotion contract", () => {
  it("requires an explicit market, placement and bounded schedule", () => {
    expect(marketResolvedListingPromotionSchema.parse(promotion)).toEqual(
      promotion,
    );
    expect(
      marketResolvedListingPromotionSchema.safeParse({
        ...promotion,
        marketCode: undefined,
      }).success,
    ).toBe(false);
    expect(
      marketResolvedListingPromotionSchema.safeParse({
        ...promotion,
        endsAt: undefined,
      }).success,
    ).toBe(false);
    expect(
      marketResolvedListingPromotionSchema.safeParse({
        ...promotion,
        sourceId: undefined,
      }).success,
    ).toBe(false);
  });

  it("rejects an empty or reversed promotion window", () => {
    expect(
      marketResolvedListingPromotionSchema.safeParse({
        ...promotion,
        startsAt: promotion.endsAt,
      }).success,
    ).toBe(false);
    expect(
      marketResolvedListingPromotionSchema.safeParse({
        ...promotion,
        startsAt: "2026-10-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("accepts ranking only inside the exact market schedule", () => {
    const current = Date.parse("2026-09-15T00:00:00.000Z");

    expect(
      isActiveMarketResolvedListingPromotion(promotion, "FR", current),
    ).toBe(true);
    expect(
      isActiveMarketResolvedListingPromotion(promotion, "BE", current),
    ).toBe(false);
    expect(
      isActiveMarketResolvedListingPromotion(
        promotion,
        "FR",
        Date.parse("2026-10-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("fails closed for a malformed runtime projection", () => {
    expect(
      isActiveMarketResolvedListingPromotion(
        { ...promotion, sourceId: undefined } as never,
        "FR",
        Date.parse("2026-09-15T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
