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
import { messagingService } from "@/features/messaging/messaging.service";
import { favoritesService } from "@/features/favorites/favorites.service";
import { watchSubscriptionsService } from "@/features/watch-subscriptions/watch-subscriptions.service";
import { formatMoney } from "@/utils/format";
import { useMarket } from "@/features/market/MarketProvider";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [listing, setListing] = useState<ListingCardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingConversation, setStartingConversation] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [priceWatchId, setPriceWatchId] = useState<string | null>(null);
  const [sellerWatchId, setSellerWatchId] = useState<string | null>(null);
  const [loadedEngagementKey, setLoadedEngagementKey] = useState("");
  const [engagementBusy, setEngagementBusy] = useState(false);

  useEffect(() => {
    let active = true;
    listingsService
      .get(id, activeMarket.code)
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
  }, [activeMarket.code, id]);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    Promise.all([
      favoritesService.list(user.id, activeMarket.code),
      watchSubscriptionsService.list(user.id, activeMarket.code),
    ])
      .then(([favoriteIds, watches]) => {
        if (!active) return;
        setIsFavorite(favoriteIds.includes(id));
        setPriceWatchId(
          watches.find(
            (item) =>
              item.targetType === "listing_price" && item.targetId === id,
          )?.id || null,
        );
        setSellerWatchId(
          watches.find(
            (item) =>
              item.targetType === "seller" &&
              item.targetId === listing?.seller?.id,
          )?.id || null,
        );
        setLoadedEngagementKey(`${user.id}::${activeMarket.code}::${id}`);
      })
      .catch(() => {
        if (active)
          setError(
            "Certains réglages de suivi sont momentanément indisponibles.",
          );
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, id, listing?.seller?.id, user]);

  const currentEngagementKey =
    user && id ? `${user.id}::${activeMarket.code}::${id}` : "";
  const hasLoadedEngagement = loadedEngagementKey === currentEngagementKey;
  const favoriteActive = hasLoadedEngagement && isFavorite;
  const activePriceWatchId = hasLoadedEngagement ? priceWatchId : null;
  const activeSellerWatchId = hasLoadedEngagement ? sellerWatchId : null;

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

  const contactSeller = async () => {
    if (!listing || !requireLogin() || !user) return;
    setStartingConversation(true);
    try {
      const conversation = await messagingService.createForListing({
        listingId: listing.id,
        marketCode: activeMarket.code,
        userId: user.id,
      });
      router.push(`/messages/${conversation.id}` as never);
    } catch (reason) {
      Alert.alert(
        "Conversation impossible",
        reason instanceof Error ? reason.message : "Réessayez plus tard.",
      );
    } finally {
      setStartingConversation(false);
    }
  };

  const toggleFavorite = async () => {
    if (!listing || !requireLogin() || !user) return;
    setEngagementBusy(true);
    try {
      setIsFavorite(
        await favoritesService.toggle(user.id, activeMarket.code, listing.id),
      );
    } catch (reason) {
      Alert.alert(
        "Favori indisponible",
        reason instanceof Error ? reason.message : "Réessayez plus tard.",
      );
    } finally {
      setEngagementBusy(false);
    }
  };

  const togglePriceWatch = async () => {
    if (!listing || !requireLogin() || !user) return;
    setEngagementBusy(true);
    try {
      if (activePriceWatchId) {
        await watchSubscriptionsService.remove(
          user.id,
          activeMarket.code,
          activePriceWatchId,
        );
        setPriceWatchId(null);
      } else {
        const watch = await watchSubscriptionsService.createOrReplace(user.id, {
          marketCode: activeMarket.code,
          targetType: "listing_price",
          targetId: listing.id,
          title: listing.title,
          frequency: "immediate",
          channels: { inApp: true, email: false, push: true },
          baselinePrice: listing.price,
        });
        setPriceWatchId(watch.id);
      }
    } catch (reason) {
      Alert.alert(
        "Alerte indisponible",
        reason instanceof Error ? reason.message : "Réessayez plus tard.",
      );
    } finally {
      setEngagementBusy(false);
    }
  };

  const toggleSellerWatch = async () => {
    if (!listing?.seller || !requireLogin() || !user) return;
    setEngagementBusy(true);
    try {
      if (activeSellerWatchId) {
        await watchSubscriptionsService.remove(
          user.id,
          activeMarket.code,
          activeSellerWatchId,
        );
        setSellerWatchId(null);
      } else {
        const watch = await watchSubscriptionsService.createOrReplace(user.id, {
          marketCode: activeMarket.code,
          targetType: "seller",
          targetId: listing.seller.id,
          title: listing.seller.name,
          frequency: "daily",
          channels: { inApp: true, email: false, push: true },
        });
        setSellerWatchId(watch.id);
      }
    } catch (reason) {
      Alert.alert(
        "Suivi indisponible",
        reason instanceof Error ? reason.message : "Réessayez plus tard.",
      );
    } finally {
      setEngagementBusy(false);
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
        <Image
          source={{ uri: listing.imageUrl }}
          style={styles.image}
          accessibilityLabel={`Photo de l’annonce : ${listing.title}`}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.titleGroup}>
        <View style={styles.badges}>
          {listing.isUrgent ? <Text style={styles.urgent}>Urgent</Text> : null}
          {listing.isFeatured ? (
            <Text style={styles.featured}>À la une · sponsorisé</Text>
          ) : null}
          {listing.requiresPhysicalDelivery === false ? (
            <Text style={styles.digital}>Produit numérique</Text>
          ) : null}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{formatMoney(listing.price)}</Text>
        <Text style={styles.muted}>
          {listing.requiresPhysicalDelivery === false
            ? `${listing.conditionLabel} · Aucune livraison physique`
            : `${listing.conditionLabel} · ${listing.city}`}
        </Text>
        {listing.productVersion ? (
          <Text style={styles.muted}>Version {listing.productVersion}</Text>
        ) : null}
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
        label={
          startingConversation
            ? "Ouverture…"
            : user
              ? "Contacter le vendeur"
              : "Se connecter pour contacter"
        }
        onPress={() => void contactSeller()}
        disabled={startingConversation}
      />
      <Button
        label={favoriteActive ? "Retirer des favoris" : "Ajouter aux favoris"}
        onPress={() => void toggleFavorite()}
        disabled={engagementBusy}
        variant="secondary"
      />
      <Button
        label={
          activePriceWatchId
            ? "Désactiver l’alerte prix"
            : "Alerte baisse de prix"
        }
        onPress={() => void togglePriceWatch()}
        disabled={engagementBusy}
        variant="secondary"
      />
      {listing.seller ? (
        <Button
          label={
            activeSellerWatchId
              ? "Ne plus suivre ce vendeur"
              : "Suivre ce vendeur"
          }
          onPress={() => void toggleSellerWatch()}
          disabled={engagementBusy}
          variant="secondary"
        />
      ) : null}
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
  digital: {
    color: colors.primary,
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
