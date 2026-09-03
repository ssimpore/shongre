import type { MouseEvent, ReactNode } from "react";
import type { ListingCardView } from "@shongre/contracts";
import { formatMoney, formatRelativeTime } from "@shongre/shared";
import { Avatar, Badge, Card, SemanticIcon, Text } from "@shongre/ui/web";
import {
  getListingCardCharacteristics,
  getListingPromotionBadges,
  listingAccessibilityLabel,
} from "./presentation";

export interface ListingCardProps {
  listing: ListingCardView;
  href: string;
  locale?: string;
  variant?: "grid" | "list" | "compact" | "showcase";
  image?: ReactNode;
  isFavorite?: boolean;
  favoriteLabel?: string;
  onFavoriteToggle?: () => void;
  /** Optional non-favorite quick action rendered beside the favorite control. */
  quickAction?: ReactNode;
  className?: string;
  renderCharacteristicIcon?: (
    characteristic: string,
    index: number,
  ) => ReactNode;
  renderLink?: (props: {
    href: string;
    className: string;
    ariaLabel: string;
    children: ReactNode;
  }) => ReactNode;
}

function SellerVerificationShield({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <span
      data-listing-card-seller-verified="true"
      title="Profil vérifié"
      className="inline-flex shrink-0"
    >
      <SemanticIcon
        name="shield"
        size="sm"
        label="Profil vérifié"
        className="fill-success text-white drop-shadow-sm"
      />
    </span>
  );
}

function ListingMeta({ city, published }: { city: string; published: string }) {
  return (
    <span
      data-listing-card-meta="true"
      className="flex min-w-0 items-start gap-2"
    >
      <span className="inline-flex min-w-0 flex-1 items-start gap-1">
        <SemanticIcon
          name="map-pin"
          size="xs"
          className="shrink-0 text-primary"
        />
        <span className="min-w-0 break-words" title={city}>
          {city}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1">
        <SemanticIcon
          name="calendar"
          size="xs"
          className="shrink-0 text-primary"
        />
        <span>{published}</span>
      </span>
    </span>
  );
}

export function ListingCard({
  listing,
  href,
  locale,
  variant = "grid",
  image,
  isFavorite,
  favoriteLabel = "Ajouter aux favoris",
  onFavoriteToggle,
  quickAction,
  className,
  renderCharacteristicIcon,
  renderLink,
}: ListingCardProps) {
  const price = listing.isFreeDonation
    ? "Gratuit"
    : listing.priceLabel || formatMoney(listing.price, locale);
  const originalPrice = listing.originalPrice
    ? formatMoney(listing.originalPrice, locale)
    : undefined;
  const published = formatRelativeTime(listing.publishedAt, {
    locale,
    style: "short",
    includeDirection: false,
  });
  const badges = getListingPromotionBadges(listing);
  const characteristics = getListingCardCharacteristics(listing);
  const horizontal = variant === "list";
  const compact = variant === "compact";
  const showcase = variant === "showcase";
  const sellerName =
    listing.seller?.organizationName || listing.seller?.name || "";
  const sellerImageUrl =
    listing.seller?.organizationLogoUrl || listing.seller?.avatarUrl;
  const isSellerVerified = Boolean(
    listing.seller?.isIdentityVerified || listing.seller?.isBusinessVerified,
  );
  const showSellerVerificationShield = Boolean(
    isSellerVerified && listing.seller?.sellerType !== "pro",
  );
  const hasSellerRating = (listing.seller?.rating ?? 0) > 0;
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onFavoriteToggle?.();
  };
  const ariaLabel = listingAccessibilityLabel(listing, price);
  const linkClassName = `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${horizontal ? "listing-card-list-link flex w-full" : "flex h-full flex-col"}`;
  const linkContent = (
    <>
      <div
        data-listing-card-media="true"
        className={`${horizontal ? "listing-card-list-image" : `${compact ? "aspect-video" : "aspect-media"} w-full`} relative shrink-0 overflow-hidden bg-bg-muted`}
      >
        {image ??
          (listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt=""
              className="h-full w-full object-cover motion-surface group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-bold text-primary">
              Shongre
            </div>
          ))}
        {(listing.photoCount ?? 0) > 1 || listing.deliveryAvailable ? (
          <div
            data-listing-card-media-meta="true"
            className={`absolute flex min-w-0 items-end justify-between gap-2 ${showcase ? "inset-x-3 bottom-3" : "inset-x-2 bottom-2"}`}
          >
            {(listing.photoCount ?? 0) > 1 ? (
              <span
                data-listing-card-photo-count="true"
                aria-label={`${listing.photoCount} photos`}
                className="inline-flex shrink-0 items-center gap-1 rounded-control bg-overlay-scrim px-2 py-1 text-micro text-white backdrop-blur-xs"
              >
                <SemanticIcon name="camera" size="xs" />
                {listing.photoCount}
              </span>
            ) : null}
            {listing.deliveryAvailable ? (
              <span
                data-listing-card-delivery-overlay="true"
                aria-label="Livraison disponible"
                title="Livraison disponible"
                className="ml-auto inline-flex min-w-0 items-center gap-1 truncate rounded-control bg-overlay-scrim px-2 py-1 text-micro font-semibold text-white backdrop-blur-xs"
              >
                <SemanticIcon name="truck" size="xs" />
                Livraison
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        data-listing-card-content="true"
        className={`${horizontal ? "listing-card-list-content" : ""} flex min-w-0 flex-1 flex-col p-3`}
      >
        {listing.categoryLabel || hasSellerRating ? (
          <div
            data-listing-card-category-row="true"
            className="mb-1.5 flex min-w-0 items-center justify-between gap-2 text-micro text-text-muted"
          >
            <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {listing.categoryLabel ? (
                <span className="min-w-0 shrink truncate">
                  {listing.categoryLabel}
                </span>
              ) : null}
            </span>
            {hasSellerRating ? (
              <span
                aria-label={`Note ${listing.seller?.rating?.toFixed(1)} sur 5, ${listing.seller?.reviewCount ?? 0} avis`}
                className="inline-flex shrink-0 items-center gap-1 rounded-control border border-border-base bg-bg-base px-2 py-1 font-semibold text-text-secondary"
              >
                <SemanticIcon
                  name="star"
                  size="xs"
                  className="fill-warning text-warning"
                />
                {listing.seller?.rating?.toFixed(1)}
                {(listing.seller?.reviewCount ?? 0) > 0 ? (
                  <span className="hidden sm:inline font-normal text-text-muted">
                    ({listing.seller?.reviewCount})
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}
        <h3
          title={listing.title}
          className={`line-clamp-2 text-card-title font-semibold text-text-main group-hover:text-primary ${horizontal ? "" : "min-h-control-md"}`}
        >
          {listing.title}
        </h3>
        <div
          data-listing-card-price="true"
          className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5"
        >
          <Text
            as="span"
            size="body-lg"
            weight="bold"
            className="min-w-0 break-words"
          >
            {price}
          </Text>
          {originalPrice ? (
            <Text
              as="span"
              size="caption"
              tone="muted"
              className="line-through"
            >
              {originalPrice}
            </Text>
          ) : null}
          {listing.isNegotiable ? (
            <Text as="span" size="caption" tone="muted">
              Négociable
            </Text>
          ) : null}
        </div>
        {characteristics.length ? (
          <ul
            className={`mt-2 flex min-w-0 gap-1.5 overflow-hidden ${horizontal ? "flex-nowrap" : "flex-wrap"}`}
            aria-label="Caractéristiques principales"
          >
            {characteristics.map((characteristic, index) => (
              <li
                key={characteristic}
                className="inline-flex min-w-0 max-w-full items-center gap-1.5 truncate rounded-control bg-bg-muted px-2 py-1 text-micro font-medium text-text-secondary"
              >
                {renderCharacteristicIcon?.(characteristic, index)}
                {characteristic}
              </li>
            ))}
          </ul>
        ) : null}
        <div
          data-listing-card-footer="true"
          className="mt-auto min-w-0 border-t border-border-subtle pt-2 text-micro text-text-muted sm:pt-1"
        >
          {sellerName ? (
            <div className="listing-card-seller-grid grid min-w-0 items-center gap-x-2 gap-y-px">
              <span
                aria-hidden="true"
                data-listing-card-seller-avatar="true"
                className="row-span-2 self-center"
              >
                <Avatar src={sellerImageUrl} name={sellerName} size="sm" />
              </span>
              <span
                data-listing-card-seller="true"
                className="flex min-w-0 items-center gap-1.5"
              >
                <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                  <span
                    title={sellerName}
                    className="min-w-0 break-words font-semibold text-text-secondary"
                  >
                    {sellerName}
                  </span>
                  <SellerVerificationShield
                    visible={showSellerVerificationShield}
                  />
                </span>
                {listing.seller?.sellerType === "pro" ? (
                  <span className="shrink-0">
                    <Badge variant="pro">Pro</Badge>
                  </span>
                ) : null}
              </span>
              <ListingMeta city={listing.city} published={published} />
            </div>
          ) : (
            <ListingMeta city={listing.city} published={published} />
          )}
        </div>
      </div>
    </>
  );
  return (
    <Card
      as="article"
      padding="none"
      elevation="xs"
      data-listing-card="true"
      data-listing-card-variant={variant}
      className={`group listing-card-shell surface-interactive relative overflow-hidden ${horizontal ? "listing-card-list flex" : `${showcase ? "listing-card-showcase" : "listing-card-standard"} flex h-full flex-col`} ${className ?? ""}`}
    >
      {renderLink ? (
        renderLink({
          href,
          className: linkClassName,
          ariaLabel,
          children: linkContent,
        })
      ) : (
        <a href={href} aria-label={ariaLabel} className={linkClassName}>
          {linkContent}
        </a>
      )}
      {badges.length || quickAction || onFavoriteToggle ? (
        <div
          data-listing-card-top-overlay="true"
          className="pointer-events-none absolute inset-x-2 top-2 flex min-w-0 items-start justify-between gap-2"
        >
          {badges.length ? (
            <div
              data-listing-card-promotion="true"
              className="flex min-w-0 flex-1 flex-wrap gap-1"
            >
              {badges.map((badge) => (
                <Badge
                  key={badge.tone}
                  variant={badge.tone === "featured" ? "featured" : "urgent"}
                  className="listing-card-promotion-badge max-w-full min-w-0 text-overline"
                >
                  <span className="truncate">{badge.label}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <span />
          )}
          {quickAction || onFavoriteToggle ? (
            <div
              data-listing-card-actions="true"
              className="pointer-events-auto flex shrink-0 items-center gap-1"
            >
              {quickAction}
              {onFavoriteToggle ? (
                <button
                  type="button"
                  data-marketplace-action="favorite.manage"
                  onClick={toggle}
                  aria-label={favoriteLabel}
                  aria-pressed={isFavorite}
                  className="flex h-control-sm w-control-sm items-center justify-center rounded-pill bg-bg-surface/95 text-primary shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <SemanticIcon
                    name="heart"
                    size="md"
                    className={isFavorite ? "fill-current" : undefined}
                  />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
