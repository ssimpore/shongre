import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { ProBadge, VerificationBadge } from "@shongre/ui/native";
import type { ListingCardView } from "@shongre/contracts";
import { ListingCard } from "@/components/ListingCard";
import { StatePanel } from "@/components/StatePanel";
import { useLayoutMode } from "@/hooks/useLayoutMode";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { listingsService } from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";
import {
  sellersService,
  type MobilePublicSeller,
  type MobileSellerReview,
} from "@/features/sellers/sellers.service";

/**
 * A seller's public page: identity, trust facts, declared absence, reviews
 * and current listings — the same public projections the Web profile reads.
 */
export default function SellerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeMarket } = useMarket();
  const { columns } = useLayoutMode();
  const [retryVersion, setRetryVersion] = useState(0);
  const requestKey = `${id ?? ""}\u0000${activeMarket.code}\u0000${retryVersion}`;
  // Loading is derived from which request last answered, so the effect only
  // ever sets state from the response callbacks; `now` is captured there
  // rather than during render.
  const [result, setResult] = useState<{
    key: string;
    seller: MobilePublicSeller | null;
    reviews: MobileSellerReview[];
    listings: ListingCardView[];
    now: number;
    error: boolean;
  }>({
    key: "",
    seller: null,
    reviews: [],
    listings: [],
    now: 0,
    error: false,
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await sellersService.profile(id);
        if (!profile) {
          if (!cancelled)
            setResult({
              key: requestKey,
              seller: null,
              reviews: [],
              listings: [],
              now: Date.now(),
              error: false,
            });
          return;
        }
        const [reviews, listings] = await Promise.all([
          sellersService.reviews(profile.id).catch(() => []),
          listingsService.bySeller(profile.id, activeMarket.code, 24),
        ]);
        if (!cancelled)
          setResult({
            key: requestKey,
            seller: profile,
            reviews,
            listings,
            now: Date.now(),
            error: false,
          });
      } catch {
        if (!cancelled)
          setResult({
            key: requestKey,
            seller: null,
            reviews: [],
            listings: [],
            now: Date.now(),
            error: true,
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeMarket.code, id, requestKey]);

  const state: "loading" | "ready" | "missing" | "error" =
    result.key !== requestKey
      ? "loading"
      : result.error
        ? "error"
        : result.seller
          ? "ready"
          : "missing";
  const seller = state === "ready" ? result.seller : null;
  const reviews = state === "ready" ? result.reviews : [];
  const listings = state === "ready" ? result.listings : [];
  const isAway = Boolean(
    seller?.awayUntil && Date.parse(seller.awayUntil) > result.now,
  );
  const locale = activeMarket.defaultLocale;

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: seller?.name ?? "Vendeur" }} />
      <FlatList
        data={state === "ready" ? listings : []}
        keyExtractor={(item) => item.id}
        key={`seller-listings-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ListingCard listing={item} />
          </View>
        )}
        contentContainerStyle={styles.content}
        accessibilityState={{ busy: state === "loading" }}
        ListHeaderComponent={
          seller && state === "ready" ? (
            <>
              <View style={styles.identity}>
                <Text accessibilityRole="header" style={styles.heading}>
                  {seller.name}
                </Text>
                <View style={styles.badges}>
                  <Text style={styles.muted}>
                    {seller.sellerType === "pro"
                      ? "Professionnel"
                      : "Particulier"}
                  </Text>
                  {seller.sellerType === "pro" ? (
                    <ProBadge
                      size="xs"
                      label="Pro"
                      accessibilityLabel="Compte professionnel"
                    />
                  ) : seller.isVerified ? (
                    <VerificationBadge size="xs" label="Identité vérifiée" />
                  ) : null}
                </View>
                <Text style={styles.muted}>
                  {seller.reviewCount > 0
                    ? `${seller.rating.toFixed(1)} / 5 · ${seller.reviewCount} avis`
                    : "Pas encore d’avis"}
                  {seller.city ? ` · ${seller.city}` : ""}
                </Text>
                {seller.bio ? (
                  <Text style={styles.bio}>{seller.bio}</Text>
                ) : null}
              </View>

              {isAway ? (
                <View style={styles.away}>
                  <Text style={styles.awayTitle}>
                    Absent jusqu’au{" "}
                    {new Date(seller.awayUntil!).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                  <Text style={styles.muted}>
                    {seller.awayMessage ||
                      "Ses annonces sont en pause pendant ce temps."}
                  </Text>
                </View>
              ) : null}

              <Text accessibilityRole="header" style={styles.section}>
                Avis ({reviews.length})
              </Text>
              {reviews.length === 0 ? (
                <Text style={styles.muted}>
                  Les avis apparaîtront après les premières transactions
                  terminées.
                </Text>
              ) : (
                reviews.slice(0, 10).map((review) => (
                  <View key={review.id} style={styles.review}>
                    <View style={styles.reviewHead}>
                      <Text style={styles.reviewAuthor}>
                        {review.authorName}
                      </Text>
                      <Text
                        style={styles.reviewRating}
                        accessibilityLabel={`${review.rating} sur 5`}
                      >
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </Text>
                    </View>
                    <Text style={styles.muted}>
                      {new Date(review.createdAt).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {review.verifiedTransaction
                        ? " · Transaction vérifiée"
                        : ""}
                      {review.helpfulCount > 0
                        ? ` · Utile pour ${review.helpfulCount}`
                        : ""}
                    </Text>
                    <Text style={styles.reviewBody}>{review.comment}</Text>
                    {review.reply ? (
                      <View style={styles.reply}>
                        <Text style={styles.replyTitle}>
                          Réponse du vendeur
                        </Text>
                        <Text style={styles.reviewBody}>
                          {review.reply.comment}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}

              <Text accessibilityRole="header" style={styles.section}>
                Annonces en ligne ({listings.length})
              </Text>
            </>
          ) : null
        }
        ListEmptyComponent={
          state === "loading" ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Chargement…</Text>
            </View>
          ) : state === "missing" ? (
            <StatePanel
              title="Profil introuvable"
              message="Ce vendeur n’est pas ou plus visible."
              variant="notFound"
            />
          ) : state === "error" ? (
            <StatePanel
              title="Profil indisponible"
              message="Le profil n’a pas pu être chargé."
              tone="error"
              actionLabel="Réessayer"
              onAction={() => setRetryVersion((version) => version + 1)}
            />
          ) : (
            <Text style={styles.muted}>
              Aucune annonce en ligne pour le moment.
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { gap: spacing.lg },
  cell: { flex: 1 },
  identity: { gap: spacing.xs, marginBottom: spacing.md },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  badges: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bio: {
    color: colors.text,
    fontSize: nativeTypography.size.body,
    lineHeight: nativeTypography.lineHeight.body,
  },
  away: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  awayTitle: {
    color: colors.warning,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  section: {
    color: colors.text,
    fontSize: nativeTypography.size.headingSm,
    fontFamily: nativeTypography.fontFamily.bold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  review: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  reviewHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  reviewAuthor: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  reviewRating: { color: colors.warning },
  reviewBody: {
    color: colors.text,
    fontSize: nativeTypography.size.body,
    lineHeight: nativeTypography.lineHeight.body,
  },
  reply: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.xs,
  },
  replyTitle: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.bodySm,
  },
  muted: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
});
