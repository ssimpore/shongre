import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
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
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      setItems(await listingsService.list(activeMarket.code));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code]);

  useEffect(() => {
    let active = true;
    listingsService
      .list(activeMarket.code)
      .then((results) => {
        if (active) setItems(results);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Chargement impossible.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
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
          loading ? null : (
            <StatePanel
              title={error ? "Un problème est survenu" : "Aucune annonce"}
              message={
                error || "Revenez bientôt pour découvrir de nouvelles annonces."
              }
              actionLabel={error ? "Réessayer" : undefined}
              onAction={error ? load : undefined}
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
