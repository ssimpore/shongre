import { projectLocalizedListingCharacteristics } from "../modules/taxonomy/taxonomy.characteristics.js";
import type { TaxonomyV1Service } from "../modules/taxonomy/taxonomy.v1.service.js";
import type {
  Listing,
  PublicListing,
  PublicSellerProfile,
  UserProfile,
} from "./types/index.js";
import { createPublicPromotionProofId } from "./public-promotion-proof.js";
import { resolveApproximatePlace } from "@shongre/contracts/place-gazetteer";
import type { PublicLocation } from "@shongre/contracts/geospatial";
import { displaceCoordinate } from "../modules/geo/geo.privacy.js";

/**
 * `(0, 0)` is a real place in the Gulf of Guinea and the value this system
 * writes when it has no coordinate, so it is absence here rather than a point.
 */
function hasUsableCoordinate(
  latitude: unknown,
  longitude: unknown,
): latitude is number {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

const INTERNAL_ATTRIBUTE_KEYS = new Set([
  "confirmedReportCount",
  "mediaQualityScore",
  "pricePlausibilityScore",
  "recommendedFieldCompleteCount",
  "recommendedFieldCount",
  "successfulActivityCount",
  "taxonomyValid",
]);

function employmentPricePresentation(
  listing: Listing,
): PublicListing["pricePresentation"] {
  const attributes = listing.attributes;
  if (
    listing.categoryId !== "jobs" ||
    typeof attributes?.salaryIsPublic !== "boolean"
  )
    return undefined;
  const currency = listing.currency;
  if (!/^[A-Z]{3}$/.test(currency)) return undefined;
  const visible = attributes.salaryIsPublic;
  const minor = (value: unknown) =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
      ? value
      : undefined;
  const frequency =
    typeof attributes.salaryFrequencyId === "string"
      ? attributes.salaryFrequencyId.split(".").at(-1)
      : undefined;
  const period =
    frequency === "hour" ||
    frequency === "day" ||
    frequency === "week" ||
    frequency === "month" ||
    frequency === "year"
      ? frequency
      : undefined;
  const minimumAmountMinor = minor(attributes.salaryMinimumMinor);
  const maximumAmountMinor = minor(attributes.salaryMaximumMinor);
  return {
    kind: "salary",
    visibility: visible ? "public" : "undisclosed",
    currency,
    ...(visible && minimumAmountMinor !== undefined
      ? { minimumAmountMinor }
      : {}),
    ...(visible && maximumAmountMinor !== undefined
      ? { maximumAmountMinor }
      : {}),
    ...(period ? { period } : {}),
  };
}

export function toPublicSellerProfile(
  profile: UserProfile,
): PublicSellerProfile | null {
  if (
    profile.status !== "active" ||
    (profile.staffStatus && profile.staffStatus !== "none")
  ) {
    return null;
  }
  const accountType =
    profile.accountType === "professional" ? "professional" : "individual";
  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    accountType,
    sellerType: accountType === "professional" ? "pro" : "individual",
    avatarUrl: profile.avatarUrl,
    city: profile.city,
    country: profile.country,
    bio: profile.bio,
    isVerified: profile.isVerified,
    isBusinessVerified: Boolean(profile.isBusinessVerified),
    rating: profile.rating,
    reviewCount: profile.reviewCount,
    responseRatePercent: profile.responseRatePercent,
    responseTimeText: profile.responseTimeText,
    awayUntil: profile.awayUntil,
    awayMessage: profile.awayMessage,
    createdAt: profile.createdAt,
  };
}

/**
 * The coordinate a public reader is allowed to see, and how precise it is.
 *
 * Three cases, in the order they are decided:
 *
 * 1. The row's policy hides the location, or the row has no usable coordinate.
 *    Nothing is published. Not the market centre — an invented position is an
 *    answer, and it is the wrong one.
 * 2. The row carries a real coordinate. Only an `exact` policy publishes it
 *    verbatim; anything else publishes a deterministically displaced point,
 *    which needs the server-held secret. Without that secret this falls through
 *    to the town, because publishing the real point would be the alternative.
 * 3. No coordinate. The town is resolved from the built-in place table and
 *    published as `city`, which is what the listing's own city field already
 *    said in words.
 */
function projectListingLocation(
  listing: Listing,
  policy?: ListingLocationPolicy,
): PublicLocation {
  const town = () => {
    const resolved = resolveApproximatePlace({
      city: listing.city,
      marketCode: listing.marketCode,
    });
    return resolved
      ? {
          precision: "city" as const,
          coordinate: {
            latitude: resolved.latitude,
            longitude: resolved.longitude,
          },
        }
      : { precision: "hidden" as const };
  };

  const precision = listing.locationPrecision ?? "approximate";
  if (precision === "hidden") return { precision: "hidden" };

  if (!hasUsableCoordinate(listing.latitude, listing.longitude)) return town();
  const coordinate = {
    latitude: listing.latitude as number,
    longitude: listing.longitude as number,
  };

  if (precision === "exact") return { precision, coordinate };
  if (precision === "city" || precision === "postal_code") {
    /*
     * Published unchanged, because at these precisions the stored point *is* a
     * centroid — displacing it would move it off the town it names.
     *
     * That depends on an invariant worth stating: only `make geo-backfill` sets
     * these two precisions, and only when it stored the centroid a town-level
     * query returned. A path that wrote a seller's real position would leave
     * the row at its `approximate` default and be displaced below. Setting
     * `city` on a row holding a doorstep would publish the doorstep.
     */
    return { precision, coordinate };
  }
  if (!policy) return town();
  return {
    precision: "approximate",
    coordinate: displaceCoordinate({
      coordinate,
      subjectId: listing.id,
      radiusMeters: policy.displacementRadiusMeters,
      secret: policy.displacementSecret,
    }),
  };
}

/**
 * How much of a listing's stored location this projection may publish.
 *
 * Passing it is how a caller opts into publishing a *displaced* point derived
 * from the real one. Omitting it is deliberately the safe case: without a
 * displacement secret the projection cannot displace anything, so it falls back
 * to the town centroid, which reveals nothing the listing's own city field did
 * not already say. A caller that forgets this argument under-shares; there is
 * no argument it can forget that over-shares.
 */
export interface ListingLocationPolicy {
  /** Server-held. Never derived from anything the client can influence. */
  displacementSecret: string;
  displacementRadiusMeters: number;
}

export function toPublicListing(
  listing: Listing,
  taxonomy: TaxonomyV1Service,
  locationPolicy?: ListingLocationPolicy,
): PublicListing {
  const bundle = taxonomy.getBundle();
  const taxonomyProjection = taxonomy.projectIdentity(
    listing.categoryId,
    listing.attributes?.phone_reference_brand ??
      listing.brand ??
      listing.attributes?.brand,
  );
  const publicFieldsByKey = new Set(
    bundle.attributes
      .filter(
        (field) =>
          field.privacy === "public" &&
          bundle.attributeGroups.some(
            (group) => group.id === field.groupId && group.public,
          ),
      )
      .flatMap((field) => [field.id, field.code]),
  );
  // Domain routing metadata is distinct from public taxonomy fields.
  for (const key of [
    "canonicalPath",
    "verticalEntityId",
    "verticalSchemaVersion",
    "verticalType",
  ])
    publicFieldsByKey.add(key);

  const {
    seller,
    publisherStatus: _publisherStatus,
    publicationOfferId: _publicationOfferId,
    subscriptionId: _subscriptionId,
    entitlementSnapshot: _entitlementSnapshot,
    promotionSource: _promotionSource,
    promotionSourceId: _promotionSourceId,
    externalStockId: _externalStockId,
    duplicateGroupId: _duplicateGroupId,
    safetyRiskScore: _safetyRiskScore,
    digitalFulfillmentVersionId: _digitalFulfillmentVersionId,
    // Renewal history is the seller's business, not the listing's public face.
    renewalCount: _renewalCount,
    lastRenewedAt: _lastRenewedAt,
    /*
     * The stored location, removed from the rest spread on purpose.
     *
     * `...publicFields` publishes whatever is left on the row, so a column
     * added to `listings` becomes a public field by default. That is how the
     * seller's real coordinate would have shipped the moment geocoding started
     * writing one. Everything here is re-added below at the precision the
     * listing's policy allows, and nothing else about the location is public.
     */
    latitude: _latitude,
    longitude: _longitude,
    normalizedAddress: _normalizedAddress,
    locationSource: _locationSource,
    geocodingProvider: _geocodingProvider,
    geocodedAt: _geocodedAt,
    locationUpdatedAt: _locationUpdatedAt,
    marketPublications,
    attributes,
    ...publicFields
  } = listing;
  const publicSeller = seller ? toPublicSellerProfile(seller) : null;
  const publicPromotionProof =
    listing.promotionState === "active" &&
    listing.promotionSource &&
    listing.promotionSourceId?.trim()
      ? {
          promotionSource: listing.promotionSource,
          promotionSourceId: createPublicPromotionProofId({
            listingId: listing.id,
            marketCode: listing.marketCode,
            source: listing.promotionSource,
            sourceId: listing.promotionSourceId,
          }),
        }
      : {};
  const publicMarketPublications = marketPublications?.map((publication) => {
    const {
      promotionSource: _promotionSource,
      promotionSourceId: _promotionSourceId,
      ...publicPublication
    } = publication;
    return publicPublication;
  });
  const publicLocation = projectListingLocation(listing, locationPolicy);
  const pricePresentation = employmentPricePresentation(listing);

  return {
    ...publicFields,
    ...(pricePresentation ? { pricePresentation } : {}),
    ...(publicLocation.coordinate
      ? {
          latitude: publicLocation.coordinate.latitude,
          longitude: publicLocation.coordinate.longitude,
        }
      : {}),
    locationPrecision: publicLocation.precision,
    ...(taxonomyProjection
      ? {
          taxonomy: {
            ...taxonomyProjection,
            cardCharacteristics: projectLocalizedListingCharacteristics(
              {
                categoryId: taxonomyProjection.categoryId,
                listingTypeId: listing.listingTypeId,
                intent: listing.listingIntent,
                marketCode: listing.marketCode,
                sellerType:
                  listing.publisherType === "professional"
                    ? "professional"
                    : "individual",
                attributes: listing.attributes ?? {},
              },
              bundle,
            ),
          },
        }
      : {}),
    ...publicPromotionProof,
    ...(publicMarketPublications
      ? { marketPublications: publicMarketPublications }
      : {}),
    fulfillmentTypes: [listing.fulfillmentModel ?? "PHYSICAL"],
    requiresPhysicalDelivery:
      !listing.fulfillmentModel || listing.fulfillmentModel === "PHYSICAL",
    attributes: Object.fromEntries(
      Object.entries(attributes || {}).filter(
        ([key]) =>
          publicFieldsByKey.has(key) && !INTERNAL_ATTRIBUTE_KEYS.has(key),
      ),
    ),
    ...(publicSeller ? { seller: publicSeller } : {}),
  };
}
