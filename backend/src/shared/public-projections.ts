import type {
  Listing,
  PublicListing,
  PublicSellerProfile,
  UserProfile,
} from "./types/index.js";

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
  if (profile.status !== "active" || profile.accountType === "staff") {
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
    attributes,
    ...publicFields
  } = listing;
  const publicSeller = seller ? toPublicSellerProfile(seller) : null;
  return {
    ...publicFields,
    attributes: Object.fromEntries(
      Object.entries(attributes || {}).filter(
        ([key]) => !INTERNAL_ATTRIBUTE_KEYS.has(key),
      ),
    ),
    ...(publicSeller ? { seller: publicSeller } : {}),
  };
}
