import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { ListingCard } from "@/components/ListingCard";
import { StatePanel } from "@/components/StatePanel";
import { useFavorites } from "@/features/favorites/FavoritesProvider";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

export default function MobileFavoritesScreen() {
  const {
    favoriteListings,
    favoriteListingsComplete,
    loading: favoritesLoading,
    loadState,
    error: favoritesError,
    refresh: refreshFavorites,
  } = useFavorites();

  const load = useCallback(
    () => refreshFavorites().catch(() => undefined),
    [refreshFavorites],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loading =
    favoritesLoading || (loadState === "ready" && !favoriteListingsComplete);
  const displayedListings =
    loadState === "ready" && favoriteListingsComplete ? favoriteListings : [];

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: "Mes favoris" }} />
      <FlatList
        data={displayedListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.content}
        accessibilityState={{ busy: loading }}
        ListHeaderComponent={
          <Text accessibilityRole="header" style={styles.heading}>
            Mes favoris
          </Text>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Chargement…</Text>
            </View>
          ) : (
            <StatePanel
              title={favoritesError ? "Favoris indisponibles" : "Aucun favori"}
              message={
                favoritesError ||
                "Ajoutez une annonce depuis sa fiche pour la retrouver ici."
              }
              tone={favoritesError ? "error" : "neutral"}
              actionLabel={favoritesError ? "Réessayer" : undefined}
              onAction={favoritesError ? () => void load() : undefined}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  loading: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  muted: { color: colors.textMuted },
});
