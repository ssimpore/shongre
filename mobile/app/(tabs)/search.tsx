import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
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

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ListingCardView[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      listingsService
        .list(query)
        .then((results) => active && setItems(results))
        .catch(
          (reason) =>
            active &&
            setError(
              reason instanceof Error
                ? reason.message
                : "Recherche impossible.",
            ),
        );
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={items}
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
              placeholder="Vélo, meuble, appareil photo…"
              returnKeyType="search"
            />
          </>
        }
        ListEmptyComponent={
          <StatePanel
            title={error ? "Recherche indisponible" : "Aucun résultat"}
            message={
              error ||
              "Essayez un terme plus général ou vérifiez l’orthographe."
            }
            tone={error ? "error" : "neutral"}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
    marginBottom: spacing.lg,
  },
});
