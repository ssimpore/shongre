import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ListingCardView } from "@shongre/contracts";
import { FormField } from "@/components/FormField";
import { ListingCard } from "@/components/ListingCard";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { listingsService } from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";

export default function SearchScreen() {
  const { activeMarket } = useMarket();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ListingCardView[]>([]);
  const [error, setError] = useState("");
  const [completedRequestKey, setCompletedRequestKey] = useState("");
  const requestId = useRef(0);
  const requestKey = `${activeMarket.code}\u0000${query}`;
  const loading = completedRequestKey !== requestKey;
  const visibleItems = loading ? [] : items;
  const visibleError = loading ? "" : error;

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const currentRequestKey = requestKey;
    const timer = setTimeout(() => {
      listingsService
        .list(activeMarket.code, query)
        .then((results) => {
          if (currentRequest === requestId.current) {
            setItems(results);
            setError("");
          }
        })
        .catch((reason) => {
          if (currentRequest === requestId.current) {
            setItems([]);
            setError(
              reason instanceof Error
                ? reason.message
                : "Recherche impossible.",
            );
          }
        })
        .finally(() => {
          if (currentRequest === requestId.current) {
            setCompletedRequestKey(currentRequestKey);
          }
        });
    }, 250);
    return () => {
      requestId.current += 1;
      clearTimeout(timer);
    };
  }, [activeMarket.code, query, requestKey]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={visibleItems}
        accessibilityState={{ busy: loading }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text accessibilityRole="header" style={styles.heading}>
              Rechercher
            </Text>
            <FormField
              label="Que recherchez-vous ?"
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setError("");
              }}
              placeholder={`Rechercher en ${activeMarket.name}…`}
              returnKeyType="search"
            />
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View
              accessibilityLiveRegion="polite"
              accessibilityLabel="Recherche en cours"
              style={styles.loadingState}
            >
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Recherche en cours…</Text>
            </View>
          ) : (
            <StatePanel
              title={visibleError ? "Recherche indisponible" : "Aucun résultat"}
              message={
                visibleError ||
                "Essayez un terme plus général ou vérifiez l’orthographe."
              }
              tone={visibleError ? "error" : "neutral"}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
    marginBottom: spacing.lg,
  },
});
