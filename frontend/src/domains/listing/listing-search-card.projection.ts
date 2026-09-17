import type { Listing } from "../../types";

/**
 * Attribute keys the search card and its structured data read; every other
 * attribute is per-category detail the card never shows.
 */
const CARD_ATTRIBUTE_KEYS = new Set([
  "canonicalPath",
  "price_type",
  "brand",
  "negotiable",
]);

/**
 * What the search page needs to paint a card, and nothing else.
 *
 * The route's initial results are serialised into the document, so every
 * field on a listing becomes page weight for a visitor who only sees a card.
 * Detail-only facts (the taxonomy path, category attributes, coordinates,
 * publisher identifiers, lifecycle settings) are dropped here;
 * the client refetches the full projection for the detail page anyway. Only
 * fields that are optional on `Listing` are removed, so the result is still a
 * `Listing` for every consumer of the first render.
 */
export function projectListingForSearchCard(listing: Listing): Listing {
  const {
    latitude: _latitude,
    longitude: _longitude,
    publisherUserId: _publisherUserId,
    publisherOrganizationId: _publisherOrganizationId,
    publisherBranchId: _publisherBranchId,
    listingIntent: _listingIntent,
    listingTypeId: _listingTypeId,
    productVersion: _productVersion,
    scheduledPublishAt: _scheduledPublishAt,
    autoRenew: _autoRenew,
    reservationType: _reservationType,
    activeReservationId: _activeReservationId,
    marketCodes: _marketCodes,
    ...card
  } = listing;
  return {
    ...card,
    attributes: Object.fromEntries(
      Object.entries(listing.attributes ?? {}).filter(([key]) =>
        CARD_ATTRIBUTE_KEYS.has(key),
      ),
    ),
    ...(listing.taxonomy
      ? {
          taxonomy: {
            ...listing.taxonomy,
            // The path is breadcrumb material; cards show the leaf and root.
            path: [],
            detailCharacteristics: undefined,
          },
        }
      : {}),
  };
}
