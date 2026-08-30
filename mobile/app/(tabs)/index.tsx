import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ListingCardView } from "@shongre/contracts";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListingCard } from "@/components/ListingCard";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { listingsService } from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";

export default function HomeScreen() {
  const { activeMarket } = useMarket();
  const [items, setItems] = useState<ListingCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedMarketCode, setLoadedMarketCode] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const fetchListings = useCallback(
    async (marketCode: string, currentRequest: number) => {
      try {
        const results = await listingsService.list(marketCode);
        if (currentRequest === requestId.current) {
          setItems(results);
          setError("");
          setLoadedMarketCode(marketCode);
        }
      } catch (reason) {
        if (currentRequest === requestId.current) {
          setItems([]);
          setError(
            reason instanceof Error ? reason.message : "Chargement impossible.",
          );
          setLoadedMarketCode(marketCode);
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const currentRequest = ++requestId.current;
    void fetchListings(activeMarket.code, currentRequest);
    return () => {
      requestId.current += 1;
    };
  }, [activeMarket.code, fetchListings]);

  const refresh = useCallback(() => {
    const currentRequest = ++requestId.current;
    setError("");
    setLoading(true);
    void fetchListings(activeMarket.code, currentRequest);
  }, [activeMarket.code, fetchListings]);

  const marketIsLoading = loading || loadedMarketCode !== activeMarket.code;
  const visibleItems = loadedMarketCode === activeMarket.code ? items : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={visibleItems}
        accessibilityState={{ busy: marketIsLoading }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={marketIsLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              Shongre · {activeMarket.flag} {activeMarket.name}
            </Text>
            <Text accessibilityRole="header" style={styles.heading}>
              Trouvez ce qui mérite une seconde vie.
            </Text>
            <Text style={styles.subtitle}>
              Des annonces locales, des vendeurs identifiés et des échanges
              protégés.
            </Text>
          </View>
        }
        ListEmptyComponent={
          marketIsLoading ? (
            <View
              accessibilityLiveRegion="polite"
              accessibilityLabel="Chargement des annonces"
              style={styles.loadingState}
            >
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.subtitle}>Chargement des annonces…</Text>
            </View>
          ) : (
            <StatePanel
              title={error ? "Un problème est survenu" : "Aucune annonce"}
              message={
                error || "Revenez bientôt pour découvrir de nouvelles annonces."
              }
              actionLabel={error ? "Réessayer" : undefined}
              onAction={error ? refresh : undefined}
              tone={error ? "error" : "neutral"}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: nativeTypography.size.caption,
    fontFamily: nativeTypography.fontFamily.bold,
    textTransform: "uppercase",
  },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    lineHeight: nativeTypography.lineHeight.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.body,
    lineHeight: nativeTypography.lineHeight.body,
  },
});
