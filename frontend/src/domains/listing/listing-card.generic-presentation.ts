import type {
  ListingCharacteristicIcon,
  ListingCardView,
} from "@shongre/contracts/listings";
import type { Money } from "@shongre/contracts/primitives";
import type { MoneyConversionProjection } from "@shongre/contracts/currency";
import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import type { Listing } from "../../types";
import { getListingCategoryLabel } from "../taxonomy/listing-category.display";
import { resolveListingPhotoUrl } from "./listing-media";
import { resolveGenericListingPrice } from "./listing-price.presentation";
import { majorToMinorAmount } from "@shongre/shared/money";

export interface GenericListingCardPricing {
  currentPrice: Money;
}

export interface GenericListingCardCharacteristic {
  icon: ListingCharacteristicIcon;
  label: string;
}

export function getGenericListingCardCharacteristicPresentation(
  listing: Pick<Listing, "taxonomy">,
  locale: string,
): GenericListingCardCharacteristic[] {
  return (listing.taxonomy?.cardCharacteristics ?? [])
    .map((item) => ({
      icon: "tag" as const,
      label: localizeTaxonomyLabels(item.values, locale),
    }))
    .filter(
      ({ label }, index, rows) =>
        label && rows.findIndex((row) => row.label === label) === index,
    )
    .slice(0, 3);
}

/**
 * Preserve the owning vertical's canonical route without accepting a
 * protocol-relative or otherwise external destination from listing data.
 */
export function getGenericListingCardHref(
  listing: Pick<Listing, "id"> & Partial<Pick<Listing, "attributes">>,
): string {
  const configuredPath = listing.attributes?.canonicalPath;
  return typeof configuredPath === "string" &&
    configuredPath.startsWith("/") &&
    !configuredPath.startsWith("//")
    ? configuredPath
    : `/annonce/${listing.id}`;
}

/**
 * Return only a publisher-provided brand. The compact card never guesses one
 * from its title, model, seller, or category.
 */
export function getGenericListingBrandLabel(
  listing: Pick<Listing, "attributes" | "taxonomy">,
  locale = "fr-FR",
): string | undefined {
  const brand = listing.attributes?.brand;
  return (
    localizeTaxonomyLabels(listing.taxonomy?.brandLabels, locale) ||
    (typeof brand === "string" && brand.trim() ? brand.trim() : undefined)
  );
}

/**
 * A generic promotion is safe to use only on the exact market projection and
 * while every piece of authoritative provenance and schedule evidence exists.
 * Legacy `isBoosted` / `boostType` flags are deliberately ignored.
 */
export function hasActiveGenericListingPromotion(
  listing: Pick<
    Listing,
    | "marketCode"
    | "promotionState"
    | "promotionType"
    | "promotionSource"
    | "promotionSourceId"
    | "promotionStartAt"
    | "promotionEndAt"
  >,
  requestedMarketCode: string | undefined,
  now = Date.now(),
): boolean {
  if (
    !requestedMarketCode ||
    listing.marketCode?.toUpperCase() !== requestedMarketCode.toUpperCase() ||
    listing.promotionState !== "active" ||
    !listing.promotionType ||
    !listing.promotionSource ||
    !listing.promotionSourceId?.trim()
  ) {
    return false;
  }

  const startsAt = Date.parse(listing.promotionStartAt ?? "");
  const endsAt = Date.parse(listing.promotionEndAt ?? "");
  return (
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    startsAt <= now &&
    endsAt > now
  );
}

/** Pure generic-listing projection shared by cards, map markers and details. */
export function projectGenericListingCardView(
  listing: Listing,
  locale: string,
  requestedMarketCode: string,
  pricing?: GenericListingCardPricing,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): ListingCardView {
  const listingMarketCode = listing.marketCode ?? requestedMarketCode;
  const isRequestedMarket =
    listingMarketCode.toUpperCase() === requestedMarketCode.toUpperCase();
  const currency = listing.currency ?? listing.pricePresentation?.currency;
  const price = pricing
    ? { kind: "amount" as const, money: pricing.currentPrice }
    : resolveGenericListingPrice(
        {
          price: listing.price,
          currency,
          isFreeDonation: listing.isFreeDonation,
          priceType: listing.attributes?.price_type,
          pricePresentation: listing.pricePresentation,
        },
        locale,
        convertMoney,
      );
  const hasActivePromotion = hasActiveGenericListingPromotion(
    listing,
    requestedMarketCode,
  );
  const promotion: ListingCardView["promotion"] = hasActivePromotion
    ? {
        state: "active",
        type: listing.promotionType!,
        marketCode: listingMarketCode,
        source: listing.promotionSource!,
        sourceId: listing.promotionSourceId!,
        startsAt: listing.promotionStartAt!,
        endsAt: listing.promotionEndAt!,
        promotedAt: listing.promotedAt,
        label: listing.promotionLabel,
      }
    : undefined;
  const brandLabel = getGenericListingBrandLabel(listing, locale);
  const characteristicPresentation =
    getGenericListingCardCharacteristicPresentation(listing, locale).filter(
      ({ label }) =>
        !brandLabel ||
        label.toLocaleLowerCase(locale) !==
          brandLabel.toLocaleLowerCase(locale),
    );
  /**
   * The struck-through reference price.
   *
   * `listings.original_price` is a single seller-declared number with no
   * recorded basis, and rendering it struck through next to the current price
   * makes it a comparative price claim. Under the French implementation of the
   * Omnibus directive (code de la consommation, art. L112-1-1) the reference
   * for an announced reduction must be the lowest price the seller applied in
   * the 30 days before it — which this column does not represent and cannot be
   * derived from, because no price history is stored.
   *
   * TODO: legal validation. Backing this properly needs a price-history record
   * per listing and a stored 30-day-lowest projection to read here; until then
   * the displayed reduction is the seller's unverified assertion. Whether to
   * keep showing it in the meantime is a legal and commercial decision, not a
   * presentation one, so this only records the gap rather than changing what
   * ships.
   */
  const originalPrice =
    typeof listing.originalPrice === "number" &&
    Number.isFinite(listing.originalPrice) &&
    listing.originalPrice > 0 &&
    currency
      ? {
          amountMinor: majorToMinorAmount(listing.originalPrice, currency),
          currency,
        }
      : undefined;
  const displayedOriginalPrice = originalPrice
    ? convertMoney?.(originalPrice).display || originalPrice
    : undefined;
  const deliveryAvailable = listing.deliveryOptions.some(
    (option) =>
      option.available &&
      option.type !== "hand_delivery" &&
      option.type !== "digital",
  );

  return {
    id: listing.id,
    title: listing.title,
    price: price.kind === "amount" ? price.money : undefined,
    priceLabel: pricing ? undefined : price.label,
    priceKind: price.kind,
    originalPrice: displayedOriginalPrice,
    imageUrl: resolveListingPhotoUrl(
      listing.coverImageUrl || listing.photos?.[0],
    ),
    city: listing.city,
    marketCode: listingMarketCode,
    categoryLabel: getListingCategoryLabel(listing, locale),
    brandLabel,
    conditionLabel: "",
    publisherType:
      listing.publisherType ??
      (listing.sellerType === "pro" ? "professional" : "private"),
    characteristics: characteristicPresentation.map(({ label }) => label),
    characteristicIcons: characteristicPresentation.map(({ icon }) => icon),
    publishedAt: listing.publishedAt,
    photoCount: listing.photos.length,
    deliveryAvailable,
    fulfillmentTypes: listing.fulfillmentTypes,
    requiresPhysicalDelivery: listing.requiresPhysicalDelivery,
    productVersion: listing.productVersion,
    onlinePaymentAvailable: listing.isOnlinePaymentAvailable === true,
    isNegotiable: listing.isNegotiable === true,
    seller: {
      id: listing.sellerId,
      name: listing.sellerName,
      sellerType: listing.sellerType,
      avatarUrl: listing.sellerAvatarUrl,
      city: listing.sellerCity,
      isIdentityVerified: listing.sellerIsVerified,
      rating: listing.sellerRating,
      reviewCount: listing.sellerReviewCount,
      organizationName: listing.publisherOrganizationName,
      organizationLogoUrl: listing.publisherOrganizationLogoUrl,
      branchName: listing.publisherBranchName,
      isBusinessVerified:
        listing.publisherVerificationStatus === "business_verified" ||
        listing.sellerProfile?.isBusinessVerified === true,
      responseTimeLabel:
        listing.sellerResponseTimeLabel ||
        listing.sellerProfile?.responseTimeText,
    },
    isUrgent: promotion?.type === "urgent_badge",
    isFeatured: Boolean(promotion && promotion.type !== "urgent_badge"),
    promotion,
    discovery: isRequestedMarket ? listing.discovery : undefined,
  };
}
