import type { ReactNode } from "react";
import type { ListingCardView } from "@shongre/contracts";
import { formatRelativeTime } from "@shongre/shared";
import {
  Avatar,
  Badge,
  Card,
  ProBadge,
  SemanticIcon,
  Text,
} from "@shongre/ui/web";
import {
  getListingCardPriceText,
  getListingPromotionBadges,
  getListingSellerRatingPresentation,
  listingAccessibilityLabel,
} from "./presentation";
import { useListingPromotionRefresh } from "./use-listing-promotion-refresh";
export { useListingPromotionRefresh } from "./use-listing-promotion-refresh";

export interface ListingCardLabels {
  boosted: string;
  free: string;
  onRequest: string;
  imageUnavailable: string;
  rating: (rating: string, count: string) => string;
}

export interface ListingCardProps {
  listing: ListingCardView;
  href: string;
  locale?: string;
  variant?: "grid" | "list" | "compact" | "showcase" | "hero";
  image?: ReactNode;
  favoriteAction?: ReactNode;
  labels: ListingCardLabels;
  identityLabels: {
    pro: string;
    proAccessibility: string;
    verified: string;
  };
  className?: string;
  interactive?: boolean;
  renderLink?: (props: {
    href: string;
    className: string;
    ariaLabel: string;
    children: ReactNode;
  }) => ReactNode;
}

function joinLabels(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean) as string[];
}

function ListingMeta({
  city,
  published,
}: {
  city: string;
  published?: string;
}) {
  const parts = joinLabels([city, published]);
  return (
    <span
      data-listing-card-meta="true"
      className="flex min-w-0 items-center gap-1 text-micro leading-tight text-text-muted"
    >
      {parts.map((part, index) => (
        <span key={`${index}:${part}`} className="contents">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <span
            data-listing-card-location={index === 0 ? "true" : undefined}
            className="min-w-0 truncate"
            title={part}
          >
            {part}
          </span>
        </span>
      ))}
    </span>
  );
}

function ListingDecisionDetails({
  listing,
  isHero,
}: {
  listing: ListingCardView;
  isHero: boolean;
}) {
  if (!listing.characteristics.length) return null;

  return (
    <div
      data-listing-card-characteristics="true"
      className={
        isHero
          ? "listing-card-hero-characteristics hidden min-w-0 items-stretch gap-2 lg:flex"
          : "hidden min-w-0 items-stretch gap-2 sm:flex"
      }
    >
      {listing.characteristics.slice(0, 3).map((characteristic, index) => (
        <span
          key={`${index}:${characteristic}`}
          className="inline-flex min-h-control-sm min-w-0 flex-1 items-center justify-center gap-semantic-xs rounded-control border border-border-subtle bg-bg-subtle px-semantic-xs text-micro font-medium text-text-secondary"
          title={characteristic}
        >
          <SemanticIcon
            name={listing.characteristicIcons?.[index] ?? "tag"}
            size="sm"
            className="shrink-0"
          />
          <span className="min-w-0 truncate">{characteristic}</span>
        </span>
      ))}
    </div>
  );
}

function ListingSellerIdentity({
  seller,
  isHero,
  verifiedLabel,
}: {
  seller: NonNullable<ListingCardView["seller"]>;
  isHero: boolean;
  verifiedLabel: string;
}) {
  const sellerName = seller.organizationName ?? seller.name;
  const isVerified = seller.isBusinessVerified || seller.isIdentityVerified;
  const supportingLabel =
    seller.responseTimeLabel ??
    seller.branchName ??
    (isVerified ? verifiedLabel : undefined);

  return (
    <div
      data-listing-card-seller-identity="true"
      className={
        isHero
          ? "listing-card-hero-seller hidden min-w-0 items-center gap-2 lg:flex"
          : "hidden min-w-0 shrink items-center gap-2 sm:flex"
      }
    >
      <Avatar
        src={seller.organizationLogoUrl ?? seller.avatarUrl}
        name={sellerName}
        size="sm"
        isVerified={isVerified}
        verifiedLabel={verifiedLabel}
        data-listing-card-seller-avatar="true"
      />
      <span className="flex min-w-0 max-w-listing-card flex-col leading-tight">
        <span
          className="truncate text-label-sm font-semibold text-text-main"
          title={sellerName}
        >
          {sellerName}
        </span>
        {supportingLabel ? (
          <span
            className="truncate text-micro text-text-muted"
            title={supportingLabel}
          >
            {supportingLabel}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function ListingCard({
  listing,
  href,
  locale = "fr-FR",
  variant = "grid",
  image,
  favoriteAction,
  labels,
  identityLabels,
  className,
  interactive = true,
  renderLink,
}: ListingCardProps) {
  useListingPromotionRefresh(listing.promotion);
  const price = getListingCardPriceText(listing, locale, labels);
  const published = listing.publishedAt
    ? formatRelativeTime(listing.publishedAt, {
        locale,
        style: "short",
      })
    : undefined;
  const badges = getListingPromotionBadges(listing, labels.boosted);
  const isHero = variant === "hero";
  const horizontal = variant === "list" || isHero;
  const categoryParts = joinLabels([listing.categoryLabel, listing.brandLabel]);
  const rating = getListingSellerRatingPresentation(
    listing.seller?.rating,
    listing.seller?.reviewCount,
    locale,
  );
  const ratingLabel = rating
    ? labels.rating(rating.rating, rating.reviewCount)
    : undefined;
  const isProfessional =
    listing.publisherType === "professional" ||
    listing.seller?.sellerType === "pro";
  const sellerSummaryVisible = isProfessional || Boolean(rating);
  const baseAriaLabel = listingAccessibilityLabel(
    listing,
    price,
    ratingLabel,
    badges[0]?.label,
    isProfessional ? identityLabels.proAccessibility : undefined,
    published,
  );
  const ariaLabel = horizontal
    ? joinLabels([
        baseAriaLabel,
        ...listing.characteristics.slice(0, 3),
        listing.seller?.organizationName ?? listing.seller?.name,
      ]).join(", ")
    : baseAriaLabel;
  const linkClassName = `focus-visible:outline-none ${
    horizontal ? "listing-card-list-link flex w-full" : "flex h-full flex-col"
  }`;
  const effectiveFavoriteAction = interactive ? favoriteAction : undefined;
  const linkContent = (
    <>
      <div
        data-listing-card-media="true"
        className={`${horizontal ? "listing-card-list-image" : "listing-card-media w-full"} relative shrink-0 overflow-hidden bg-bg-muted`}
      >
        {image ??
          (listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover motion-surface group-hover:scale-105"
            />
          ) : (
            <div
              role="img"
              aria-label={labels.imageUnavailable}
              className="flex h-full items-center justify-center bg-bg-subtle text-text-muted"
            >
              <SemanticIcon name="image-off" size="lg" />
            </div>
          ))}
      </div>
      <div
        data-listing-card-content="true"
        className={`${horizontal ? "listing-card-list-content" : ""} flex min-w-0 flex-1 flex-col gap-1 px-3 py-2`}
      >
        <div
          data-listing-card-category-row="true"
          className="flex min-w-0 items-center gap-1 text-micro font-medium leading-tight text-text-muted"
        >
          {categoryParts.map((part, index) => (
            <span key={`${index}:${part}`} className="contents">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <span className="min-w-0 truncate" title={part}>
                {part}
              </span>
            </span>
          ))}
        </div>

        <div
          data-listing-card-price-row="true"
          className="flex min-h-control-sm min-w-0 items-center justify-between gap-2"
        >
          {price ? (
            <Text
              as="span"
              size="body-lg"
              weight="bold"
              data-listing-card-current-price="true"
              className={`min-w-0 flex-1 truncate leading-tight tracking-tight ${
                isHero ? "lg:text-heading-sm" : ""
              }`}
              title={price}
            >
              {price}
            </Text>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {sellerSummaryVisible ? (
            <span
              data-listing-card-seller-summary="true"
              className="inline-flex min-w-0 shrink items-center justify-end gap-1 overflow-hidden"
            >
              {isProfessional ? (
                <ProBadge
                  label={identityLabels.pro}
                  accessibilityLabel={identityLabels.proAccessibility}
                  size="xs"
                  tone="primary"
                />
              ) : null}
              {rating ? (
                <span
                  data-listing-card-rating="true"
                  role="img"
                  aria-label={ratingLabel}
                  title={ratingLabel}
                  className="inline-flex min-w-0 shrink items-center gap-0.5 overflow-hidden text-micro font-semibold text-text-main"
                >
                  <SemanticIcon
                    name="star"
                    size="xs"
                    className="fill-primary text-primary"
                  />
                  <span className="shrink-0">{rating.rating}</span>
                  <span className="min-w-0 truncate font-normal text-text-muted">
                    ({rating.visualReviewCount})
                  </span>
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        <h3
          data-listing-card-title="true"
          title={listing.title}
          className={`truncate font-bold text-text-main group-hover:text-primary ${
            isHero ? "text-card-title lg:text-heading-xs" : "text-card-title"
          }`}
        >
          {listing.title}
        </h3>

        {horizontal ? (
          <ListingDecisionDetails listing={listing} isHero={isHero} />
        ) : null}

        {isHero ? (
          <div className="listing-card-hero-divider hidden border-t border-border-subtle lg:block" />
        ) : null}

        {isHero ? (
          <>
            <div className="min-w-0">
              <ListingMeta city={listing.city} published={published} />
            </div>
            {listing.seller ? (
              <ListingSellerIdentity
                seller={listing.seller}
                isHero
                verifiedLabel={identityLabels.verified}
              />
            ) : null}
          </>
        ) : (
          <div className="mt-auto flex min-w-0 items-end justify-between gap-3">
            <ListingMeta city={listing.city} published={published} />
            {variant === "list" && listing.seller ? (
              <ListingSellerIdentity
                seller={listing.seller}
                isHero={false}
                verifiedLabel={identityLabels.verified}
              />
            ) : null}
          </div>
        )}
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
      className={`listing-card-shell relative overflow-hidden border-border-subtle ${
        interactive
          ? "group surface-interactive focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-ring-strong"
          : ""
      } ${
        horizontal
          ? "listing-card-list flex"
          : `listing-card-standard ${variant === "showcase" ? "listing-card-showcase" : ""} flex h-full flex-col`
      } ${className ?? ""}`}
    >
      {!interactive ? (
        <div role="group" aria-label={ariaLabel} className={linkClassName}>
          {linkContent}
        </div>
      ) : renderLink ? (
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

      {badges.length || effectiveFavoriteAction ? (
        <div
          data-listing-card-top-overlay="true"
          className={`pointer-events-none absolute inset-x-2.5 top-2.5 flex min-w-0 items-start justify-between gap-2 ${
            horizontal ? "listing-card-list-overlay sm:px-2.5" : ""
          }`}
        >
          {badges.length ? (
            <div
              data-listing-card-promotion="true"
              className="flex min-w-0 flex-1"
            >
              <Badge
                variant="primary"
                size="sm"
                icon={<SemanticIcon name="zap" size="xs" />}
                className="listing-card-promotion-badge max-w-full min-w-0 rounded-pill shadow-sm"
              >
                <span className="truncate">{badges[0]?.label}</span>
              </Badge>
            </div>
          ) : (
            <span />
          )}
          {effectiveFavoriteAction ? (
            <div
              data-listing-card-actions="true"
              className="pointer-events-auto flex shrink-0 items-center gap-1"
            >
              {effectiveFavoriteAction}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
