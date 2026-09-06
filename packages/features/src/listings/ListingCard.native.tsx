import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import type { ListingCardView } from "@shongre/contracts";
import {
  nativeAspect,
  nativeColors,
  nativeOpacity,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
} from "@shongre/design-tokens/native";
import { formatRelativeTime } from "@shongre/shared";
import {
  Badge,
  Card,
  Heading,
  ProBadge,
  SemanticIcon,
  Text,
} from "@shongre/ui/native";
import {
  getListingCardPriceText,
  getListingPromotionBadges,
  getListingSellerRatingPresentation,
  listingAccessibilityLabel,
} from "./presentation";
import { useListingPromotionRefresh } from "./use-listing-promotion-refresh";

export interface ListingCardProps {
  listing: ListingCardView;
  onPress: () => void;
  locale?: string;
  variant?: "grid" | "list" | "compact";
  favoriteAction?: ReactNode;
  labels: {
    boosted: string;
    free: string;
    onRequest: string;
    rating: (rating: string, count: string) => string;
    imageUnavailable: string;
  };
  identityLabels: {
    pro: string;
    proAccessibility: string;
  };
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
  const badges = getListingPromotionBadges(listing, labels.boosted);
  const horizontal = variant === "list";
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
  const isProfessional =
    listing.publisherType === "professional" ||
    listing.seller?.sellerType === "pro";

  return (
    <Card padding="none" style={styles.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={listingAccessibilityLabel(
          listing,
          price,
          ratingLabel,
          badges[0]?.label,
          isProfessional ? identityLabels.proAccessibility : undefined,
          published,
        )}
        onPress={onPress}
        style={({ pressed }) => [
          styles.link,
          horizontal && styles.horizontal,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.media, horizontal && styles.horizontalMedia]}>
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
        </View>

        <View style={styles.body}>
          <Text size="caption" tone="muted" numberOfLines={1}>
            {categoryLine}
          </Text>

          <View style={styles.priceRow}>
            <View style={styles.priceText}>
              {price ? (
                <Text size="body-lg" weight="bold" numberOfLines={1}>
                  {price}
                </Text>
              ) : null}
            </View>
            {isProfessional || rating ? (
              <View style={styles.sellerSummary}>
                {isProfessional ? (
                  <ProBadge
                    label={identityLabels.pro}
                    accessibilityLabel={identityLabels.proAccessibility}
                    size="xs"
                    tone="primary"
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
              </View>
            ) : null}
          </View>

          <Heading size="heading-xs" numberOfLines={1}>
            {listing.title}
          </Heading>
          <Text size="caption" tone="muted" numberOfLines={1}>
            {metaLine}
          </Text>
        </View>
      </Pressable>

      {badges.length ? (
        <View pointerEvents="none" style={styles.boostedBadge}>
          <Badge
            variant="primary"
            size="sm"
            icon={
              <SemanticIcon
                name="zap"
                size="xs"
                color={nativeColors.action.primary}
              />
            }
          >
            {badges[0]?.label ?? labels.boosted}
          </Badge>
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
    borderRadius: nativeRadius.listingCard,
    borderColor: nativeColors.border.subtle,
    position: "relative",
  },
  link: { flexDirection: "column" },
  pressed: { opacity: nativeOpacity.pressed },
  horizontal: { flexDirection: "row" },
  media: {
    width: nativeSizing.full,
    aspectRatio: nativeAspect.listingCard,
    backgroundColor: nativeColors.surface.muted,
    position: "relative",
  },
  horizontalMedia: {
    width: nativeSizing.listingCardListImageSm,
    aspectRatio: nativeAspect.square,
  },
  image: { width: nativeSizing.full, height: nativeSizing.full },
  fallback: { alignItems: "center", justifyContent: "center" },
  body: {
    flex: 1,
    padding: nativeSpacing.md,
    gap: nativeSpacing.xs,
  },
  priceRow: {
    minHeight: nativeSizing.controlSm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeSpacing.sm,
  },
  priceText: { minWidth: nativeSpacing.none, flex: 1 },
  sellerSummary: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: nativeSpacing.none,
    gap: nativeSpacing.xs,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: nativeSpacing.none,
    gap: nativeSpacing.xs / 2,
  },
  ratingCount: { flexShrink: 1, minWidth: nativeSpacing.none },
  boostedBadge: {
    position: "absolute",
    left: nativeSpacing.md,
    top: nativeSpacing.md,
  },
  favoriteAction: {
    position: "absolute",
    right: nativeSpacing.md,
    top: nativeSpacing.md,
  },
});
