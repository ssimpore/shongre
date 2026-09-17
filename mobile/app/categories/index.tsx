import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { TaxonomyV1Node } from "@shongre/contracts";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { taxonomyService } from "@/features/taxonomy/taxonomy.service";
import { useMarket } from "@/features/market/MarketProvider";

function label(node: TaxonomyV1Node, locale: string): string {
  return (
    node.shortLabels[locale] ||
    node.labels[locale] ||
    node.labels["fr-FR"] ||
    node.slug
  );
}

/**
 * The published category tree of the active market, one level at a time.
 * A node with children opens them; a leaf runs the search filtered by it.
 * The tree is the same market-scoped projection the Web navigation reads,
 * so nothing here decides which categories exist.
 */
export default function CategoriesScreen() {
  const router = useRouter();
  const { parentId } = useLocalSearchParams<{ parentId?: string }>();
  const { activeMarket, marketContext } = useMarket();
  const locale = activeMarket.defaultLocale;
  const [retryVersion, setRetryVersion] = useState(0);
  const requestKey = `${marketContext.countryCode ?? ""}\u0000${locale}\u0000${retryVersion}`;
  // Loading is derived from which request last answered, so the effect only
  // ever sets state from the response callbacks.
  const [result, setResult] = useState<{
    key: string;
    nodes: TaxonomyV1Node[];
    error: boolean;
  }>({ key: "", nodes: [], error: false });

  useEffect(() => {
    let cancelled = false;
    taxonomyService
      .tree({ marketContext, locale })
      .then((tree) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          nodes: tree.items.filter((node) => node.status === "active"),
          error: false,
        });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, nodes: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [locale, marketContext, requestKey]);

  const state: "loading" | "ready" | "error" =
    result.key !== requestKey ? "loading" : result.error ? "error" : "ready";
  const nodes = state === "ready" ? result.nodes : [];

  const parent = parentId ? nodes.find((node) => node.id === parentId) : null;
  const visible = nodes
    .filter((node) => (parentId ? node.parentId === parentId : !node.parentId))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const hasChildren = (node: TaxonomyV1Node) =>
    nodes.some((candidate) => candidate.parentId === node.id);

  const open = (node: TaxonomyV1Node) => {
    if (hasChildren(node)) {
      router.push({
        pathname: "/categories",
        params: { parentId: node.id },
      } as never);
      return;
    }
    router.push({
      pathname: "/(tabs)/search",
      params: { categoryId: node.id, categoryLabel: label(node, locale) },
    } as never);
  };

  return (
    <View style={styles.safe}>
      <Stack.Screen
        options={{ title: parent ? label(parent, locale) : "Catégories" }}
      />
      <FlatList
        data={state === "ready" ? visible : []}
        keyExtractor={(node) => node.id}
        contentContainerStyle={styles.content}
        accessibilityState={{ busy: state === "loading" }}
        ListHeaderComponent={
          parent ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/search",
                  params: {
                    categoryId: parent.id,
                    categoryLabel: label(parent, locale),
                  },
                } as never)
              }
              style={[styles.row, styles.rowAll]}
            >
              <Text style={styles.rowText}>
                Toutes les annonces « {label(parent, locale)} »
              </Text>
            </Pressable>
          ) : (
            <Text accessibilityRole="header" style={styles.heading}>
              Catégories
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityHint={
              hasChildren(item)
                ? "Ouvre les sous-catégories"
                : "Affiche les annonces de cette catégorie"
            }
            onPress={() => open(item)}
            style={styles.row}
          >
            <Text style={styles.rowText}>{label(item, locale)}</Text>
            <Text style={styles.chevron}>{hasChildren(item) ? "›" : "→"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          state === "loading" ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Chargement…</Text>
            </View>
          ) : state === "error" ? (
            <StatePanel
              title="Catégories indisponibles"
              message="Le catalogue n’a pas pu être chargé."
              tone="error"
              actionLabel="Réessayer"
              onAction={() => setRetryVersion((version) => version + 1)}
            />
          ) : (
            <Text style={styles.muted}>Aucune catégorie disponible.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
    marginBottom: spacing.md,
  },
  row: {
    minHeight: nativeSizing.controlTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowAll: { borderColor: colors.primary, marginBottom: spacing.sm },
  rowText: {
    flex: 1,
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.body,
  },
  chevron: { color: colors.textMuted, fontSize: nativeTypography.size.bodyLg },
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
