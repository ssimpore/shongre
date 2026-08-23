import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ListingCardView } from "@shongre/contracts";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { listingsService } from "@/features/listings/listings.service";
import { moderationService } from "@/features/moderation/moderation.service";
import { formatMoney } from "@/utils/format";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingCardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listingsService
      .get(id)
      .then((item) => active && setListing(item))
      .catch(
        (reason) =>
          active &&
          setError(
            reason instanceof Error ? reason.message : "Annonce indisponible.",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const requireLogin = (): boolean => {
    if (user) return true;
    router.push("/auth/login");
    return false;
  };

  const report = async () => {
    if (!listing || !requireLogin()) return;
    try {
      await moderationService.report({
        listingId: listing.id,
        reason: "other",
        details:
          "Signalement initié depuis la fiche mobile : contenu à vérifier par la modération.",
      });
      Alert.alert(
        "Signalement reçu",
        "Notre équipe de modération examinera cette annonce.",
      );
    } catch (reason) {
      Alert.alert(
        "Signalement impossible",
        reason instanceof Error ? reason.message : "Réessayez plus tard.",
      );
    }
  };

  const blockSeller = async () => {
    if (!listing?.seller || !requireLogin()) return;
    const sellerId = listing.seller.id;
    try {
      await moderationService.blockUser(sellerId);
      Alert.alert(
        "Utilisateur bloqué",
        "Cet utilisateur ne peut plus vous contacter.",
        [
          { text: "Fermer", style: "cancel" },
          {
            text: "Débloquer",
            onPress: () => {
              void moderationService
                .unblockUser(sellerId)
                .catch((reason) =>
                  Alert.alert(
                    "Déblocage impossible",
                    reason instanceof Error
                      ? reason.message
                      : "Réessayez plus tard.",
                  ),
                );
            },
          },
        ],
      );
    } catch (reason) {
      Alert.alert(
        "Blocage impossible",
        reason instanceof Error ? reason.message : "Réessayez plus tard.",
      );
    }
  };

  if (loading)
    return (
      <Screen>
        <Text style={styles.muted}>Chargement de l’annonce…</Text>
      </Screen>
    );
  if (!listing) {
    return (
      <Screen>
        <StatePanel
          title="Annonce indisponible"
          message={error || "Cette annonce a peut-être été retirée."}
          tone={error ? "error" : "neutral"}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {listing.imageUrl ? (
        <Image source={{ uri: listing.imageUrl }} style={styles.image} />
      ) : null}
      <View style={styles.titleGroup}>
        <View style={styles.badges}>
          {listing.isUrgent ? <Text style={styles.urgent}>Urgent</Text> : null}
          {listing.isFeatured ? (
            <Text style={styles.featured}>À la une · sponsorisé</Text>
          ) : null}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{formatMoney(listing.price)}</Text>
        <Text style={styles.muted}>
          {listing.conditionLabel} · {listing.city}
        </Text>
      </View>
      {listing.seller ? (
        <View style={styles.seller}>
          <Text style={styles.sellerName}>{listing.seller.name}</Text>
          <Text style={styles.muted}>
            {listing.seller.sellerType === "pro"
              ? "Professionnel"
              : "Particulier"}
            {listing.seller.isIdentityVerified ? " · Identité vérifiée" : ""}
          </Text>
        </View>
      ) : null}
      <Button
        label={user ? "Contacter le vendeur" : "Se connecter pour contacter"}
        onPress={() => {
          if (requireLogin()) router.push("/(tabs)/messages");
        }}
      />
      <View style={styles.safety}>
        <Text style={styles.safetyTitle}>Achetez en sécurité</Text>
        <Text style={styles.muted}>
          Restez dans la messagerie Shongre et n’envoyez jamais d’argent en
          dehors du parcours de paiement prévu.
        </Text>
      </View>
      <Button label="Signaler cette annonce" onPress={report} variant="ghost" />
      {listing.seller ? (
        <Button
          label="Bloquer ce vendeur"
          onPress={blockSeller}
          variant="danger"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  titleGroup: { gap: spacing.sm },
  badges: { flexDirection: "row", gap: spacing.sm },
  urgent: {
    color: colors.danger,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  featured: {
    color: colors.warning,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingMd,
    lineHeight: nativeTypography.lineHeight.headingMd,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  price: {
    color: colors.text,
    fontSize: nativeTypography.size.headingMd,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  muted: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  seller: {
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sellerName: {
    color: colors.text,
    fontSize: nativeTypography.size.bodyLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  safety: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  safetyTitle: {
    color: colors.success,
    fontSize: nativeTypography.size.body,
    fontFamily: nativeTypography.fontFamily.bold,
  },
});
