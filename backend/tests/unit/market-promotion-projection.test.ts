import { describe, expect, it, vi } from "vitest";
import {
  getMarketResolvedPromotion,
  loadMarketResolvedPromotions,
  parseMarketResolvedPromotion,
} from "../../src/infrastructure/database/repositories/market-promotion.projection.js";

const activePromotionRow = {
  listing_id: "listing-a",
  market_code: "FR",
  promotion_state: "active",
  promotion_type: "sponsored_search",
  promotion_source: "purchase",
  promotion_source_id: "order-123",
  promotion_label: "Sponsorisé",
  promotion_start_at: "2026-09-01T00:00:00.000Z",
  promotion_end_at: "2026-10-01T00:00:00.000Z",
  promoted_at: "2026-09-01T00:00:00.000Z",
};

describe("market promotion repository projection", () => {
  it("fails closed when an effective row has no immutable source proof", () => {
    expect(
      parseMarketResolvedPromotion({
        ...activePromotionRow,
        promotion_source_id: null,
      }),
    ).toBeUndefined();
    expect(
      parseMarketResolvedPromotion({
        ...activePromotionRow,
        promotion_source: "legacy_flag",
      }),
    ).toBeUndefined();
  });

  it("preserves an already opaque database proof without hashing it again", () => {
    const sourceId = `promotion_${"a".repeat(64)}`;
    expect(
      parseMarketResolvedPromotion({
        ...activePromotionRow,
        promotion_source_id: sourceId,
      })?.sourceId,
    ).toBe(sourceId);
  });

  it("fails closed outside the authoritative promotion schedule", () => {
    expect(
      parseMarketResolvedPromotion(
        activePromotionRow,
        new Date("2026-10-01T00:00:00.000Z"),
      ),
    ).toBeUndefined();
  });

  it("loads one batch and keeps only exact requested listing-market pairs", async () => {
    const rows = [
      activePromotionRow,
      {
        ...activePromotionRow,
        market_code: "BE",
        promotion_source_id: "order-cross-market",
      },
      {
        ...activePromotionRow,
        listing_id: "listing-b",
        market_code: "BE",
        promotion_source: "admin_grant",
        promotion_source_id: "grant-456",
      },
      {
        ...activePromotionRow,
        listing_id: "listing-c",
        promotion_source_id: "",
      },
    ];
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.lte = vi.fn(() => query);
    query.gt = vi.fn(() => Promise.resolve({ data: rows, error: null }));
    const from = vi.fn(() => query);

    const promotions = await loadMarketResolvedPromotions(
      () => ({ from }),
      [
        { listingId: "listing-a", marketCode: "FR" },
        { listingId: "listing-b", marketCode: "BE" },
        { listingId: "listing-c", marketCode: "FR" },
      ],
    );

    expect(from).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("listing_market_publications");
    expect(query.in).toHaveBeenCalledTimes(2);
    expect(query.eq).toHaveBeenCalledTimes(3);
    expect(query.lte).toHaveBeenCalledOnce();
    expect(query.gt).toHaveBeenCalledOnce();
    expect(promotions).toHaveLength(2);
    expect(
      getMarketResolvedPromotion(promotions, "listing-a", "FR"),
    ).toMatchObject({
      marketCode: "FR",
      source: "purchase",
    });
    expect(
      getMarketResolvedPromotion(promotions, "listing-a", "FR")?.sourceId,
    ).toMatch(/^promotion_[a-f0-9]{64}$/);
    expect(
      getMarketResolvedPromotion(promotions, "listing-a", "FR")?.sourceId,
    ).not.toContain("order-123");
    expect(
      getMarketResolvedPromotion(promotions, "listing-a", "BE"),
    ).toBeUndefined();
    expect(
      getMarketResolvedPromotion(promotions, "listing-b", "BE"),
    ).toMatchObject({
      marketCode: "BE",
      source: "admin_grant",
    });
    expect(
      getMarketResolvedPromotion(promotions, "listing-c", "FR"),
    ).toBeUndefined();
  });
});
