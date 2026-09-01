import { useRouter } from "expo-router";
import type { ListingCardView } from "@shongre/contracts";
import { ListingCard as SharedListingCard } from "@shongre/features/listings/native";
import { StyleSheet, Text, View } from "react-native";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

export function ListingCard({ listing }: { listing: ListingCardView }) {
  const router = useRouter();
  return (
    <View style={styles.wrapper}>
      {listing.requiresPhysicalDelivery === false ? (
        <Text accessibilityRole="text" style={styles.badge}>
          Produit numérique · aucune livraison physique
        </Text>
      ) : null}
      <SharedListingCard
        listing={listing}
        onPress={() => router.push(`/listing/${listing.id}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.micro,
  },
});
