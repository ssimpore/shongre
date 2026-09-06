import type { DiscoveryDocument } from "@shongre/shared";
import { majorToMinorAmount } from "@shongre/shared/money";
import type { Listing } from "../../types";
import {
  DEFAULT_MARKET_CODE,
  DEFAULT_MARKET_CURRENCY,
} from "../../configuration/market-baseline";
import { TaxonomyMigration } from "../taxonomy/taxonomy.migration";

function promotionFor(listing: Listing): DiscoveryDocument["promotion"] {
  if (listing.promotionType) {
    return {
      state: listing.promotionState || "inactive",
      type: listing.promotionType,
      source: listing.promotionSource,
      sourceId: listing.promotionSourceId,
      startsAt: listing.promotionStartAt,
      endsAt: listing.promotionEndAt,
      label: listing.promotionLabel,
    };
  }
  return undefined;
}

export function toDemoDiscoveryDocument(listing: Listing): DiscoveryDocument {
  const attributeValues = Object.values(listing.attributes || {}).filter(
    (value): value is string | number | boolean =>
      ["string", "number", "boolean"].includes(typeof value),
  );
  const publisherType =
    listing.publisherType ||
    (listing.sellerType === "pro" ? "professional" : "private");
  const taxonomyNode =
    TaxonomyMigration.resolveCanonicalNode(listing.subCategorySlug) ||
    TaxonomyMigration.resolveCanonicalNode(listing.categorySlug);
  const categoryId =
    taxonomyNode?.id || listing.subCategorySlug || listing.categorySlug;
  const categoryPath = Array.from(
    new Set(
      [
        listing.categorySlug,
        listing.subCategorySlug,
        ...(taxonomyNode?.ancestorIds || []),
        taxonomyNode?.id,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const currency = listing.currency || DEFAULT_MARKET_CURRENCY;
  return {
    id: listing.id,
    publisherId:
      listing.publisherOrganizationId ||
      listing.publisherUserId ||
      listing.sellerId,
    publisherType,
    marketCodes: listing.marketCodes || [
      listing.marketCode || DEFAULT_MARKET_CODE,
    ],
    categoryId,
    categoryPath,
    title: listing.title,
    description: listing.description,
    searchableAttributes: attributeValues,
    priceMinor: majorToMinorAmount(listing.price, currency),
    currency,
    city: listing.city,
    status: listing.status,
    availability:
      listing.status === "active"
        ? "available"
        : listing.status === "reserved"
          ? "reserved"
          : listing.status === "sold"
            ? "sold"
            : "unavailable",
    moderationStatus:
      listing.status === "pending_review" ? "pending" : "approved",
    publisherStatus: "active",
    createdAt: listing.createdAt,
    publishedAt: listing.publishedAt,
    materiallyUpdatedAt: listing.materiallyUpdatedAt,
    organicFreshnessAt:
      listing.organicFreshnessAt || listing.publishedAt || listing.createdAt,
    externalStockId: listing.externalStockId,
    duplicateGroupId: listing.duplicateGroupId,
    quality: {
      requiredFieldsComplete: Boolean(
        listing.title &&
        listing.description &&
        listing.categorySlug &&
        listing.city,
      ),
      recommendedFieldRatio: Math.min(1, attributeValues.length / 5),
      descriptionLength: listing.description.length,
      imageCount: listing.photos.length,
      mediaQuality: listing.photos.length ? 0.75 : 0,
      taxonomyValid: true,
      pricePlausibility: listing.price >= 0 ? 0.72 : 0,
    },
    trust: {
      verificationStatus:
        listing.publisherVerificationStatus ||
        (publisherType === "professional" && listing.sellerIsVerified
          ? "business_verified"
          : listing.sellerIsVerified
            ? "identity_verified"
            : "unverified"),
      rating: listing.sellerRating,
      reviewCount: listing.sellerReviewCount,
      responseRate: Number(listing.attributes?.sellerResponseRate || 75),
      successfulActivityCount: Number(
        listing.attributes?.successfulActivityCount || 0,
      ),
      confirmedReportCount: Number(
        listing.attributes?.confirmedReportCount || 0,
      ),
    },
    promotion: promotionFor(listing),
  };
}
