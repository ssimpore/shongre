import {
  marketResolvedListingPromotionSchema,
  type MarketResolvedListingPromotion,
} from "@shongre/contracts/discovery";
import { requireMarketCode } from "../../../shared/market/market-code.js";
import { createPublicPromotionProofId } from "../../../shared/public-promotion-proof.js";

export interface ListingMarketPromotionScope {
  listingId?: string | null;
  marketCode?: string | null;
}

type MarketPromotionRow = {
  listing_id?: unknown;
  market_code?: unknown;
  promotion_state?: unknown;
  promotion_type?: unknown;
  promotion_source?: unknown;
  promotion_source_id?: unknown;
  promotion_label?: unknown;
  promotion_start_at?: unknown;
  promotion_end_at?: unknown;
  promoted_at?: unknown;
};

const MARKET_PROMOTION_PROJECTION = [
  "listing_id",
  "market_code",
  "promotion_state",
  "promotion_type",
  "promotion_source",
  "promotion_source_id",
  "promotion_label",
  "promotion_start_at",
  "promotion_end_at",
  "promoted_at",
].join(",");

export function listingMarketPromotionKey(
  listingId: string,
  marketCode: string,
): string {
  return `${listingId}:${requireMarketCode(marketCode)}`;
}

export function parseMarketResolvedPromotion(
  row: MarketPromotionRow,
  now = new Date(),
): MarketResolvedListingPromotion | undefined {
  if (
    typeof row.listing_id !== "string" ||
    typeof row.market_code !== "string" ||
    row.promotion_state !== "active" ||
    typeof row.promotion_source !== "string" ||
    typeof row.promotion_source_id !== "string" ||
    !row.promotion_source_id.trim()
  )
    return undefined;

  const parsed = marketResolvedListingPromotionSchema.safeParse({
    state: row.promotion_state,
    type: row.promotion_type,
    marketCode: row.market_code,
    source: row.promotion_source,
    // The client only needs proof that the backend resolved immutable source
    // evidence. Keep commercial order, entitlement and grant identifiers
    // private by exposing a one-way projection identifier instead.
    sourceId: createPublicPromotionProofId({
      listingId: row.listing_id,
      marketCode: row.market_code,
      source: row.promotion_source,
      sourceId: row.promotion_source_id,
    }),
    label: row.promotion_label,
    startsAt: row.promotion_start_at,
    endsAt: row.promotion_end_at,
    promotedAt: row.promoted_at,
  });
  if (!parsed.success) return undefined;
  const startsAt = Date.parse(parsed.data.startsAt);
  const endsAt = Date.parse(parsed.data.endsAt);
  const nowTime = now.getTime();
  return Number.isFinite(nowTime) && startsAt <= nowTime && endsAt > nowTime
    ? parsed.data
    : undefined;
}

/**
 * Reads the authoritative listing-market projection once for a complete result
 * set. Invalid, unproven, or cross-market rows fail closed and never become a
 * card promotion.
 */
export async function loadMarketResolvedPromotions(
  database: () => any,
  scopes: readonly ListingMarketPromotionScope[],
): Promise<Map<string, MarketResolvedListingPromotion>> {
  const normalizedScopes = scopes.flatMap((scope) => {
    if (!scope.listingId || !scope.marketCode) return [];
    return [
      {
        listingId: scope.listingId,
        marketCode: requireMarketCode(scope.marketCode),
      },
    ];
  });
  if (!normalizedScopes.length) return new Map();

  const requestedKeys = new Set(
    normalizedScopes.map(({ listingId, marketCode }) =>
      listingMarketPromotionKey(listingId, marketCode),
    ),
  );
  const listingIds = Array.from(
    new Set(normalizedScopes.map(({ listingId }) => listingId)),
  );
  const marketCodes = Array.from(
    new Set(normalizedScopes.map(({ marketCode }) => marketCode)),
  );
  const now = new Date();
  const nowIso = now.toISOString();

  const { data, error } = await database()
    .from("listing_market_publications")
    .select(MARKET_PROMOTION_PROJECTION)
    .in("listing_id", listingIds)
    .in("market_code", marketCodes)
    .eq("status", "active")
    .eq("compliance_state", "approved")
    .eq("promotion_state", "active")
    .lte("promotion_start_at", nowIso)
    .gt("promotion_end_at", nowIso);
  if (error) throw error;

  const promotions = new Map<string, MarketResolvedListingPromotion>();
  for (const row of (data || []) as MarketPromotionRow[]) {
    if (
      typeof row.listing_id !== "string" ||
      typeof row.market_code !== "string"
    )
      continue;
    const key = listingMarketPromotionKey(row.listing_id, row.market_code);
    if (!requestedKeys.has(key)) continue;
    const promotion = parseMarketResolvedPromotion(row, now);
    if (promotion) promotions.set(key, promotion);
  }
  return promotions;
}

export function getMarketResolvedPromotion(
  promotions: ReadonlyMap<string, MarketResolvedListingPromotion>,
  listingId: string | null | undefined,
  marketCode: string | null | undefined,
): MarketResolvedListingPromotion | undefined {
  if (!listingId || !marketCode) return undefined;
  return promotions.get(listingMarketPromotionKey(listingId, marketCode));
}
