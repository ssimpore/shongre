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
  VerificationBadge,
} from "@shongre/ui/web";
import {
  getListingCardPriceText,
  getListingCapabilityPresentation,
  getListingPromotionBadges,
  getListingSellerTrustPresentation,
  getListingSellerRatingPresentation,
  getListingVerticalFacts,
  listingAccessibilityLabel,
  type ListingNonVerificationCapability,
  type ListingVerticalFactPresentation,
} from "./presentation";
import { useListingPromotionRefresh } from "./use-listing-promotion-refresh";
export { useListingPromotionRefresh } from "./use-listing-promotion-refresh";

export interface ListingCardLabels {
  boosted: string;
  sponsored: string;
  featured: string;
  urgent: string;
  promotion: string;
  delivery: string;
  digitalFulfillment: string;
  free: string;
  negotiable: string;
  onRequest: string;
  onlinePayment: string;
  imageUnavailable: string;
  photos: (count: number) => string;
  rating: (rating: string, count: string) => string;
  verifiedSeller: string;
  verifiedSellerShort: string;
}

export interface ListingCardProps {
  listing: ListingCardView;
  href: string;
  locale?: string;
  variant?: "grid" | "list" | "compact" | "showcase" | "hero";
  image?: ReactNode;
  /**
   * The seller's avatar, when the host can serve it with responsive sources.
   * The shared `Avatar` renders one fixed source; a Web host that knows its
   * media provider hands back the same avatar with a width ladder instead.
   */
  renderSellerAvatar?: (seller: { src?: string; name: string }) => ReactNode;
  favoriteAction?: ReactNode;
  labels: ListingCardLabels;
  identityLabels: {
    pro: string;
    proAccessibility: string;
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
  isHero = false,
  vertical = false,
  published,
}: {
  city: string;
  isHero?: boolean;
  vertical?: boolean;
  published?: string;
}) {
  const parts = joinLabels([city, published]);
  return (
    <span
      data-listing-card-meta="true"
      className={`flex min-w-0 items-center gap-1 leading-tight text-text-muted ${vertical ? "text-xs" : "text-micro"} ${isHero ? "2xl:text-sm" : ""}`}
    >
      {!isHero && city ? (
        <SemanticIcon
          name="map-pin"
          size={vertical ? "sm" : "xs"}
          className="shrink-0"
        />
      ) : null}
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
          className={`inline-flex min-h-control-sm min-w-0 flex-1 items-center justify-center gap-semantic-xs rounded-control border border-border-subtle bg-bg-subtle px-semantic-xs text-micro font-medium text-text-secondary ${isHero ? "2xl:text-xs" : ""}`}
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

function ListingCapabilityStrip({
  capabilities,
}: {
  capabilities: readonly ListingNonVerificationCapability[];
}) {
  if (!capabilities.length) return null;
  return (
    <span
      data-listing-card-capabilities="true"
      className="flex min-w-0 flex-wrap items-center gap-1"
    >
      {capabilities.map((capability) => (
        <Badge
          key={capability.kind}
          data-listing-capability={capability.kind}
          variant="neutral"
          size="sm"
          title={capability.label}
          aria-label={capability.label}
          icon={<SemanticIcon name={capability.icon} size="xs" />}
          className="max-w-full rounded-control"
        >
          <span className="truncate">{capability.label}</span>
        </Badge>
      ))}
    </span>
  );
}

function ListingVerticalFactStrip({
  facts,
}: {
  facts: readonly ListingVerticalFactPresentation[];
}) {
  if (!facts.length) return null;

  return (
    <div
      data-listing-card-footer-facts="true"
      className="flex min-h-control-sm min-w-0 items-stretch border-t border-border-subtle pt-2"
    >
      {facts.map((fact, index) => (
        <span
          key={fact.key}
          data-listing-card-footer-fact={fact.key}
          data-listing-capability={
            fact.key.startsWith("characteristic-") ? undefined : fact.key
          }
          data-listing-characteristic={
            fact.key.startsWith("characteristic-") ? fact.label : undefined
          }
          aria-label={fact.label}
          title={fact.label}
          className={`flex min-w-0 flex-auto items-center gap-1 text-micro font-semibold text-text-secondary ${index > 0 ? "border-l border-border-subtle pl-1.5" : "pr-1.5"}`}
        >
          <SemanticIcon name={fact.icon} size="xs" className="shrink-0" />
          <span className="min-w-0 truncate">{fact.label}</span>
        </span>
      ))}
    </div>
  );
}

function ListingSellerIdentity({
  seller,
  isHero,
  supportingLabel,
  renderAvatar,
}: {
  supportingLabel?: string;
  seller: NonNullable<ListingCardView["seller"]>;
  isHero: boolean;
  renderAvatar?: ListingCardProps["renderSellerAvatar"];
}) {
  const sellerName = seller.organizationName ?? seller.name;
  const avatarSrc = seller.organizationLogoUrl ?? seller.avatarUrl;

  return (
    <div
      data-listing-card-seller-identity="true"
      className={
        isHero
          ? "listing-card-hero-seller hidden min-w-0 items-center gap-2 lg:flex"
          : "flex min-w-0 shrink items-center gap-2"
      }
    >
      <span
        className="inline-flex shrink-0"
        data-listing-card-seller-avatar="true"
      >
        {renderAvatar?.({ src: avatarSrc, name: sellerName }) ?? (
          <Avatar src={avatarSrc} name={sellerName} size="sm" />
        )}
      </span>
      <span className="flex max-w-listing-card min-w-0 flex-1 flex-col leading-tight">
        <span className="flex min-w-0 items-center gap-1">
          <span
            className={`min-w-0 truncate text-label-sm font-semibold text-text-main ${isHero ? "2xl:text-sm" : ""}`}
            title={sellerName}
          >
            {sellerName}
          </span>
        </span>
        {supportingLabel ? (
          <span
            className={`truncate text-micro text-text-muted ${isHero ? "2xl:text-xs" : ""}`}
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
  renderSellerAvatar,
  favoriteAction,
  labels,
  identityLabels,
  className,
  interactive = true,
  renderLink,
}: ListingCardProps) {
  useListingPromotionRefresh(listing.promotion);
  const price = getListingCardPriceText(listing, locale, labels);
  const compactVerticalPrice =
    variant !== "list" &&
    variant !== "hero" &&
    Boolean(listing.priceLabel) &&
    Boolean(price && price.length > 18);
  const published = listing.publishedAt
    ? formatRelativeTime(listing.publishedAt, {
        locale,
        style: "short",
      })
    : undefined;
  const badges = getListingPromotionBadges(listing, labels);
  const compactNoMedia = !listing.imageUrl && !image;
  const noMediaNeedsOverlaySpace =
    badges.length > 0 || (listing.photoCount ?? 0) > 1;
  const capabilities = getListingCapabilityPresentation(listing, labels);
  const verifiedCapability = capabilities.find(
    (capability) => capability.kind === "verified_seller",
  );
  const capabilityBadges = capabilities.filter(
    (capability): capability is ListingNonVerificationCapability =>
      capability.kind !== "verified_seller",
  );
  const isHero = variant === "hero";
  const horizontal = variant === "list" || isHero;
  const compactVerticalTitle = !horizontal && listing.title.trim().length > 48;
  const categoryParts = joinLabels([listing.categoryLabel, listing.brandLabel]);
  const rating = getListingSellerRatingPresentation(
    listing.seller?.rating,
    listing.seller?.reviewCount,
    locale,
  );
  const ratingLabel = rating
    ? labels.rating(rating.rating, rating.reviewCount)
    : undefined;
  const { isProfessional, showVerifiedBadge } =
    getListingSellerTrustPresentation(listing);
  const sellerSummaryVisible =
    isProfessional || showVerifiedBadge || Boolean(rating);
  const verticalFacts = getListingVerticalFacts(listing, capabilityBadges);
  const baseAriaLabel = listingAccessibilityLabel(
    listing,
    price,
    ratingLabel,
    badges.map(({ label }) => label).join(", "),
    isProfessional ? identityLabels.proAccessibility : undefined,
    published,
    [
      ...capabilityBadges.map(({ label }) => label),
      ...(showVerifiedBadge && verifiedCapability
        ? [verifiedCapability.label]
        : []),
      ...(listing.photoCount && listing.photoCount > 1
        ? [labels.photos(listing.photoCount)]
        : []),
    ],
  );
  const ariaLabel = joinLabels([
    baseAriaLabel,
    ...(horizontal ? listing.characteristics.slice(0, 3) : []),
    listing.seller?.organizationName ?? listing.seller?.name,
  ]).join(", ");
  const linkClassName = `focus-visible:outline-none ${
    horizontal ? "listing-card-list-link flex w-full" : "flex h-full flex-col"
  }`;
  const effectiveFavoriteAction = interactive ? favoriteAction : undefined;
  const title = (
    <h3
      data-listing-card-title="true"
      title={listing.title}
      className={`text-text-main group-hover:text-primary ${
        isHero
          ? "truncate text-card-title font-bold lg:text-heading-xs 2xl:text-heading-sm"
          : horizontal
            ? "truncate text-card-title font-bold"
            : `listing-card-title-vertical ${
                compactVerticalTitle
                  ? "text-sm font-semibold"
                  : "text-card-title font-medium"
              }`
      }`}
    >
      {listing.title}
    </h3>
  );
  const sellerSummary = sellerSummaryVisible ? (
    <span
      data-listing-card-seller-summary="true"
      className={
        horizontal
          ? "ml-auto inline-flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1"
          : "flex min-h-control-target w-full min-w-0 items-center gap-1"
      }
    >
      {isProfessional ? (
        <ProBadge
          label={identityLabels.pro}
          accessibilityLabel={identityLabels.proAccessibility}
          size="xs"
          tone="primary"
        />
      ) : null}
      {showVerifiedBadge && verifiedCapability ? (
        <VerificationBadge
          label={labels.verifiedSellerShort}
          accessibilityLabel={verifiedCapability.label}
          size="xs"
          showIcon={false}
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
      {!horizontal ? (
        <SemanticIcon
          name="chevron-right"
          size="sm"
          className="ml-auto text-text-muted"
        />
      ) : null}
    </span>
  ) : null;
  const priceRow = (
    <div
      data-listing-card-price-row="true"
      className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1"
    >
      {price ? (
        <Text
          as="span"
          size={horizontal || compactVerticalPrice ? "body-lg" : "card-price"}
          weight="bold"
          tone="primary"
          data-listing-card-current-price="true"
          className={`min-w-0 max-w-full flex-auto break-words leading-tight tracking-tight ${
            isHero ? "lg:text-heading-sm 2xl:text-2xl" : ""
          }`}
          title={price}
        >
          {price}
        </Text>
      ) : null}
      {horizontal ? sellerSummary : null}
    </div>
  );
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
        {listing.photoCount !== undefined && listing.photoCount > 1 ? (
          <div
            data-listing-card-media-details="true"
            className={`absolute flex min-w-0 items-end justify-end gap-2 ${horizontal ? "inset-x-2.5 bottom-2.5" : "inset-x-3 bottom-3"}`}
          >
            <Badge
              data-listing-card-photo-count="true"
              variant="inverse"
              size="xs"
              aria-label={labels.photos(listing.photoCount)}
              title={labels.photos(listing.photoCount)}
              icon={
                <SemanticIcon name="camera" size={horizontal ? "xs" : "sm"} />
              }
              className={`ml-auto shrink-0 rounded-pill shadow-sm ${horizontal ? "" : "min-h-control-sm px-2"}`}
            >
              {new Intl.NumberFormat(locale).format(listing.photoCount)}
            </Badge>
          </div>
        ) : null}
      </div>
      <div
        data-listing-card-content="true"
        className={`${horizontal ? "listing-card-list-content gap-1 py-2" : "listing-card-content-vertical gap-1 py-2"} flex min-w-0 flex-1 flex-col px-3`}
      >
        <div
          data-listing-card-category-row="true"
          className={`flex min-w-0 items-center gap-1 font-medium leading-tight text-text-muted ${horizontal ? "text-micro" : "text-xs"} ${isHero ? "2xl:text-sm" : ""}`}
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

        {!horizontal ? priceRow : null}

        {!isHero ? title : null}

        {horizontal ? priceRow : null}

        {isHero ? title : null}

        {horizontal ? (
          <ListingDecisionDetails listing={listing} isHero={isHero} />
        ) : null}

        {horizontal && capabilityBadges.length > 0 ? (
          <ListingCapabilityStrip capabilities={capabilityBadges} />
        ) : null}

        {isHero ? (
          <div className="listing-card-hero-divider hidden border-t border-border-subtle lg:block" />
        ) : null}

        {isHero ? (
          <>
            <div className="min-w-0">
              <ListingMeta city={listing.city} isHero published={published} />
            </div>
            {listing.seller ? (
              <ListingSellerIdentity
                seller={listing.seller}
                renderAvatar={renderSellerAvatar}
                isHero
                supportingLabel={
                  listing.seller.responseTimeLabel ?? listing.seller.branchName
                }
              />
            ) : null}
          </>
        ) : horizontal ? (
          <div className="mt-auto flex min-w-0 items-end justify-between gap-2">
            <ListingMeta city={listing.city} published={published} />
            {listing.seller ? (
              <ListingSellerIdentity
                seller={listing.seller}
                renderAvatar={renderSellerAvatar}
                isHero={false}
                supportingLabel={
                  listing.seller.responseTimeLabel ?? listing.seller.branchName
                }
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-auto flex min-w-0 flex-col gap-1">
            <ListingMeta city={listing.city} published={published} vertical />
            {sellerSummary}
            <ListingVerticalFactStrip facts={verticalFacts} />
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
          ? "group surface-interactive focus-within:ring-2 focus-within:ring-inset focus-within:ring-focus"
          : ""
      } ${
        horizontal
          ? "listing-card-list flex"
          : `listing-card-standard ${variant === "showcase" ? "listing-card-showcase" : ""} ${compactNoMedia ? `listing-card-no-media ${noMediaNeedsOverlaySpace ? "listing-card-no-media-overlay" : ""}` : ""} flex flex-col`
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
          className={`pointer-events-none absolute flex min-w-0 items-start justify-between gap-2 ${
            horizontal
              ? "listing-card-list-overlay inset-x-2.5 top-2.5 sm:px-2.5"
              : "inset-x-3 top-3"
          }`}
        >
          {badges.length ? (
            <div
              data-listing-card-promotion="true"
              className="flex min-w-0 flex-1 flex-col items-start gap-1"
            >
              {badges.map((badge) => (
                <Badge
                  key={badge.kind}
                  data-listing-badge={badge.kind}
                  variant={badge.variant}
                  size="sm"
                  icon={
                    <SemanticIcon
                      name={badge.icon}
                      filled={
                        badge.kind === "featured" || badge.kind === "promotion"
                      }
                      size="xs"
                      className="shrink-0"
                    />
                  }
                  className="max-w-full min-w-0 rounded-pill shadow-sm"
                >
                  <span className="min-w-0 whitespace-normal break-words leading-tight">
                    {badge.label}
                  </span>
                </Badge>
              ))}
            </div>
          ) : null}
          {effectiveFavoriteAction ? (
            <div
              data-listing-card-actions="true"
              className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1"
            >
              {effectiveFavoriteAction}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
