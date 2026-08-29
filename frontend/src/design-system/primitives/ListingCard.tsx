import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ListingCard as SharedListingCard } from "@shongre/features/listings/web";
import type { ListingCardView, Money } from "@shongre/contracts";
import { majorToMinorAmount } from "@shongre/shared";
import type { Listing } from "../../types";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { Image } from "./Image";
import { IMAGE_SIZES } from "./responsiveImage";
import { listingDisplayResolver } from "../../domains/listing/listing.display";
import { getListingCategoryLabel } from "../../domains/taxonomy/taxonomy.display";
import { MARKET_CONFIG } from "../../configuration/market.config";

export interface ListingCardProps {
  listing: Listing;
  variant?: "grid" | "list" | "compact";
  className?: string;
  pricing?: { currentPrice: Money; originalPrice?: Money };
}

function toListingCardView(
  listing: Listing,
  pricing?: ListingCardProps["pricing"],
): ListingCardView {
  const currency = listing.currency ?? MARKET_CONFIG.defaultCurrency;
  return {
    id: listing.id,
    title: listing.title,
    price: pricing?.currentPrice ?? {
      amountMinor: majorToMinorAmount(listing.price, currency),
      currency,
    },
    originalPrice: pricing?.originalPrice ?? (listing.originalPrice
      ? {
          amountMinor: majorToMinorAmount(listing.originalPrice, currency),
          currency,
        }
      : undefined),
    imageUrl: listing.coverImageUrl || undefined,
    city: listing.city,
    marketCode: listing.marketCode ?? MARKET_CONFIG.defaultMarket,
    categoryLabel: getListingCategoryLabel(listing),
    conditionLabel: listingDisplayResolver.resolveConditionLabel(
      listing.condition,
    ),
    characteristics: listingDisplayResolver.resolveSummaryAttributes(listing),
    publishedAt: listing.createdAt,
    photoCount: listing.photos.length,
    deliveryAvailable: listing.deliveryOptions.some(
      (option) => option.available && option.type !== "hand_delivery",
    ),
    onlinePaymentAvailable: listing.isOnlinePaymentAvailable,
    isNegotiable: listing.isNegotiable,
    isFreeDonation: listing.isFreeDonation,
    seller: {
      id: listing.sellerId,
      name: listing.sellerName,
      sellerType: listing.sellerType,
      city: listing.sellerCity,
      isIdentityVerified: listing.sellerIsVerified,
      rating: listing.sellerRating,
      reviewCount: listing.sellerReviewCount,
      organizationName: listing.publisherOrganizationName,
      organizationLogoUrl: listing.publisherOrganizationLogoUrl,
      branchName: listing.publisherBranchName,
      isBusinessVerified:
        listing.publisherVerificationStatus === "business_verified",
    },
    isUrgent:
      listing.promotionState === "active"
        ? listing.promotionType === "urgent_badge"
        : listing.boostType === "urgent",
    isFeatured: Boolean(
      listing.promotionState === "active"
        ? listing.promotionType && listing.promotionType !== "urgent_badge"
        : listing.isBoosted && listing.boostType !== "urgent",
    ),
    promotion: listing.promotionType
      ? {
          state: listing.promotionState || "inactive",
          type: listing.promotionType,
          source: listing.promotionSource,
          sourceId: listing.promotionSourceId,
          startsAt: listing.promotionStartAt,
          endsAt: listing.promotionEndAt,
          label: listing.promotionLabel,
        }
      : undefined,
    discovery: listing.discovery,
  };
}

export function ListingCard({
  listing,
  variant = "grid",
  className,
  pricing,
}: ListingCardProps) {
  const { t } = useTranslation();
  const { currentLocale } = useMarketLocation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const configuredPath = listing.attributes?.canonicalPath;
  const href =
    typeof configuredPath === "string" && configuredPath.startsWith("/")
      ? configuredPath
      : `/annonce/${listing.id}`;

  return (
    <SharedListingCard
      listing={toListingCardView(listing, pricing)}
      href={href}
      locale={currentLocale}
      variant={variant}
      className={`w-full ${className ?? ""}`}
      image={
        <Image
          src={listing.coverImageUrl}
          alt=""
          sizes={
            variant === "list"
              ? IMAGE_SIZES.thumbnail
              : variant === "compact"
                ? IMAGE_SIZES.compact
                : IMAGE_SIZES.card
          }
          className="h-full w-full object-cover motion-surface group-hover:scale-105"
        />
      }
      isFavorite={isFavorite(listing.id)}
      favoriteLabel={t("ui.listingCard.ajouterAuxFavoris")}
      onFavoriteToggle={() => void toggleFavorite(listing.id)}
      renderLink={({
        href: to,
        className: linkClassName,
        ariaLabel,
        children,
      }) => (
        <Link to={to} className={linkClassName} aria-label={ariaLabel}>
          {children as ReactNode}
        </Link>
      )}
    />
  );
}
