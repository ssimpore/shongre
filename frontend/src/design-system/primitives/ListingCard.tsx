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
import { CategoryIcon } from "./CategoryIcon";

export interface ListingCardProps {
  listing: Listing;
  variant?: ListingCardVariant;
  className?: string;
  pricing?: { currentPrice: Money; originalPrice?: Money };
}

export type ListingCardVariant = "grid" | "list" | "compact" | "showcase";

/**
 * Web adapter for category services that already return a `ListingCardView`.
 * It keeps routing, responsive images, locale formatting and quick actions out
 * of category pages while the cross-platform feature owns the card anatomy.
 */
export interface ListingCardViewCardProps {
  listing: ListingCardView;
  href: string;
  variant?: ListingCardVariant;
  className?: string;
  image?: ReactNode;
  imageFit?: "cover" | "contain";
  isFavorite?: boolean;
  favoriteLabel?: string;
  onFavoriteToggle?: () => void;
  quickAction?: ReactNode;
  renderCharacteristicIcon?: (
    characteristic: string,
    index: number,
  ) => ReactNode;
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
    originalPrice:
      pricing?.originalPrice ??
      (listing.originalPrice
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

export function ListingCardViewCard({
  listing,
  href,
  variant = "grid",
  className,
  image,
  imageFit = "cover",
  isFavorite,
  favoriteLabel,
  onFavoriteToggle,
  quickAction,
  renderCharacteristicIcon,
}: ListingCardViewCardProps) {
  const { currentLocale } = useMarketLocation();

  return (
    <SharedListingCard
      listing={listing}
      href={href}
      locale={currentLocale}
      variant={variant}
      className={`w-full ${className ?? ""}`}
      image={
        image ?? (
          <Image
            src={listing.imageUrl}
            alt=""
            sizes={
              variant === "list"
                ? IMAGE_SIZES.thumbnail
                : variant === "compact"
                  ? IMAGE_SIZES.compact
                  : IMAGE_SIZES.card
            }
            className={`h-full w-full motion-surface group-hover:scale-105 ${
              imageFit === "contain"
                ? "bg-bg-subtle object-contain p-4"
                : "object-cover"
            }`}
          />
        )
      }
      isFavorite={isFavorite}
      favoriteLabel={favoriteLabel}
      onFavoriteToggle={onFavoriteToggle}
      quickAction={quickAction}
      renderCharacteristicIcon={renderCharacteristicIcon}
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

export function ListingCard({
  listing,
  variant = "grid",
  className,
  pricing,
}: ListingCardProps) {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const configuredPath = listing.attributes?.canonicalPath;
  const href =
    typeof configuredPath === "string" && configuredPath.startsWith("/")
      ? configuredPath
      : `/annonce/${listing.id}`;

  return (
    <ListingCardViewCard
      listing={toListingCardView(listing, pricing)}
      href={href}
      variant={variant}
      className={className}
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
      renderCharacteristicIcon={
        variant === "showcase"
          ? (_characteristic, index) =>
              index === 0 ? (
                <CategoryIcon
                  category={listing.subCategorySlug || listing.categorySlug}
                  size="sm"
                  className="text-text-secondary"
                />
              ) : null
          : undefined
      }
    />
  );
}
