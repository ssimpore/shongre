import { Image, Pressable, StyleSheet, View } from "react-native";
import type { ListingCardView } from "@shongre/contracts";
import {
  nativeBorders,
  nativeColors,
  nativeOpacity,
  nativeRadius,
  nativeSpacing,
} from "@shongre/design-tokens/native";
import { formatMoney, formatRelativeTime } from "@shongre/shared";
import { Badge, Card, Heading, SemanticIcon, Text } from "@shongre/ui/native";
import {
  getListingPromotionBadges,
  listingAccessibilityLabel,
} from "./presentation";

export interface ListingCardProps {
  listing: ListingCardView;
  onPress: () => void;
  variant?: "grid" | "list" | "compact";
}
export function ListingCard({
  listing,
  onPress,
  variant = "grid",
}: ListingCardProps) {
  const price = listing.isFreeDonation ? "Gratuit" : formatMoney(listing.price);
  const originalPrice = listing.originalPrice
    ? formatMoney(listing.originalPrice)
    : undefined;
  const badges = getListingPromotionBadges(listing);
  const horizontal = variant === "list";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listingAccessibilityLabel(listing, price)}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card padding="none" style={horizontal && styles.horizontal}>
        <View style={[styles.media, horizontal && styles.horizontalMedia]}>
          {listing.imageUrl ? (
            <Image
              source={{ uri: listing.imageUrl }}
              style={styles.image}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.image, styles.fallback]}>
              <Text weight="bold" tone="primary">
                Shongre
              </Text>
            </View>
          )}
          {(listing.photoCount ?? 0) > 1 ? (
            <View
              style={styles.photoCount}
              accessibilityLabel={`${listing.photoCount} photos`}
            >
              <SemanticIcon
                name="camera"
                size="xs"
                color={nativeColors.action.onPrimary}
              />
              <Text size="caption" style={styles.inverseText}>
                {listing.photoCount}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          {badges.length ? (
            <View style={styles.badges}>
              {badges.map((badge) => (
                <Badge
                  key={badge.tone}
                  variant={badge.tone === "featured" ? "featured" : "urgent"}
                >
                  {badge.label}
                </Badge>
              ))}
            </View>
          ) : null}
          {listing.categoryLabel || listing.seller ? (
            <View style={styles.meta}>
              <Text
                size="caption"
                tone="muted"
                numberOfLines={1}
                style={styles.flex}
              >
                {[
                  listing.categoryLabel,
                  listing.seller?.sellerType === "pro"
                    ? "Pro"
                    : listing.seller?.name,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {(listing.seller?.rating ?? 0) > 0 ? (
                <View
                  style={styles.rating}
                  accessibilityLabel={`Note ${listing.seller?.rating?.toFixed(1)} sur 5, ${listing.seller?.reviewCount ?? 0} avis`}
                >
                  <SemanticIcon
                    name="star"
                    size="xs"
                    color={nativeColors.status.warning}
                  />
                  <Text size="caption" weight="semibold">
                    {listing.seller?.rating?.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Heading size="heading-xs" numberOfLines={2}>
            {listing.title}
          </Heading>
          <View style={styles.price}>
            <Text size="body-lg" weight="bold">
              {price}
            </Text>
            {originalPrice ? (
              <Text size="caption" tone="muted" style={styles.strike}>
                {originalPrice}
              </Text>
            ) : null}
          </View>
          <Text size="caption" tone="muted">
            {listing.conditionLabel}
          </Text>
          <View style={styles.footer}>
            <View style={[styles.inline, styles.flex]}>
              <SemanticIcon
                name="map-pin"
                size="xs"
                color={nativeColors.text.muted}
              />
              <Text
                size="caption"
                tone="muted"
                numberOfLines={1}
                style={styles.flex}
              >
                {listing.city}
              </Text>
            </View>
            <View style={styles.inline}>
              {listing.deliveryAvailable ? (
                <SemanticIcon
                  name="truck"
                  size="xs"
                  color={nativeColors.text.muted}
                />
              ) : null}
              <Text size="caption" tone="muted">
                {formatRelativeTime(listing.publishedAt, { style: "short" })}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  pressed: { opacity: nativeOpacity.pressed },
  horizontal: { flexDirection: "row" },
  media: {
    width: "100%",
    aspectRatio: 16 / 10,
    backgroundColor: nativeColors.surface.muted,
    position: "relative",
  },
  horizontalMedia: { width: 144, aspectRatio: 1 },
  image: { width: "100%", height: "100%" },
  fallback: { alignItems: "center", justifyContent: "center" },
  photoCount: {
    position: "absolute",
    left: nativeSpacing.sm,
    bottom: nativeSpacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeSpacing.xs,
    borderRadius: nativeRadius.control,
    paddingHorizontal: nativeSpacing.sm,
    paddingVertical: nativeSpacing.xs,
    backgroundColor: nativeColors.interaction.overlay,
  },
  inverseText: { color: nativeColors.text.inverse },
  body: { flex: 1, padding: nativeSpacing.md, gap: nativeSpacing.xs },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: nativeSpacing.xs },
  meta: { flexDirection: "row", alignItems: "center", gap: nativeSpacing.sm },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeSpacing.xs,
    borderWidth: nativeBorders.hairline,
    borderColor: nativeColors.border.default,
    borderRadius: nativeRadius.control,
    paddingHorizontal: nativeSpacing.sm,
    paddingVertical: nativeSpacing.xs,
  },
  price: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: nativeSpacing.sm,
  },
  strike: { textDecorationLine: "line-through" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeSpacing.sm,
    borderTopWidth: nativeBorders.hairline,
    borderTopColor: nativeColors.border.subtle,
    paddingTop: nativeSpacing.sm,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: nativeSpacing.xs },
  flex: { flex: 1 },
});
