import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ListingCard as SharedListingCard } from "@shongre/features/listings/web";
import type { ListingCardView } from "@shongre/contracts";
import type { Listing } from "../../types";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { Image } from "./Image";
import { IMAGE_SIZES } from "./responsiveImage";
import { listingDisplayResolver } from "../../domains/listing/listing.display";
import { getListingCategoryLabel } from "../../domains/taxonomy/taxonomy.display";

export interface ListingCardProps {
  listing: Listing;
  variant?: "grid" | "list" | "compact";
  className?: string;
}

function toListingCardView(listing: Listing): ListingCardView {
  return {
    id: listing.id,
    title: listing.title,
    price: {
      amountMinor: Math.round(listing.price * 100),
      currency: listing.currency ?? "EUR",
    },
    originalPrice: listing.originalPrice
      ? {
          amountMinor: Math.round(listing.originalPrice * 100),
          currency: listing.currency ?? "EUR",
        }
      : undefined,
    imageUrl: listing.coverImageUrl || undefined,
    city: listing.city,
    marketCode: listing.marketCode ?? "FR",
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
    },
    isUrgent: listing.boostType === "urgent",
    isFeatured: Boolean(listing.isBoosted && listing.boostType !== "urgent"),
  };
}

export function ListingCard({
  listing,
  variant = "grid",
  className,
}: ListingCardProps) {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const configuredPath = listing.attributes?.canonicalPath;
  const href =
    typeof configuredPath === "string" && configuredPath.startsWith("/")
      ? configuredPath
      : `/annonce/${listing.id}`;

  return (
    <SharedListingCard
      listing={toListingCardView(listing)}
      href={href}
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
