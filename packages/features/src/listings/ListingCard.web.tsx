import type { MouseEvent, ReactNode } from "react";
import type { ListingCardView } from "@shongre/contracts";
import { formatMoney, formatRelativeTime } from "@shongre/shared";
import { Badge, Card, SemanticIcon, Text } from "@shongre/ui/web";
import {
  getListingPromotionBadges,
  listingAccessibilityLabel,
} from "./presentation";

export interface ListingCardProps {
  listing: ListingCardView;
  href: string;
  variant?: "grid" | "list" | "compact";
  image?: ReactNode;
  isFavorite?: boolean;
  favoriteLabel?: string;
  onFavoriteToggle?: () => void;
  className?: string;
  renderLink?: (props: {
    href: string;
    className: string;
    ariaLabel: string;
    children: ReactNode;
  }) => ReactNode;
}

export function ListingCard({
  listing,
  href,
  variant = "grid",
  image,
  isFavorite,
  favoriteLabel = "Ajouter aux favoris",
  onFavoriteToggle,
  className,
  renderLink,
}: ListingCardProps) {
  const price = listing.isFreeDonation ? "Gratuit" : formatMoney(listing.price);
  const originalPrice = listing.originalPrice
    ? formatMoney(listing.originalPrice)
    : undefined;
  const published = formatRelativeTime(listing.publishedAt, { style: "short" });
  const badges = getListingPromotionBadges(listing);
  const horizontal = variant === "list";
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onFavoriteToggle?.();
  };
  const ariaLabel = listingAccessibilityLabel(listing, price);
  const linkClassName = `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${horizontal ? "flex w-full" : "block"}`;
  const linkContent = (
    <>
      <div
        className={`${horizontal ? "w-32 shrink-0 sm:w-40" : "aspect-[4/3] w-full"} relative overflow-hidden bg-bg-muted`}
      >
        {image ??
          (listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt=""
              className="h-full w-full object-cover motion-surface group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-black text-primary">
              Shongre
            </div>
          ))}
        {(listing.photoCount ?? 0) > 1 ? (
          <span
            aria-label={`${listing.photoCount} photos`}
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-control bg-stone-900/70 px-2 py-1 text-micro text-white backdrop-blur-xs"
          >
            <SemanticIcon name="camera" size="xs" />
            {listing.photoCount}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        {badges.length ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {badges.map((badge) => (
              <Badge
                key={badge.tone}
                variant={badge.tone === "featured" ? "featured" : "urgent"}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}
        {listing.categoryLabel || listing.seller ? (
          <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2 text-micro text-text-muted">
            <span className="min-w-0 truncate">
              {[
                listing.categoryLabel,
                listing.seller?.sellerType === "pro"
                  ? "Pro"
                  : listing.seller?.name,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {(listing.seller?.rating ?? 0) > 0 ? (
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
        <h3 className="line-clamp-2 text-card-title font-bold text-text-main group-hover:text-primary">
          {listing.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <Text as="span" size="body-lg" weight="bold">
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
        <Text as="div" size="caption" tone="muted" className="mt-1">
          {listing.conditionLabel}
        </Text>
        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 border-t border-border-subtle pt-2 text-micro text-text-muted">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <SemanticIcon name="map-pin" size="xs" />
            <span className="truncate">{listing.city}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2">
            {listing.deliveryAvailable ? (
              <span className="inline-flex items-center gap-1">
                <SemanticIcon name="truck" size="xs" />
                Livraison
              </span>
            ) : null}
            <span>{published}</span>
          </span>
        </div>
      </div>
    </>
  );
  return (
    <Card
      as="article"
      padding="none"
      elevation="xs"
      className={`group relative overflow-hidden ${horizontal ? "flex min-h-32" : "flex h-full flex-col"} ${className ?? ""}`}
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
      {onFavoriteToggle ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={favoriteLabel}
          aria-pressed={isFavorite}
          className="absolute right-2 top-2 flex h-control-sm w-control-sm items-center justify-center rounded-control bg-bg-surface/95 text-primary shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <SemanticIcon
            name="heart"
            size="md"
            className={isFavorite ? "fill-current" : undefined}
          />
        </button>
      ) : null}
    </Card>
  );
}
