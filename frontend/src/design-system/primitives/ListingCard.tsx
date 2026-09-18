import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListingCard as SharedListingCard } from "@shongre/features/listings/web";
import type { ListingCardView } from "@shongre/contracts/listings";
import type { Money } from "@shongre/contracts/primitives";
import { deliveryRequestIdFromDiscoveryListingId } from "@shongre/contracts/delivery";
import { IMAGE_SIZES } from "@shongre/shared/responsive-image";
import { Avatar } from "./Badge";
import { formatMoney as formatSharedMoney } from "@shongre/shared/money";
import type { Listing } from "../../types";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { Image } from "./Image";
import {
  getGenericListingCardHref,
  projectGenericListingCardView,
} from "../../domains/listing/listing-card.generic-presentation";
import { FavoriteButton } from "./FavoriteButton";
import { useAuth } from "../../app/providers/AuthProvider";
import { routes } from "../../configuration/routes";

export interface ListingCardProps {
  listing: Listing;
  variant?: ListingCardVariant;
  className?: string;
  pricing?: { currentPrice: Money };
  imagePriority?: boolean;
  /** Static result preview: preserves anatomy without navigation or mutation. */
  interactive?: boolean;
}

type ListingCardVariant = "grid" | "list" | "compact" | "showcase" | "hero";

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
  imagePriority?: boolean;
  isFavorite?: boolean;
  favoriteLoadState?: "loading" | "ready" | "error";
  favoriteLabel?: string;
  onFavoriteToggle?: () => void | Promise<unknown>;
  onFavoriteRetry?: () => void | Promise<unknown>;
  onNavigate?: () => void;
  interactive?: boolean;
}

export function ListingCardViewCard({
  listing,
  href,
  variant = "grid",
  className,
  image,
  imageFit = "cover",
  imagePriority = false,
  isFavorite,
  favoriteLoadState = "ready",
  favoriteLabel,
  onFavoriteToggle,
  onFavoriteRetry,
  onNavigate,
  interactive = true,
}: ListingCardViewCardProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentLocale, convertMoney } = useMarketLocation();
  const priceProjection = listing.price
    ? convertMoney(listing.price)
    : undefined;
  const displayedListing: ListingCardView = {
    ...listing,
    price: priceProjection?.display,
    originalPrice:
      listing.originalPrice &&
      listing.originalPrice.currency === listing.price?.currency
        ? convertMoney(listing.originalPrice).display
        : undefined,
    priceLabel:
      listing.priceLabel ||
      (priceProjection?.estimated
        ? `≈ ${formatSharedMoney(priceProjection.display, currentLocale)}`
        : undefined),
  };

  return (
    <SharedListingCard
      listing={displayedListing}
      href={href}
      locale={currentLocale}
      variant={variant}
      className={`w-full ${className ?? ""}`}
      interactive={interactive}
      renderSellerAvatar={({ src, name }) => (
        <Avatar src={src} name={name} size="sm" />
      )}
      image={
        image ?? (
          <Image
            src={listing.imageUrl}
            alt=""
            width={variant === "list" || variant === "hero" ? 320 : 640}
            height={variant === "list" || variant === "hero" ? 240 : 480}
            fallbackLabel={t("ui.listingCard.imageUnavailable")}
            priority={imagePriority}
            sizes={
              variant === "hero"
                ? IMAGE_SIZES.heroPreview
                : variant === "list"
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
      favoriteAction={
        onFavoriteToggle || onFavoriteRetry ? (
          <FavoriteButton
            isFavorite={Boolean(isFavorite)}
            interactionState={favoriteLoadState}
            label={`${
              favoriteLoadState === "loading"
                ? t("ui.listingCard.favorisChargement")
                : favoriteLoadState === "error"
                  ? t("ui.listingCard.favorisReessayer")
                  : favoriteLabel ||
                    t(
                      isFavorite
                        ? "ui.listingCard.retirerDesFavoris"
                        : "ui.listingCard.ajouterAuxFavoris",
                    )
            } : ${listing.title}`}
            variant="floating"
            size="md"
            onToggle={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!onFavoriteToggle) return;
              try {
                await onFavoriteToggle();
              } catch {
                toast.error(t("ui.listingCard.favoriErreur"));
              }
            }}
            onRetry={
              onFavoriteRetry
                ? async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    try {
                      await onFavoriteRetry();
                    } catch {
                      toast.error(t("ui.listingCard.favorisChargementErreur"));
                    }
                  }
                : undefined
            }
          />
        ) : undefined
      }
      labels={{
        boosted: t("ui.listingCard.boosted"),
        sponsored: t("ui.listingCard.sponsored"),
        featured: t("ui.listingCard.featured"),
        urgent: t("ui.listingCard.urgent"),
        promotion: t("ui.listingCard.promotion"),
        delivery: t("ui.listingCard.delivery"),
        digitalFulfillment: t("ui.listingCard.digitalFulfillment"),
        free: t("ui.listingCard.free"),
        negotiable: t("ui.listingCard.negotiable"),
        onRequest: t("ui.listingCard.onRequest"),
        onlinePayment: t("ui.listingCard.onlinePayment"),
        imageUnavailable: t("ui.listingCard.imageUnavailable"),
        photos: (count) => t("ui.listingCard.photos", { count }),
        rating: (rating, count) =>
          t("ui.listingCard.noteAvis", { rating }).replace("{count}", count),
        verifiedSeller: t("ui.listingCard.verifiedSeller"),
        verifiedSellerShort: t("ui.listingCard.verifiedSellerShort"),
      }}
      identityLabels={{
        pro: t("ui.identityStatus.pro.short"),
        proAccessibility: t("ui.identityStatus.pro.seller"),
      }}
      renderLink={({
        href: to,
        className: linkClassName,
        ariaLabel,
        children,
      }) => (
        <Link
          to={to}
          className={linkClassName}
          aria-label={ariaLabel}
          onClick={onNavigate}
        >
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
  imagePriority = false,
  interactive = true,
}: ListingCardProps) {
  const { t } = useTranslation();
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    canModifyFavorites,
    favoriteLoadState,
    isFavorite,
    refreshFavorites,
    toggleFavorite,
  } = useFavorites();
  const href = getGenericListingCardHref(listing);
  const deliveryRequestId = deliveryRequestIdFromDiscoveryListingId(listing.id);
  const projectedListing = projectGenericListingCardView(
    listing,
    currentLocale,
    activeMarket.code,
    pricing,
    convertMoney,
  );
  return (
    <ListingCardViewCard
      listing={projectedListing}
      href={href}
      variant={variant}
      className={className}
      imagePriority={imagePriority}
      interactive={interactive}
      isFavorite={isFavorite(listing.id)}
      favoriteLoadState={favoriteLoadState}
      favoriteLabel={t(
        isFavorite(listing.id)
          ? "ui.listingCard.retirerDesFavoris"
          : "ui.listingCard.ajouterAuxFavoris",
      )}
      onFavoriteToggle={
        interactive && canModifyFavorites
          ? deliveryRequestId && !currentUser
            ? () => navigate(routes.auth.login(href))
            : () => toggleFavorite(listing.id)
          : undefined
      }
      onFavoriteRetry={
        interactive && canModifyFavorites ? refreshFavorites : undefined
      }
    />
  );
}
