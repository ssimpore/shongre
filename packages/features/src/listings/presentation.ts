import {
  isActiveMarketResolvedListingPromotion,
  type ListingCardView,
} from "@shongre/contracts";
import { formatCompactMoney } from "@shongre/shared";
import type { IconName } from "@shongre/ui";

export interface ListingPromotionLabels {
  boosted: string;
  sponsored: string;
  featured: string;
  urgent: string;
  promotion: string;
}

export interface ListingPromotionBadge {
  kind: keyof ListingPromotionLabels;
  label: string;
  variant: "boosted" | "featured" | "urgent" | "success";
  icon: "zap" | "flame" | "rocket" | "tag";
}

const DEFAULT_PROMOTION_LABELS: ListingPromotionLabels = {
  boosted: "Boosté",
  sponsored: "Sponsorisé",
  featured: "À la une",
  urgent: "Urgent",
  promotion: "En promotion",
};

const PLACEMENT_BADGES = {
  urgent_badge: { kind: "urgent", variant: "urgent", icon: "zap" },
  search_bump: { kind: "boosted", variant: "boosted", icon: "rocket" },
  sponsored_search: {
    kind: "sponsored",
    variant: "boosted",
    icon: "rocket",
  },
  top_placement: { kind: "featured", variant: "featured", icon: "flame" },
  featured: { kind: "featured", variant: "featured", icon: "flame" },
  homepage_spotlight: { kind: "featured", variant: "featured", icon: "flame" },
  category_spotlight: { kind: "featured", variant: "featured", icon: "flame" },
  local_spotlight: { kind: "featured", variant: "featured", icon: "flame" },
  seller_spotlight: { kind: "featured", variant: "featured", icon: "flame" },
} as const satisfies Record<
  NonNullable<ListingCardView["promotion"]>["type"],
  Omit<ListingPromotionBadge, "label">
>;

/** Paid placement and a current price reduction are independent facts. A price
 * badge must never become evidence for sponsored ordering or map prominence. */
export function getListingPromotionBadges(
  listing: Pick<ListingCardView, "marketCode"> &
    Partial<
      Pick<
        ListingCardView,
        | "promotion"
        | "price"
        | "priceKind"
        | "originalPrice"
        | "isFreeDonation"
        | "isUrgent"
        | "isFeatured"
        | "discovery"
      >
    >,
  labels: ListingPromotionLabels = DEFAULT_PROMOTION_LABELS,
  now = Date.now(),
): ListingPromotionBadge[] {
  const badges: ListingPromotionBadge[] = [];
  if (
    isActiveMarketResolvedListingPromotion(
      listing.promotion,
      listing.marketCode,
      now,
    ) &&
    listing.promotion.source
  ) {
    const badge = PLACEMENT_BADGES[listing.promotion.type];
    if (badge) badges.push({ ...badge, label: labels[badge.kind] });
  }

  const { price, originalPrice } = listing;
  const priceKind =
    listing.priceKind ?? (listing.isFreeDonation ? "free" : "amount");
  if (
    priceKind === "amount" &&
    !listing.isFreeDonation &&
    price &&
    originalPrice &&
    price.currency === originalPrice.currency &&
    Number.isSafeInteger(price.amountMinor) &&
    Number.isSafeInteger(originalPrice.amountMinor) &&
    price.amountMinor > 0 &&
    originalPrice.amountMinor > price.amountMinor
  ) {
    badges.push({
      kind: "promotion",
      label: labels.promotion,
      variant: "success",
      icon: "tag",
    });
  }
  return badges;
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

export type ListingCapabilityIcon =
  "file" | "payment" | "tag" | "truck" | "verified";

export type ListingCapabilityKind =
  | "digital_fulfillment"
  | "delivery"
  | "negotiable"
  | "online_payment"
  | "verified_seller";

export interface ListingCapabilityLabels {
  delivery: string;
  digitalFulfillment: string;
  negotiable: string;
  onlinePayment: string;
  verifiedSeller: string;
}

export type ListingCapabilityPresentation =
  | {
      icon: Exclude<ListingCapabilityIcon, "verified">;
      kind: Exclude<ListingCapabilityKind, "verified_seller">;
      label: string;
    }
  | {
      icon: "verified";
      kind: "verified_seller";
      label: string;
    };

export type ListingNonVerificationCapability = Exclude<
  ListingCapabilityPresentation,
  { kind: "verified_seller" }
>;

export interface ListingSellerTrustPresentation {
  isProfessional: boolean;
  showVerifiedBadge: boolean;
}

export interface ListingVerticalFactPresentation {
  key: string;
  label: string;
  icon: IconName;
}

/** One seller-choice rule for Web and native cards. A professional account is
 * already verified by definition; a private seller needs the explicit fact. */
export function getListingSellerTrustPresentation(
  listing: Pick<ListingCardView, "publisherType" | "seller">,
): ListingSellerTrustPresentation {
  const isProfessional =
    listing.publisherType === "professional" ||
    listing.seller?.sellerType === "pro";
  const isVerified =
    listing.seller?.isBusinessVerified === true ||
    listing.seller?.isIdentityVerified === true;
  return {
    isProfessional,
    showVerifiedBadge: !isProfessional && isVerified,
  };
}

/** The compact footer shows at most two real, category-aware facts. Both
 * platforms consume this projection so a new category cannot drift by client. */
export function getListingVerticalFacts(
  listing: Pick<ListingCardView, "characteristics" | "characteristicIcons">,
  capabilities: readonly ListingNonVerificationCapability[],
): ListingVerticalFactPresentation[] {
  const capabilityPriority = capabilities.some(
    (capability) => capability.kind === "digital_fulfillment",
  )
    ? ["digital_fulfillment", "online_payment", "delivery", "negotiable"]
    : ["delivery", "online_payment", "negotiable", "digital_fulfillment"];
  const prioritizedCapabilities = capabilityPriority.flatMap((kind) => {
    const capability = capabilities.find((item) => item.kind === kind);
    return capability
      ? [
          {
            key: capability.kind,
            label: capability.label,
            icon: capability.icon,
          } satisfies ListingVerticalFactPresentation,
        ]
      : [];
  });

  return [
    ...prioritizedCapabilities,
    ...listing.characteristics.map(
      (label, index) =>
        ({
          key: `characteristic-${index}`,
          label,
          icon: listing.characteristicIcons?.[index] ?? "tag",
        }) satisfies ListingVerticalFactPresentation,
    ),
  ]
    .filter((fact) => !/\bcurrency_minor\b/iu.test(fact.label))
    .filter(
      (fact, index, facts) =>
        facts.findIndex((candidate) => candidate.label === fact.label) ===
        index,
    )
    .slice(0, 2);
}

/**
 * Buyer-facing capabilities come only from explicit listing and public seller
 * projections. Taxonomy eligibility and legacy prominence flags are not proof
 * that a particular listing offers a service.
 */
export function getListingCapabilityPresentation(
  listing: Pick<
    ListingCardView,
    | "deliveryAvailable"
    | "fulfillmentTypes"
    | "isNegotiable"
    | "onlinePaymentAvailable"
    | "requiresPhysicalDelivery"
    | "seller"
  >,
  labels: ListingCapabilityLabels,
): ListingCapabilityPresentation[] {
  const capabilities: ListingCapabilityPresentation[] = [];

  if (listing.onlinePaymentAvailable === true) {
    capabilities.push({
      icon: "payment",
      kind: "online_payment",
      label: labels.onlinePayment,
    });
  }

  if (listing.deliveryAvailable === true) {
    capabilities.push({
      icon: "truck",
      kind: "delivery",
      label: labels.delivery,
    });
  }

  const hasDigitalFulfillment =
    listing.requiresPhysicalDelivery === false &&
    listing.fulfillmentTypes?.some((type) => type !== "PHYSICAL") === true;
  if (hasDigitalFulfillment) {
    capabilities.push({
      icon: "file",
      kind: "digital_fulfillment",
      label: labels.digitalFulfillment,
    });
  }

  if (listing.isNegotiable === true) {
    capabilities.push({
      icon: "tag",
      kind: "negotiable",
      label: labels.negotiable,
    });
  }

  if (
    listing.seller?.isBusinessVerified === true ||
    listing.seller?.isIdentityVerified === true
  ) {
    capabilities.push({
      icon: "verified",
      kind: "verified_seller",
      label: labels.verifiedSeller,
    });
  }

  return capabilities;
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
  capabilityLabels: readonly string[] = [],
): string {
  return [
    listing.title,
    formattedPrice,
    listing.categoryLabel,
    listing.brandLabel,
    promotionLabel,
    professionalLabel,
    sellerRatingLabel,
    ...capabilityLabels,
    listing.city,
    publishedLabel,
  ]
    .filter(Boolean)
    .join(", ");
}
