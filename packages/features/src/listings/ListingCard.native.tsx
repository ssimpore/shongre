import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import type { ListingCardView } from "@shongre/contracts";
import {
  nativeAspect,
  nativeBorders,
  nativeColors,
  nativeOpacity,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
} from "@shongre/design-tokens/native";
import { formatRelativeTime } from "@shongre/shared";
import {
  Avatar,
  Badge,
  Card,
  ProBadge,
  SemanticIcon,
  Text,
  VerificationBadge,
} from "@shongre/ui/native";
import {
  getListingCardPriceText,
  getListingCapabilityPresentation,
  getListingPromotionBadges,
  getListingSellerRatingPresentation,
  getListingSellerTrustPresentation,
  getListingVerticalFacts,
  listingAccessibilityLabel,
  type ListingNonVerificationCapability,
  type ListingVerticalFactPresentation,
} from "./presentation";
import { useListingPromotionRefresh } from "./use-listing-promotion-refresh";
export { useListingPromotionRefresh } from "./use-listing-promotion-refresh";

export interface ListingCardProps {
  listing: ListingCardView;
  onPress: () => void;
  locale?: string;
  variant?: "grid" | "list" | "compact";
  favoriteAction?: ReactNode;
  labels: {
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
    rating: (rating: string, count: string) => string;
    imageUnavailable: string;
    photos: (count: number) => string;
    verifiedSeller: string;
    verifiedSellerShort: string;
  };
  identityLabels: {
    pro: string;
    proAccessibility: string;
  };
}

function ListingCapabilityStrip({
  capabilities,
}: {
  capabilities: readonly ListingNonVerificationCapability[];
}) {
  return (
    <View style={styles.capabilities}>
      {capabilities.map((capability) => (
        <Badge
          key={capability.kind}
          testID={`listing-capability-${capability.kind}`}
          variant="neutral"
          size="xs"
          accessibilityLabel={capability.label}
          icon={
            <SemanticIcon
              name={capability.icon}
              size="xs"
              color={nativeColors.text.emphasis}
            />
          }
        >
          {capability.label}
        </Badge>
      ))}
    </View>
  );
}

function ListingVerticalFactStrip({
  facts,
}: {
  facts: readonly ListingVerticalFactPresentation[];
}) {
  if (!facts.length) return null;
  return (
    <View testID="listing-card-footer-facts" style={styles.verticalFacts}>
      {facts.map((fact, index) => (
        <View
          key={fact.key}
          accessible
          accessibilityLabel={fact.label}
          style={[styles.verticalFact, index > 0 && styles.verticalFactDivider]}
        >
          <SemanticIcon
            name={fact.icon}
            size="xs"
            color={nativeColors.text.secondary}
          />
          <Text
            size="caption"
            tone="secondary"
            weight="semibold"
            numberOfLines={1}
            style={styles.shrink}
          >
            {fact.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ListingCard({
  listing,
  onPress,
  locale = "fr-FR",
  variant = "grid",
  favoriteAction,
  labels,
  identityLabels,
}: ListingCardProps) {
  useListingPromotionRefresh(listing.promotion);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [listing.imageUrl]);

  const price = getListingCardPriceText(listing, locale, labels);
  const compactVerticalPrice =
    variant !== "list" &&
    Boolean(listing.priceLabel) &&
    Boolean(price && price.length > 18);
  const badges = getListingPromotionBadges(listing, labels);
  const capabilities = getListingCapabilityPresentation(listing, labels);
  const verifiedCapability = capabilities.find(
    (capability) => capability.kind === "verified_seller",
  );
  const capabilityBadges = capabilities.filter(
    (capability): capability is ListingNonVerificationCapability =>
      capability.kind !== "verified_seller",
  );
  const horizontal = variant === "list";
  const compactVerticalTitle = !horizontal && listing.title.trim().length > 48;
  const verticalFacts = getListingVerticalFacts(listing, capabilityBadges);
  const categoryLine = [listing.categoryLabel, listing.brandLabel]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
  const published = listing.publishedAt
    ? formatRelativeTime(listing.publishedAt, {
        locale,
        style: "short",
      })
    : undefined;
  const metaLine = [listing.city.trim(), published?.trim()]
    .filter(Boolean)
    .join(" · ");
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
  const sellerName = listing.seller?.organizationName ?? listing.seller?.name;
  const sellerLabel = isProfessional
    ? identityLabels.proAccessibility
    : undefined;

  const sellerSummary =
    isProfessional || showVerifiedBadge || rating ? (
      <View style={styles.sellerSummary}>
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
          <View
            style={styles.rating}
            accessible
            accessibilityRole="image"
            accessibilityLabel={ratingLabel}
          >
            <SemanticIcon
              name="star"
              size="xs"
              color={nativeColors.action.primary}
              filled
            />
            <Text size="caption" weight="semibold" numberOfLines={1}>
              {rating.rating}
            </Text>
            <Text
              size="caption"
              tone="muted"
              numberOfLines={1}
              style={styles.ratingCount}
            >
              ({rating.visualReviewCount})
            </Text>
          </View>
        ) : null}
        {!horizontal ? (
          <View style={styles.sellerSummaryChevron}>
            <SemanticIcon
              name="chevron-right"
              size="sm"
              color={nativeColors.text.muted}
            />
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <Card
      testID="listing-card"
      padding="none"
      style={[styles.card, !horizontal && styles.verticalCard]}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={listingAccessibilityLabel(
          listing,
          price,
          ratingLabel,
          badges.map(({ label }) => label).join(", "),
          sellerLabel,
          published,
          [
            ...capabilityBadges.map(({ label }) => label),
            ...(sellerName ? [sellerName] : []),
            ...(showVerifiedBadge && verifiedCapability
              ? [verifiedCapability.label]
              : []),
            ...(listing.photoCount && listing.photoCount > 1
              ? [labels.photos(listing.photoCount)]
              : []),
          ],
        )}
        onPress={onPress}
        style={({ pressed }) => [
          styles.link,
          horizontal && styles.horizontal,
          !horizontal && styles.verticalLink,
          pressed && styles.pressed,
        ]}
      >
        <View
          testID="listing-card-media"
          style={[
            styles.media,
            horizontal ? styles.horizontalMedia : styles.verticalMedia,
          ]}
        >
          {listing.imageUrl && !imageFailed ? (
            <Image
              source={{ uri: listing.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              accessible={false}
              accessibilityIgnoresInvertColors
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View
              style={[styles.image, styles.fallback]}
              accessible
              accessibilityRole="image"
              accessibilityLabel={labels.imageUnavailable}
            >
              <SemanticIcon
                name="image-off"
                size="lg"
                color={nativeColors.text.muted}
              />
            </View>
          )}
          {listing.photoCount !== undefined && listing.photoCount > 1 ? (
            <View style={styles.mediaDetails}>
              <Badge
                variant="inverse"
                size="xs"
                accessibilityLabel={labels.photos(listing.photoCount)}
                icon={
                  <SemanticIcon
                    name="camera"
                    size="xs"
                    color={nativeColors.text.inverse}
                  />
                }
              >
                {new Intl.NumberFormat(locale).format(listing.photoCount)}
              </Badge>
            </View>
          ) : null}
        </View>

        <View style={[styles.body, !horizontal && styles.verticalBody]}>
          <Text size="caption" tone="muted" numberOfLines={1}>
            {categoryLine}
          </Text>

          {horizontal ? (
            <Text
              size="label-md"
              weight="bold"
              accessibilityRole="header"
              numberOfLines={1}
            >
              {listing.title}
            </Text>
          ) : null}

          <View
            style={[styles.priceRow, !horizontal && styles.verticalPriceRow]}
          >
            <View style={styles.priceText}>
              {price ? (
                <Text
                  size={
                    horizontal
                      ? "body-lg"
                      : compactVerticalPrice
                        ? "body-sm"
                        : "card-price"
                  }
                  weight="bold"
                  tone="primary"
                  numberOfLines={compactVerticalPrice ? 2 : 1}
                >
                  {price}
                </Text>
              ) : null}
            </View>
            {horizontal ? sellerSummary : null}
          </View>

          {!horizontal ? (
            <Text
              size={compactVerticalTitle ? "label-md" : "card-title"}
              weight={compactVerticalTitle ? "semibold" : "medium"}
              accessibilityRole="header"
              numberOfLines={2}
            >
              {listing.title}
            </Text>
          ) : null}

          {horizontal && capabilityBadges.length > 0 ? (
            <ListingCapabilityStrip capabilities={capabilityBadges} />
          ) : null}
          <View
            style={
              !horizontal ? styles.verticalFooter : styles.horizontalFooter
            }
          >
            <View style={styles.meta}>
              {listing.city ? (
                <SemanticIcon
                  name="map-pin"
                  size="xs"
                  color={nativeColors.text.muted}
                />
              ) : null}
              <Text
                size="caption"
                tone="muted"
                numberOfLines={1}
                style={styles.shrink}
              >
                {metaLine}
              </Text>
            </View>
            {horizontal && listing.seller && sellerName ? (
              <View style={styles.sellerIdentity}>
                <Avatar
                  src={
                    listing.seller.organizationLogoUrl ??
                    listing.seller.avatarUrl
                  }
                  name={sellerName}
                  size="sm"
                />
                <View style={[styles.shrink, styles.sellerInfo]}>
                  <Text
                    size="label-sm"
                    weight="semibold"
                    numberOfLines={1}
                    style={styles.shrink}
                  >
                    {sellerName}
                  </Text>
                  {sellerLabel ? (
                    <Text size="caption" tone="muted" numberOfLines={1}>
                      {sellerLabel}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {!horizontal ? sellerSummary : null}
            {!horizontal ? (
              <ListingVerticalFactStrip facts={verticalFacts} />
            ) : null}
          </View>
        </View>
      </Pressable>

      {badges.length ? (
        <View
          style={[
            styles.promotionBadges,
            favoriteAction ? styles.promotionBadgesWithFavorite : undefined,
            horizontal ? styles.horizontalPromotionBadges : undefined,
          ]}
        >
          {badges.map((badge) => (
            <Badge
              key={badge.kind}
              testID={`listing-badge-${badge.kind}`}
              variant={badge.variant}
              size="sm"
              style={styles.promotionBadge}
              icon={
                <SemanticIcon
                  name={badge.icon}
                  filled={
                    badge.kind === "featured" || badge.kind === "promotion"
                  }
                  size="xs"
                  color={
                    badge.kind === "featured"
                      ? nativeColors.action.onPrimary
                      : badge.kind === "urgent"
                        ? nativeColors.status.error
                        : badge.kind === "promotion"
                          ? nativeColors.status.success
                          : nativeColors.action.primary
                  }
                />
              }
            >
              {badge.label}
            </Badge>
          ))}
        </View>
      ) : null}
      {favoriteAction ? (
        <View style={styles.favoriteAction}>{favoriteAction}</View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: nativeSizing.full,
    borderRadius: nativeRadius.listingCard,
    borderColor: nativeColors.border.subtle,
    position: "relative",
  },
  verticalCard: {
    width: nativeSizing.listingCard,
    height: nativeSizing.listingCardHeight,
    alignSelf: "center",
  },
  link: { flexDirection: "column" },
  verticalLink: { height: nativeSizing.full },
  pressed: { opacity: nativeOpacity.pressed },
  horizontal: { flexDirection: "row" },
  media: {
    width: nativeSizing.full,
    backgroundColor: nativeColors.surface.muted,
    position: "relative",
  },
  verticalMedia: { height: nativeSizing.listingCardMediaHeight },
  horizontalMedia: {
    width: nativeSizing.listingCardListImageSm,
    aspectRatio: nativeAspect.square,
  },
  image: { width: nativeSizing.full, height: nativeSizing.full },
  fallback: { alignItems: "center", justifyContent: "center" },
  body: {
    flex: 1,
    padding: nativeSpacing.md,
    gap: nativeSpacing.sm,
  },
  verticalBody: { gap: nativeSpacing.xs },
  shrink: { minWidth: nativeSpacing.none, flexShrink: 1 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeSpacing.xs,
  },
  horizontalFooter: { marginTop: "auto", gap: nativeSpacing.sm },
  verticalFooter: { marginTop: "auto", gap: nativeSpacing.xs },
  sellerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeSpacing.sm,
  },
  sellerInfo: { flex: 1, gap: nativeSpacing.xs },
  priceRow: {
    minHeight: nativeSizing.controlSm,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeSpacing.sm,
  },
  verticalPriceRow: { minHeight: nativeSpacing.none, gap: nativeSpacing.xs },
  priceText: { minWidth: nativeSpacing.none, flex: 1 },
  sellerSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    flexShrink: 1,
    minWidth: nativeSpacing.none,
    gap: nativeSpacing.xs,
  },
  sellerSummaryChevron: { marginLeft: "auto" },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: nativeSpacing.none,
    gap: nativeSpacing.xs / 2,
  },
  ratingCount: { flexShrink: 1, minWidth: nativeSpacing.none },
  promotionBadges: {
    pointerEvents: "none",
    position: "absolute",
    left: nativeSpacing.md,
    top: nativeSpacing.md,
    right: nativeSpacing.md,
    alignItems: "flex-start",
    gap: nativeSpacing.xs,
  },
  promotionBadgesWithFavorite: {
    right: nativeSizing.controlTouch + nativeSpacing.md + nativeSpacing.sm,
  },
  horizontalPromotionBadges: {
    maxWidth: nativeSizing.listingCardListImageSm - nativeSpacing.md * 2,
  },
  promotionBadge: { borderRadius: nativeRadius.pill },
  favoriteAction: {
    position: "absolute",
    right: nativeSpacing.md,
    top: nativeSpacing.md,
  },
  mediaDetails: {
    pointerEvents: "none",
    position: "absolute",
    left: nativeSpacing.md,
    right: nativeSpacing.md,
    bottom: nativeSpacing.md,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: nativeSpacing.sm,
  },
  capabilities: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeSpacing.sm,
  },
  verticalFacts: {
    minHeight: nativeSizing.controlSm,
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: nativeBorders.hairline,
    borderTopColor: nativeColors.border.subtle,
    paddingTop: nativeSpacing.sm,
  },
  verticalFact: {
    minWidth: nativeSpacing.none,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeSpacing.xs,
    paddingRight: nativeSpacing.sm,
  },
  verticalFactDivider: {
    borderLeftWidth: nativeBorders.hairline,
    borderLeftColor: nativeColors.border.subtle,
    paddingLeft: nativeSpacing.sm,
    paddingRight: nativeSpacing.none,
  },
});
