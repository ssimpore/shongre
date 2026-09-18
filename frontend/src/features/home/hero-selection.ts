import { isActiveMarketResolvedListingPromotion } from "@shongre/contracts";
import type { Listing } from "../../types";
import { projectGenericListingCardView } from "../../domains/listing/listing-card.generic-presentation";

export const MAX_FEATURED_LISTINGS = 8;

/**
 * Which listings the homepage hero rail shows, in which order.
 *
 * Shared by the rail and by the server that pre-renders it, so the document
 * carries exactly the eight listings the rail will paint rather than the fifty
 * it selects from. The selection reads only facts that do not depend on the
 * reader — media, promotion, market — so it needs no currency conversion and
 * gives the same answer on both sides.
 *
 * The hero is an editorial, image-led surface. Listings without media keep
 * their shared-card fallback everywhere else, but they should not displace a
 * real listing photo here when image-rich inventory is available. Within the
 * eligible set the service order remains authoritative inside each group:
 * sponsored search is the backend's highest paid-placement rank, then other
 * resolved placements, then organic inventory. Legacy `isBoosted` flags, seller
 * type, discounts and record ids are not ranking evidence.
 */
export function selectHeroListings(
  listings: readonly Listing[],
  locale: string,
  marketCode: string,
): Listing[] {
  const projected = listings
    .filter((listing) => listing?.status === "active")
    .map((listing) => ({
      listing,
      card: projectGenericListingCardView(listing, locale, marketCode),
    }));
  const candidatesWithMedia = projected.filter(({ card }) =>
    Boolean(card.imageUrl),
  );
  const candidates = candidatesWithMedia.length
    ? candidatesWithMedia
    : projected;
  const sponsored: Listing[] = [];
  const promoted: Listing[] = [];
  const organic: Listing[] = [];
  for (const { listing, card } of candidates) {
    const promotion = card.promotion;
    if (!isActiveMarketResolvedListingPromotion(promotion, card.marketCode)) {
      organic.push(listing);
      continue;
    }
    (promotion.type === "sponsored_search" ? sponsored : promoted).push(
      listing,
    );
  }
  return [...sponsored, ...promoted, ...organic].slice(
    0,
    MAX_FEATURED_LISTINGS,
  );
}
