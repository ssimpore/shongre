import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import type { ListingCardView } from "@shongre/contracts";
import { ListingCard } from "@/components/ListingCard";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { favoritesService } from "@/features/favorites/favorites.service";
import { listingsService } from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

export default function MobileFavoritesScreen() {
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [items, setItems] = useState<ListingCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ids = await favoritesService.list(user.id, activeMarket.code);
      const listings = await Promise.all(
        ids.map((id) => listingsService.get(id, activeMarket.code)),
      );
      setItems(
        listings.filter((item): item is ListingCardView => Boolean(item)),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Favoris indisponibles.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: "Mes favoris" }} />
      <FlatList
        data={items}
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
              title={error ? "Favoris indisponibles" : "Aucun favori"}
              message={
                error ||
                "Ajoutez une annonce depuis sa fiche pour la retrouver ici."
              }
              tone={error ? "error" : "neutral"}
              actionLabel={error ? "Réessayer" : undefined}
              onAction={error ? () => void load() : undefined}
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
