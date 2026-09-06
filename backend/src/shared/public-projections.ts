import type {
  Listing,
  PublicListing,
  PublicSellerProfile,
  UserProfile,
} from "./types/index.js";
import { createPublicPromotionProofId } from "./public-promotion-proof.js";

const INTERNAL_ATTRIBUTE_KEYS = new Set([
  "confirmedReportCount",
  "mediaQualityScore",
  "pricePlausibilityScore",
  "recommendedFieldCompleteCount",
  "recommendedFieldCount",
  "successfulActivityCount",
  "taxonomyValid",
]);

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
    createdAt: profile.createdAt,
  };
}

export function toPublicListing(listing: Listing): PublicListing {
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
  return {
    ...publicFields,
    ...publicPromotionProof,
    ...(publicMarketPublications
      ? { marketPublications: publicMarketPublications }
      : {}),
    fulfillmentTypes: [listing.fulfillmentModel ?? "PHYSICAL"],
    requiresPhysicalDelivery:
      !listing.fulfillmentModel || listing.fulfillmentModel === "PHYSICAL",
    attributes: Object.fromEntries(
      Object.entries(attributes || {}).filter(
        ([key]) => !INTERNAL_ATTRIBUTE_KEYS.has(key),
      ),
    ),
    ...(publicSeller ? { seller: publicSeller } : {}),
  };
}
