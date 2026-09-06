import { useEffect, useState } from "react";
import type { ListingCardView } from "@shongre/contracts";

const MAX_TIMER_DELAY_MS = 2_147_000_000;

/**
 * Returns the next client-side instant at which an otherwise immutable card
 * projection can change its promotion visibility. The server remains the
 * authority for state and provenance; this only prevents an already-rendered
 * badge from surviving its declared schedule boundary.
 */
export function getListingPromotionRefreshDelay(
  promotion: ListingCardView["promotion"],
  now = Date.now(),
): number | undefined {
  if (
    !promotion ||
    promotion.state !== "active" ||
    !promotion.type ||
    !promotion.source ||
    !promotion.sourceId?.trim()
  ) {
    return undefined;
  }

  const startsAt = promotion.startsAt
    ? Date.parse(promotion.startsAt)
    : Number.NaN;
  const endsAt = promotion.endsAt ? Date.parse(promotion.endsAt) : Number.NaN;
  if (
    !Number.isFinite(startsAt) ||
    !Number.isFinite(endsAt) ||
    startsAt >= endsAt
  ) {
    return undefined;
  }

  const boundaries = [startsAt, endsAt].filter((value) => value > now);
  if (boundaries.length === 0) return undefined;

  const nextBoundary = Math.min(...boundaries);
  return Math.min(Math.max(nextBoundary - now + 1, 1), MAX_TIMER_DELAY_MS);
}

export function useListingPromotionRefresh(
  promotion: ListingCardView["promotion"],
): void {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const delay = getListingPromotionRefreshDelay(promotion);
    if (delay === undefined) return;

    const timer = setTimeout(() => {
      setRevision((current) => current + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [
    promotion?.endsAt,
    promotion?.source,
    promotion?.sourceId,
    promotion?.startsAt,
    promotion?.state,
    promotion?.type,
    revision,
  ]);
}
