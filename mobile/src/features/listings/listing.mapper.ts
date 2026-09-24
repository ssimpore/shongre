import {
  getCountryConfig,
  isActiveMarketResolvedListingPromotion,
  listingCardSchema,
  marketResolvedListingPromotionSchema,
  type ListingCardView,
} from "@shongre/contracts";
import {
  deliveryDiscoveryListingId,
  type DeliveryPublicRequest,
} from "@shongre/contracts/delivery";
import type { components } from "@shongre/contracts/openapi";
import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import { formatCompactMoney, majorToMinorAmount } from "@shongre/shared/money";
import { formatListingPricePresentation } from "@shongre/shared";
import { messagesFr } from "@/i18n/messages.fr";

const RECURRING_PRICE_SUFFIXES = {
  hourly: messagesFr["ui.listingCard.perHour"],
  daily: messagesFr["ui.listingCard.perDay"],
  weekly: messagesFr["ui.listingCard.perWeek"],
  monthly: messagesFr["ui.listingCard.perMonth"],
  rent_plus_charges: messagesFr["ui.listingCard.perMonth"],
} as const;

export type BackendListing = components["schemas"]["PublicListing"];

export function mapDeliveryRequestListing(
  request: DeliveryPublicRequest,
): ListingCardView {
  const locale = getCountryConfig(request.marketCode)?.defaultLocale || "fr-FR";
  return listingCardSchema.parse({
    id: deliveryDiscoveryListingId(request.id),
    title: request.title,
    price: request.budget,
    priceKind: request.budget ? "amount" : "on_request",
    city: `${request.pickupLocality.city} → ${request.dropoffLocality.city}`,
    marketCode: request.marketCode,
    categoryLabel: localizeTaxonomyLabels(request.taxonomy?.rootLabels, locale),
    conditionLabel: "Service",
    publishedAt: request.publishedAt,
    publisherType: "private",
    seller: {
      id: `delivery-requester:${request.id}`,
      name: request.requester.displayName,
      sellerType: "individual",
      city: request.pickupLocality.city,
      isIdentityVerified: request.requester.verified,
      isBusinessVerified: false,
    },
    isUrgent: false,
    isFeatured: false,
  });
}

export function mapBackendListing(item: BackendListing): ListingCardView {
  const locale = getCountryConfig(item.marketCode)?.defaultLocale || "fr-FR";
  const priceType = item.attributes?.price_type;
  const rawBrand =
    typeof item.brand === "string" && item.brand.trim()
      ? item.brand.trim()
      : typeof item.attributes?.brand === "string" &&
          item.attributes.brand.trim()
        ? item.attributes.brand.trim()
        : undefined;
  const semantic = item.pricePresentation;
  const semanticAmount =
    semantic?.visibility === "public"
      ? (semantic.minimumAmountMinor ?? semantic.maximumAmountMinor)
      : undefined;
  const price = {
    amountMinor:
      semanticAmount ?? majorToMinorAmount(Number(item.price), item.currency),
    currency: semantic?.currency ?? item.currency,
  };
  const priceKind: NonNullable<ListingCardView["priceKind"]> =
    semantic?.visibility === "undisclosed"
      ? semantic.kind === "salary"
        ? "unpriced"
        : "on_request"
      : semantic?.visibility === "public"
        ? semanticAmount !== undefined && semanticAmount > 0
          ? "amount"
          : "unpriced"
        : priceType === "free"
          ? "free"
          : priceType === "on_request"
            ? "on_request"
            : priceType === "unpriced" || Number(item.price) === 0
              ? "unpriced"
              : "amount";
  const recurringSuffix =
    typeof priceType === "string" && priceType in RECURRING_PRICE_SUFFIXES
      ? RECURRING_PRICE_SUFFIXES[
          priceType as keyof typeof RECURRING_PRICE_SUFFIXES
        ]
      : undefined;
  const parsedPromotion = marketResolvedListingPromotionSchema.safeParse({
    state: item.promotionState,
    type: item.promotionType,
    marketCode: item.marketCode,
    source: item.promotionSource,
    sourceId: item.promotionSourceId,
    startsAt: item.promotionStartAt,
    endsAt: item.promotionEndAt,
    promotedAt: item.promotedAt,
    label: item.promotionLabel,
  });
  const promotion =
    parsedPromotion.success &&
    isActiveMarketResolvedListingPromotion(
      parsedPromotion.data,
      item.marketCode,
    )
      ? parsedPromotion.data
      : undefined;
  return listingCardSchema.parse({
    id: item.id,
    title: item.title,
    price: priceKind === "amount" ? price : undefined,
    originalPrice:
      priceKind === "amount" &&
      typeof item.originalPrice === "number" &&
      Number.isFinite(item.originalPrice) &&
      item.originalPrice > 0
        ? {
            amountMinor: majorToMinorAmount(item.originalPrice, item.currency),
            currency: item.currency,
          }
        : undefined,
    priceLabel: semantic
      ? formatListingPricePresentation(semantic, locale)
      : recurringSuffix
        ? `${formatCompactMoney(price, locale)}${recurringSuffix}`
        : undefined,
    priceKind,
    imageUrl: item.images[0],
    photoCount: item.images.length,
    city: item.city,
    marketCode: item.marketCode,
    categoryLabel: localizeTaxonomyLabels(item.taxonomy?.rootLabels, locale),
    brandLabel:
      localizeTaxonomyLabels(item.taxonomy?.brandLabels, locale) || rawBrand,
    conditionLabel: item.condition,
    characteristics: (item.taxonomy?.cardCharacteristics ?? [])
      .map((row) => localizeTaxonomyLabels(row.values, locale))
      .filter(
        (value, index, values) => value && values.indexOf(value) === index,
      )
      .slice(0, 3),
    publisherType: item.publisherType,
    publishedAt: item.publishedAt,
    deliveryAvailable: item.allowedDelivery.length > 0,
    fulfillmentTypes: [...item.fulfillmentTypes],
    requiresPhysicalDelivery: item.requiresPhysicalDelivery,
    productVersion: item.productVersion,
    onlinePaymentAvailable: false,
    seller: item.seller
      ? {
          id: item.seller.id,
          name: item.seller.name,
          sellerType: item.publisherType
            ? item.publisherType === "professional"
              ? "pro"
              : "individual"
            : item.seller.sellerType || "individual",
          city: item.seller.city,
          isIdentityVerified: Boolean(item.seller.isVerified),
          isBusinessVerified: Boolean(item.seller.isBusinessVerified),
          rating: item.seller.rating,
          reviewCount: item.seller.reviewCount,
        }
      : undefined,
    isUrgent: promotion?.type === "urgent_badge",
    isFeatured: Boolean(promotion && promotion.type !== "urgent_badge"),
    promotion,
    discovery: item.discovery,
  });
}
