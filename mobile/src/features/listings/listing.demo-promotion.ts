import type { ListingCardView } from "@shongre/contracts";

type DemoPromotion = NonNullable<ListingCardView["promotion"]>;

/**
 * Builds deterministic demo evidence from the owning listing id so fixtures
 * cannot accidentally present another listing's paid-placement proof.
 */
export function createDemoListingPromotion(
  listingId: string,
  marketCode: DemoPromotion["marketCode"],
  type: NonNullable<DemoPromotion["type"]>,
  startsAt: string,
  endsAt: string,
): DemoPromotion {
  return {
    state: "active",
    type,
    marketCode,
    source: "admin_grant",
    sourceId: `demo:${listingId}:${type}`,
    startsAt,
    endsAt,
  };
}
