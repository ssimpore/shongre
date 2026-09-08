import type {
  CourseOffer,
  TutorProfile,
  TutorPublicProfile,
  TutorSearchItem,
} from "@shongre/contracts/courses";
import {
  deliveryDiscoveryListingId,
  type DeliveryPublicRequest,
} from "@shongre/contracts/delivery";
import {
  isActiveMarketResolvedListingPromotion,
  type MarketResolvedListingPromotion,
} from "@shongre/contracts/discovery";
import { getCountryConfig } from "@shongre/contracts/market-country";
import { minorToMajorAmount } from "@shongre/shared/money";
import type { Listing, ListingStatus } from "../../types";

function resolvedPromotionFields(
  promotion: MarketResolvedListingPromotion | undefined,
  marketCode: string | undefined,
): Partial<Listing> {
  if (!isActiveMarketResolvedListingPromotion(promotion, marketCode)) return {};
  const boostType: Listing["boostType"] =
    promotion.type === "urgent_badge"
      ? "urgent"
      : promotion.type === "search_bump" || promotion.type === "top_placement"
        ? "top_of_list"
        : promotion.type.includes("spotlight")
          ? "spotlight"
          : "highlight";
  return {
    isBoosted: true,
    boostType,
    boostExpiresAt: promotion.endsAt,
    promotionState: promotion.state,
    promotionType: promotion.type,
    promotionSource: promotion.source,
    promotionSourceId: promotion.sourceId,
    promotionLabel: promotion.label,
    promotionStartAt: promotion.startsAt,
    promotionEndAt: promotion.endsAt,
    promotedAt: promotion.promotedAt,
  };
}

function resolveProjectionMarketCode(
  marketCodes: readonly string[],
  requestedMarketCode: string | undefined,
  entityLabel: string,
): string {
  if (requestedMarketCode) {
    const normalizedMarket = requestedMarketCode.toUpperCase();
    if (!marketCodes.includes(normalizedMarket))
      throw new Error(
        `${entityLabel} is not published in market ${normalizedMarket}`,
      );
    return normalizedMarket;
  }
  if (marketCodes.length === 1 && marketCodes[0]) return marketCodes[0];
  throw new Error(
    `${entityLabel} requires an explicit market for a multi-market projection`,
  );
}

export function projectDeliveryRequest(
  request: DeliveryPublicRequest,
  requestedMarketCode?: string,
): Listing {
  const marketCode = resolveProjectionMarketCode(
    [request.marketCode],
    requestedMarketCode,
    `Delivery request ${request.id}`,
  );
  const lifecycleReference = request.publishedAt || request.expiresAt;
  const country = getCountryConfig(marketCode);
  if (!country) throw new Error(`Unsupported delivery market: ${marketCode}`);
  const currency = request.budget?.currency || country.currency;
  return {
    id: deliveryDiscoveryListingId(request.id),
    title: request.title,
    description: request.description,
    price: minorToMajorAmount(request.budget?.amountMinor ?? 0, currency),
    currency,
    pricePresentation: {
      kind: "service_rate",
      visibility: request.budget ? "public" : "undisclosed",
      minimumAmountMinor: request.budget?.amountMinor,
      maximumAmountMinor: request.budget?.amountMinor,
      currency,
      period: "total",
    },
    isNegotiable: false,
    isFreeDonation: false,
    fulfillmentTypes: ["PHYSICAL"],
    requiresPhysicalDelivery: true,
    taxonomy: request.taxonomy,
    categorySlug: request.taxonomy?.rootSlug ?? "",
    subCategorySlug: request.taxonomy?.categorySlug ?? "",
    categoryLabel: "",
    subCategoryLabel: "",
    condition: "not_applicable",
    sellerId: `delivery-requester:${request.id}`,
    sellerName: request.requester.displayName,
    sellerType: "individual",
    publisherType: "private",
    publisherVerificationStatus: request.requester.verified
      ? "identity_verified"
      : "unverified",
    sellerRating: 0,
    sellerReviewCount: 0,
    sellerIsVerified: request.requester.verified,
    sellerCity: request.pickupLocality.city,
    sellerPostalCode: request.pickupLocality.postalCode,
    city: request.pickupLocality.city,
    postalCode: request.pickupLocality.postalCode,
    department: "",
    region: "",
    photos: [],
    coverImageUrl: "",
    deliveryOptions: [],
    isOnlinePaymentAvailable: false,
    isReservable: false,
    attributes: { canonicalPath: `/livraison/demande/${request.id}` },
    status: request.status === "open" ? "active" : "archived",
    createdAt: lifecycleReference,
    updatedAt: lifecycleReference,
    expiresAt: request.expiresAt,
    viewsCount: 0,
    favoritesCount: 0,
    contactCount: 0,
    publishedAt: request.publishedAt,
    organicFreshnessAt: lifecycleReference,
    marketCode,
    marketCodes: [marketCode],
  };
}

function expiresAfter(reference: string, days = 90): string {
  const timestamp = new Date(reference).getTime();
  if (!Number.isFinite(timestamp)) return "2027-01-01T00:00:00.000Z";
  return new Date(timestamp + days * 24 * 60 * 60 * 1000).toISOString();
}

function photos(id: string, title: string, urls: string[]): Listing["photos"] {
  return urls.map((url, index) => ({
    id: `${id}-photo-${index + 1}`,
    url,
    isCover: index === 0,
    alt: title,
  }));
}

function courseStatus(
  tutor: TutorProfile | TutorPublicProfile,
  offer: CourseOffer,
): ListingStatus {
  const moderationStatus =
    "moderationStatus" in tutor ? tutor.moderationStatus : "approved";
  if (offer.status === "published" && moderationStatus === "approved")
    return "active";
  if (offer.status === "pending_review") return "pending_review";
  if (offer.status === "draft") return "draft";
  return "archived";
}

export function projectCourseOffer(
  item: TutorSearchItem,
  requestedMarketCode: string,
): Listing {
  const { tutor, offer, taxonomy, resolvedPromotion } = item;
  const marketCode = resolveProjectionMarketCode(
    offer.marketCodes,
    requestedMarketCode,
    `Course offer ${offer.id}`,
  );
  const country = getCountryConfig(marketCode);
  if (!country) throw new Error(`Unsupported course market: ${marketCode}`);
  const listingId = offer.listingId || `listing_course_${offer.id}`;
  const activePrices = offer.pricingOptions
    .filter((option) => option.isActive)
    .sort((a, b) => a.price.amountMinor - b.price.amountMinor);
  const activePrice = activePrices[0];
  const price = activePrice?.price;
  const imageUrls = [tutor.avatarUrl, ...tutor.mediaUrls].filter(
    (url): url is string => Boolean(url),
  );
  const media = photos(listingId, offer.title, imageUrls);
  const professional = Boolean(tutor.organizationId);
  const serviceArea =
    offer.serviceArea?.marketCode === marketCode
      ? offer.serviceArea
      : tutor.serviceArea?.marketCode === marketCode
        ? tutor.serviceArea
        : undefined;
  const supportsOnline = offer.deliveryModes.some(
    (mode) => mode === "online" || mode === "hybrid",
  );
  const city =
    serviceArea?.publicLocationLabel ||
    serviceArea?.cityLabel ||
    (supportsOnline ? "En ligne" : country.name);

  return {
    id: listingId,
    title: offer.title,
    description: offer.description,
    price: price ? minorToMajorAmount(price.amountMinor, price.currency) : 0,
    currency: price?.currency || country.currency,
    pricePresentation: price
      ? {
          kind: "service_rate",
          visibility: "public",
          minimumAmountMinor: price.amountMinor,
          maximumAmountMinor: price.amountMinor,
          currency: price.currency,
          period: activePrice?.type === "hourly" ? "hour" : "total",
        }
      : undefined,
    isNegotiable: false,
    isFreeDonation: false,
    taxonomy,
    categorySlug: taxonomy?.rootSlug ?? "",
    subCategorySlug: taxonomy?.categorySlug ?? "",
    categoryLabel: "",
    subCategoryLabel: "",
    condition: "not_applicable",
    sellerId: tutor.id,
    sellerName: tutor.displayName,
    sellerType: professional ? "pro" : "individual",
    publisherType: professional ? "professional" : "private",
    publisherOrganizationId: tutor.organizationId,
    publisherVerificationStatus:
      tutor.verifications.business === "verified"
        ? "business_verified"
        : tutor.verifications.identity === "verified"
          ? "identity_verified"
          : tutor.verifications.phone === "verified"
            ? "phone_verified"
            : tutor.verifications.email === "verified"
              ? "email_verified"
              : "unverified",
    sellerAvatarUrl: tutor.avatarUrl,
    sellerRating: tutor.rating || 0,
    sellerReviewCount: tutor.reviewCount,
    sellerIsVerified: tutor.verifications.identity === "verified",
    sellerCity: serviceArea?.cityLabel || city,
    sellerPostalCode: "00000",
    city,
    postalCode: "00000",
    department: "",
    region: serviceArea?.region || "",
    photos: media,
    coverImageUrl: media[0]?.url || "",
    deliveryOptions: [{ type: "hand_delivery", available: true, price: 0 }],
    isOnlinePaymentAvailable: false,
    attributes: {
      canonicalPath: `/education/professeur/${tutor.slug}`,
      price_type:
        activePrice?.type === "trial" && price?.amountMinor === 0
          ? "free"
          : activePrice
            ? undefined
            : "unpriced",
    },
    status: courseStatus(tutor, offer),
    createdAt: offer.publishedAt || offer.createdAt,
    publishedAt: offer.publishedAt,
    organicFreshnessAt: offer.publishedAt || offer.createdAt,
    updatedAt: offer.updatedAt,
    expiresAt: expiresAfter(offer.publishedAt || offer.createdAt, 365),
    viewsCount: 0,
    favoritesCount: 0,
    contactCount: 0,
    ...resolvedPromotionFields(resolvedPromotion, marketCode),
    marketCode,
    marketCodes: offer.marketCodes,
  };
}
