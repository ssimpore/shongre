import {
  isActiveMarketResolvedListingPromotion,
  type ListingCardView,
} from "@shongre/contracts";
import { formatCompactMoney } from "@shongre/shared";

export interface ListingPromotionBadge {
  label: string;
}

export function getListingPromotionBadges(
  listing: Pick<ListingCardView, "marketCode" | "isUrgent" | "isFeatured"> &
    Partial<Pick<ListingCardView, "promotion" | "discovery">>,
  boostedLabel = "Boosté",
  now = Date.now(),
): ListingPromotionBadge[] {
  return isActiveMarketResolvedListingPromotion(
    listing.promotion,
    listing.marketCode,
    now,
  )
    ? [{ label: boostedLabel }]
    : [];
}

export interface ListingCardPriceLabels {
  free: string;
  onRequest: string;
}

/** One semantic price formatter for cards and their compact map markers. */
export function getListingCardPriceText(
  listing: Pick<
    ListingCardView,
    "isFreeDonation" | "price" | "priceKind" | "priceLabel"
  >,
  locale: string,
  labels: ListingCardPriceLabels,
): string | undefined {
  const priceKind =
    listing.priceKind ?? (listing.isFreeDonation ? "free" : "amount");
  if (priceKind === "free") return labels.free;
  if (priceKind === "on_request") return listing.priceLabel || labels.onRequest;
  if (priceKind === "unpriced") return listing.priceLabel;
  return (
    listing.priceLabel ||
    (listing.price ? formatCompactMoney(listing.price, locale) : undefined)
  );
}

export interface ListingSellerRatingPresentation {
  rating: string;
  reviewCount: string;
  visualReviewCount: string;
}

/** Preserve the full localized count for accessibility while compacting only
 * unusually long visual counters inside the narrow card row. */
export function getListingSellerRatingPresentation(
  rating: number | undefined,
  reviewCount: number | undefined,
  locale: string,
): ListingSellerRatingPresentation | undefined {
  if (
    typeof rating !== "number" ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5 ||
    typeof reviewCount !== "number" ||
    !Number.isFinite(reviewCount) ||
    reviewCount <= 0
  ) {
    return undefined;
  }

  const localizedReviewCount = new Intl.NumberFormat(locale).format(
    reviewCount,
  );
  return {
    rating: new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(rating),
    reviewCount: localizedReviewCount,
    visualReviewCount:
      reviewCount >= 10_000
        ? new Intl.NumberFormat(locale, {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(reviewCount)
        : localizedReviewCount,
  };
}

export function listingAccessibilityLabel(
  listing: ListingCardView,
  formattedPrice?: string,
  sellerRatingLabel?: string,
  promotionLabel?: string,
  professionalLabel?: string,
  publishedLabel?: string,
): string {
  return [
    listing.title,
    formattedPrice,
    listing.categoryLabel,
    listing.brandLabel,
    promotionLabel,
    professionalLabel,
    sellerRatingLabel,
    listing.city,
    publishedLabel,
  ]
    .filter(Boolean)
    .join(", ");
}
