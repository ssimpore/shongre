import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MODERATION_CONSTRAINTS,
  type ListingCardView,
  type ReportInput,
} from "@shongre/contracts";
import {
  Badge,
  Modal,
  ProBadge,
  SemanticIcon,
  VerificationBadge,
} from "@shongre/ui/native";
import { getListingPromotionBadges } from "@shongre/features/listings/presentation";
import { useListingPromotionRefresh } from "@shongre/features/listings/native";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  DetailFactList,
  DetailFeatureList,
  DetailSection,
} from "@/components/DetailFacts";
import { ListingCard } from "@/components/ListingCard";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeAspect,
  nativeBorders,
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFavorites } from "@/features/favorites/FavoritesProvider";
import { listingsService } from "@/features/listings/listings.service";
import {
  buildListingFactPresentation,
  type ListingCharacteristicsData,
} from "@shongre/features/listings/facts";
import { moderationService } from "@/features/moderation/moderation.service";
import { messagingService } from "@/features/messaging/messaging.service";
import { watchSubscriptionsService } from "@/features/watch-subscriptions/watch-subscriptions.service";
import { formatMoney } from "@/utils/format";
import { useMarket } from "@/features/market/MarketProvider";
import { messagesFr } from "@/i18n/messages.fr";

const REPORT_REASONS: {
  value: ReportInput["reason"];
  label: string;
}[] = [
  { value: "fraud", label: "Fraude" },
  { value: "counterfeit", label: "Contrefaçon" },
  { value: "prohibited", label: "Article interdit" },
  { value: "harassment", label: "Harcèlement" },
  { value: "other", label: "Autre" },
];

export default function ListingDetailScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    isFavorite,
    isPending: isFavoritePending,
    loadState: favoritesLoadState,
    retry: retryFavorites,
    toggleFavorite,
  } = useFavorites();
  const { activeMarket } = useMarket();
  const [expandedListingId, setExpandedListingId] = useState<string | null>(
    null,
  );
  const [listing, setListing] = useState<ListingCardView | null>(null);
  const [characteristics, setCharacteristics] =
    useState<ListingCharacteristicsData | null>(null);
  const [sellerListings, setSellerListings] = useState<ListingCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingConversation, setStartingConversation] = useState(false);
  const [priceWatchId, setPriceWatchId] = useState<string | null>(null);
  const [sellerWatchId, setSellerWatchId] = useState<string | null>(null);
  const [loadedEngagementKey, setLoadedEngagementKey] = useState("");
  const [engagementBusy, setEngagementBusy] = useState(false);
  const reportTrigger = useRef<View>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] =
    useState<ReportInput["reason"]>("fraud");
  const [reportDetails, setReportDetails] = useState("");
  const [reportError, setReportError] = useState("");
  const [reporting, setReporting] = useState(false);
  useListingPromotionRefresh(listing?.promotion);
  const promotionBadges = listing
    ? getListingPromotionBadges(listing, {
        boosted: messagesFr["ui.listingCard.boosted"],
        sponsored: messagesFr["ui.listingCard.sponsored"],
        featured: messagesFr["ui.listingCard.featured"],
        urgent: messagesFr["ui.listingCard.urgent"],
        promotion: messagesFr["ui.listingCard.promotion"],
      })
    : [];

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

  /*
   * What the listing actually is, and what else its seller has. Both are the
   * same questions the Web detail page answers, through the same projection and
   * the same API filter — the native screen simply never asked them.
   */
  useEffect(() => {
    let active = true;
    listingsService
      .characteristics(id, activeMarket.code)
      .then((data) => active && setCharacteristics(data))
      .catch(() => active && setCharacteristics(null));
    return () => {
      active = false;
    };
  }, [activeMarket.code, id]);

  const sellerId = listing?.seller?.id;
  useEffect(() => {
    if (!sellerId) return;
    let active = true;
    listingsService
      .bySeller(sellerId, activeMarket.code)
      .then(
        (items) =>
          active && setSellerListings(items.filter((row) => row.id !== id)),
      )
      .catch(() => active && setSellerListings([]));
    return () => {
      active = false;
    };
  }, [activeMarket.code, id, sellerId]);

  const facts = buildListingFactPresentation(characteristics);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    watchSubscriptionsService
      .list(user.id, activeMarket.code)
      .then((watches) => {
        if (!active) return;
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
  const favoriteActive = isFavorite(id);
  const activePriceWatchId = hasLoadedEngagement ? priceWatchId : null;
  const activeSellerWatchId = hasLoadedEngagement ? sellerWatchId : null;

  const requireLogin = (): boolean => {
    if (user) return true;
    router.push("/auth/login");
    return false;
  };

  const report = async () => {
    if (!listing) return;
    const details = reportDetails.trim();
    if (details.length < MODERATION_CONSTRAINTS.reportDetailsMinLength) {
      setReportError(
        `Décrivez le problème en au moins ${MODERATION_CONSTRAINTS.reportDetailsMinLength} caractères.`,
      );
      return;
    }
    setReporting(true);
    setReportError("");
    try {
      await moderationService.report({
        listingId: listing.id,
        reason: reportReason,
        details,
      });
      setReportOpen(false);
      setReportDetails("");
      setReportReason("fraud");
      Alert.alert(
        "Signalement reçu",
        "Notre équipe de modération examinera cette annonce.",
      );
    } catch (reason) {
      setReportError(
        reason instanceof Error ? reason.message : "Réessayez plus tard.",
      );
    } finally {
      setReporting(false);
    }
  };

  const openReport = () => {
    if (!listing || !requireLogin()) return;
    setReportError("");
    setReportOpen(true);
  };

  const blockSeller = async () => {
    if (!listing?.seller) return;
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

  const confirmBlockSeller = () => {
    if (!listing?.seller || !requireLogin()) return;
    Alert.alert(
      "Bloquer ce vendeur ?",
      "Cette personne ne pourra plus vous contacter. Vous pourrez la débloquer après l’action.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Bloquer",
          style: "destructive",
          onPress: () => void blockSeller(),
        },
      ],
    );
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

  const togglePriceWatch = async () => {
    if (!listing?.price || !requireLogin() || !user) return;
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
      <Screen edges={["top", "bottom"]}>
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          Chargement de l’annonce…
        </Text>
      </Screen>
    );
  if (!listing) {
    return (
      <Screen edges={["top", "bottom"]}>
        <StatePanel
          title="Annonce indisponible"
          message={error || "Cette annonce a peut-être été retirée."}
          tone={error ? "error" : "neutral"}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
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
          {promotionBadges.map((badge) => (
            <Badge
              key={badge.kind}
              testID={`listing-badge-${badge.kind}`}
              variant={badge.variant}
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
          {listing.requiresPhysicalDelivery === false ? (
            <Text style={styles.digital}>Produit numérique</Text>
          ) : null}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>
          {listing.title}
        </Text>
        {listing.priceKind === "free" ? (
          <Text style={styles.price}>{messagesFr["ui.listingCard.free"]}</Text>
        ) : listing.priceKind === "on_request" ? (
          <Text style={styles.price}>
            {messagesFr["ui.listingCard.onRequest"]}
          </Text>
        ) : listing.price ? (
          <Text style={styles.price}>{formatMoney(listing.price)}</Text>
        ) : null}
        <Text style={styles.muted}>
          {listing.requiresPhysicalDelivery === false
            ? `${listing.conditionLabel} · Aucune livraison physique`
            : `${listing.conditionLabel} · ${listing.city}`}
        </Text>
        {listing.productVersion ? (
          <Text style={styles.muted}>Version {listing.productVersion}</Text>
        ) : null}
      </View>
      {facts.keyFacts.length ? (
        <DetailSection title="Les informations clés">
          <DetailFactList facts={facts.keyFacts} />
          {facts.additionalCount ? (
            <>
              <Button
                variant="ghost"
                accessibilityState={{ expanded: expandedListingId === id }}
                onPress={() =>
                  setExpandedListingId(expandedListingId === id ? null : id)
                }
              >
                {expandedListingId === id
                  ? "Voir moins de critères"
                  : `Voir les ${facts.additionalCount} critères supplémentaires`}
              </Button>
              {expandedListingId === id
                ? facts.additionalGroups.map((group) => (
                    <View key={group.id}>
                      <Text accessibilityRole="header" style={styles.heading}>
                        {group.label}
                      </Text>
                      <DetailFactList facts={group.facts} />
                    </View>
                  ))
                : null}
            </>
          ) : null}
        </DetailSection>
      ) : null}

      {facts.features.length ? (
        <DetailSection title="Équipements et services">
          <DetailFeatureList features={facts.features} />
        </DetailSection>
      ) : null}

      {listing.city ? (
        <DetailSection title="Localisation">
          {/*
            The place name, and not yet a map: drawing one needs a basemap
            provider the product is entitled to use at scale, which is a
            purchasing decision rather than a native dependency to add blind.
          */}
          <Text style={styles.value}>{listing.city}</Text>
        </DetailSection>
      ) : null}

      {/*
        Derived rather than cleared in the effect: a listing with no seller must
        not show the previous listing's shelf, and emptying state from inside an
        effect is a cascading render the linter rightly refuses.
      */}
      {sellerId && sellerListings.length ? (
        <DetailSection
          title={
            listing.seller?.sellerType === "pro"
              ? "Les annonces de ce pro"
              : "Les annonces de ce vendeur"
          }
          subtitle="Les autres annonces publiées par ce vendeur."
        >
          {sellerListings.slice(0, 4).map((row) => (
            <View key={row.id} style={styles.railItem}>
              <ListingCard listing={row} />
            </View>
          ))}
        </DetailSection>
      ) : null}

      {listing.seller ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Voir le profil de ${listing.seller.name}`}
          onPress={() =>
            router.push(
              `/seller/${encodeURIComponent(listing.seller!.id)}` as never,
            )
          }
          style={styles.seller}
        >
          <Text style={styles.sellerName}>{listing.seller.name}</Text>
          <View style={styles.sellerIdentityStatus}>
            <Text style={styles.muted}>
              {listing.seller.sellerType === "pro"
                ? "Professionnel"
                : "Particulier"}
            </Text>
            {listing.seller.sellerType === "pro" ? (
              <ProBadge
                size="xs"
                label={messagesFr["ui.identityStatus.pro.short"]}
                accessibilityLabel={messagesFr["ui.identityStatus.pro.account"]}
              />
            ) : listing.seller.isIdentityVerified ? (
              <VerificationBadge
                size="xs"
                label={messagesFr["ui.identityStatus.verification.identity"]}
              />
            ) : null}
          </View>
          <Text style={styles.muted}>Voir le profil et les avis</Text>
        </Pressable>
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
        label={
          favoritesLoadState === "loading"
            ? messagesFr["ui.favorites.loading"]
            : favoritesLoadState === "error"
              ? messagesFr["ui.favorites.retry"]
              : favoriteActive
                ? messagesFr["ui.favorites.remove"]
                : messagesFr["ui.favorites.add"]
        }
        onPress={() =>
          void (favoritesLoadState === "error"
            ? retryFavorites()
            : toggleFavorite(listing.id))
        }
        disabled={
          favoritesLoadState === "loading" || isFavoritePending(listing.id)
        }
        loading={favoritesLoadState === "loading"}
        variant="secondary"
      />
      <Button
        label={activePriceWatchId ? "Désactiver l’alerte prix" : "Alerte prix"}
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
      <Button
        ref={reportTrigger}
        label="Signaler cette annonce"
        onPress={openReport}
        variant="ghost"
      />
      {listing.seller ? (
        <Button
          label="Bloquer ce vendeur"
          onPress={confirmBlockSeller}
          variant="danger"
        />
      ) : null}
      <Modal
        safeAreaInsets={safeAreaInsets}
        returnFocusRef={reportTrigger}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Signaler cette annonce"
        description="Choisissez le motif exact et décrivez uniquement les faits utiles à la vérification."
        dismissible={!reporting}
      >
        <View style={styles.reportForm}>
          <Text style={styles.sellerName}>Motif</Text>
          <View style={styles.reportReasons} accessibilityRole="radiogroup">
            {REPORT_REASONS.map((reason) => (
              <Button
                key={reason.value}
                label={reason.label}
                accessibilityRole="radio"
                accessibilityState={{ checked: reportReason === reason.value }}
                variant={
                  reportReason === reason.value ? "primary" : "secondary"
                }
                onPress={() => setReportReason(reason.value)}
                size="sm"
              />
            ))}
          </View>
          <FormField
            label="Description du problème"
            value={reportDetails}
            onChangeText={(value) => {
              setReportDetails(value);
              setReportError("");
            }}
            multiline
            maxLength={MODERATION_CONSTRAINTS.reportDetailsMaxLength}
            required
            error={reportError || undefined}
            hint="Au moins 10 caractères. N’ajoutez pas de données sensibles."
          />
          <View style={styles.reportActions}>
            <Button
              label="Annuler"
              variant="secondary"
              disabled={reporting}
              onPress={() => setReportOpen(false)}
              fullWidth
            />
            <Button
              label="Envoyer le signalement"
              variant="danger"
              loading={reporting}
              onPress={() => void report()}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: nativeSizing.full,
    aspectRatio: nativeAspect.media,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  titleGroup: { gap: spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  promotionBadge: { borderRadius: nativeRadius.pill },
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
  value: {
    color: colors.text,
    fontSize: nativeTypography.size.body,
    lineHeight: nativeTypography.lineHeight.body,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  railItem: { marginBottom: spacing.sm },
  seller: {
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
  },
  sellerName: {
    color: colors.text,
    fontSize: nativeTypography.size.bodyLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  sellerIdentityStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
  reportForm: { gap: spacing.md },
  reportReasons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reportActions: {
    gap: spacing.sm,
  },
});
