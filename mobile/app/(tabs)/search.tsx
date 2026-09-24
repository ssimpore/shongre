import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ListingCardView } from "@shongre/contracts";
import { majorToMinorAmount } from "@shongre/shared/money";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";
import { useLayoutMode } from "@/hooks/useLayoutMode";
import { ListingCard } from "@/components/ListingCard";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  nativeBorders,
  nativeRadius,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import {
  listingsService,
  mobileSearchCategoryId,
  type MobileSearchScope,
  type MobileSearchSuggestion,
} from "@/features/listings/listings.service";
import {
  mobileSavedSearchTargetId,
  parseMobileSearchPriceRange,
} from "@/features/listings/search-input";
import { useMarket } from "@/features/market/MarketProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { watchSubscriptionsService } from "@/features/watch-subscriptions/watch-subscriptions.service";

export default function SearchScreen() {
  const router = useRouter();
  const { columns } = useLayoutMode();
  const { activeMarket } = useMarket();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryLabel?: string;
  }>();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<MobileSearchScope>("marketplace");
  // A category chosen in the browser: the filter is the route parameter, so
  // back navigation and a fresh open of the tab agree on what is filtered.
  const categoryId =
    typeof params.categoryId === "string" ? params.categoryId : "";
  const categoryLabel =
    typeof params.categoryLabel === "string" ? params.categoryLabel : "";
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [alertNotice, setAlertNotice] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);
  const [items, setItems] = useState<ListingCardView[]>([]);
  const [didYouMean, setDidYouMean] = useState("");
  const [suggestions, setSuggestions] = useState<MobileSearchSuggestion[]>([]);
  const [error, setError] = useState("");
  const [completedRequestKey, setCompletedRequestKey] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const [resultsMarketCode, setResultsMarketCode] = useState("");
  const [nextCursor, setNextCursor] = useState<string>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState("");
  const requestId = useRef(0);
  const paginationInFlight = useRef(false);
  const priceRange = useMemo(
    () => parseMobileSearchPriceRange(minPrice, maxPrice),
    [maxPrice, minPrice],
  );
  const hasPriceError = Boolean(
    priceRange.minimumError || priceRange.maximumError,
  );
  const requestKey = `${activeMarket.code}\u0000${scope}\u0000${categoryId}\u0000${query}\u0000${minPrice}\u0000${maxPrice}\u0000${retryVersion}`;
  const loading = !hasPriceError && completedRequestKey !== requestKey;
  const visibleItems =
    !hasPriceError && resultsMarketCode === activeMarket.code ? items : [];
  const visibleError = loading ? "" : error;

  const saveAlert = async () => {
    const normalizedQuery = query.trim();
    if (!user || !normalizedQuery) return;
    setSavingAlert(true);
    setAlertNotice("");
    try {
      if (hasPriceError) {
        throw new Error("Vérifiez les prix minimum et maximum.");
      }
      const minPriceMinor =
        priceRange.minimum !== undefined
          ? majorToMinorAmount(priceRange.minimum, activeMarket.currency)
          : undefined;
      const maxPriceMinor =
        priceRange.maximum !== undefined
          ? majorToMinorAmount(priceRange.maximum, activeMarket.currency)
          : undefined;
      const alertCategoryId = categoryId || mobileSearchCategoryId(scope);
      await watchSubscriptionsService.createOrReplace(user.id, {
        marketCode: activeMarket.code,
        targetType: "saved_search",
        targetId: mobileSavedSearchTargetId({
          marketCode: activeMarket.code,
          query: normalizedQuery,
          locale: activeMarket.defaultLocale,
          categoryId: alertCategoryId,
          minPriceMinor,
          maxPriceMinor,
        }),
        title: normalizedQuery,
        frequency: "daily",
        channels: { inApp: true, email: false, push: true },
        searchFilter: {
          query: normalizedQuery,
          ...(alertCategoryId ? { categoryId: alertCategoryId } : {}),
          ...(minPriceMinor !== undefined ? { minPriceMinor } : {}),
          ...(maxPriceMinor !== undefined ? { maxPriceMinor } : {}),
        },
      });
      setAlertNotice(
        `Alerte quotidienne créée pour « ${normalizedQuery} »${alertCategoryId ? ` dans ${categoryLabel || "la catégorie sélectionnée"}` : ""}.`,
      );
    } catch (reason) {
      setAlertNotice(
        reason instanceof Error
          ? reason.message
          : "Création de l’alerte impossible.",
      );
    } finally {
      setSavingAlert(false);
    }
  };

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const currentRequestKey = requestKey;
    paginationInFlight.current = false;
    if (hasPriceError) {
      return () => {
        requestId.current += 1;
      };
    }
    const timer = setTimeout(() => {
      listingsService
        .search({
          marketCode: activeMarket.code,
          query,
          scope,
          ...(categoryId ? { categoryId } : {}),
          minPrice: priceRange.minimum,
          maxPrice: priceRange.maximum,
        })
        .then((results) => {
          if (currentRequest === requestId.current) {
            setItems(results.items);
            setResultsMarketCode(activeMarket.code);
            setNextCursor(results.pageInfo.nextCursor);
            setPageError("");
            setDidYouMean(results.didYouMean ?? "");
            setError("");
          }
        })
        .catch((reason) => {
          if (currentRequest === requestId.current) {
            setItems([]);
            setResultsMarketCode(activeMarket.code);
            setDidYouMean("");
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
            setLoadingMore(false);
          }
        });
    }, 250);
    return () => {
      requestId.current += 1;
      clearTimeout(timer);
    };
  }, [
    activeMarket.code,
    categoryId,
    hasPriceError,
    maxPrice,
    minPrice,
    priceRange.maximum,
    priceRange.minimum,
    query,
    requestKey,
    scope,
  ]);

  const loadMore = useCallback(() => {
    if (
      !nextCursor ||
      loading ||
      loadingMore ||
      paginationInFlight.current ||
      hasPriceError
    )
      return;
    paginationInFlight.current = true;
    setLoadingMore(true);
    const currentRequest = requestId.current;
    void listingsService
      .search({
        marketCode: activeMarket.code,
        query,
        scope,
        ...(categoryId ? { categoryId } : {}),
        minPrice: priceRange.minimum,
        maxPrice: priceRange.maximum,
        cursor: nextCursor,
      })
      .then((results) => {
        if (currentRequest !== requestId.current) return;
        setItems((current) => [...current, ...results.items]);
        setNextCursor(results.pageInfo.nextCursor);
        setPageError("");
      })
      .catch((reason) => {
        if (currentRequest === requestId.current)
          setPageError(
            reason instanceof Error ? reason.message : "Chargement impossible.",
          );
      })
      .finally(() => {
        if (currentRequest === requestId.current) {
          paginationInFlight.current = false;
          setLoadingMore(false);
        }
      });
  }, [
    activeMarket.code,
    categoryId,
    hasPriceError,
    loading,
    loadingMore,
    nextCursor,
    priceRange.maximum,
    priceRange.minimum,
    query,
    scope,
  ]);

  // Completions are a courtesy on top of the results: a failed suggestion
  // request leaves the list as it was rather than surfacing an error.
  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      listingsService
        .suggest(normalizedQuery, activeMarket.code, activeMarket.defaultLocale)
        .then((completions) => {
          if (!cancelled) {
            setSuggestions(
              completions.filter(
                (completion) =>
                  completion.query.trim().toLocaleLowerCase() !==
                  normalizedQuery.toLocaleLowerCase(),
              ),
            );
          }
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeMarket.code, activeMarket.defaultLocale, query]);

  const visibleSuggestions = query.trim() ? suggestions : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={visibleItems}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        accessibilityState={{ busy: loading }}
        keyExtractor={(item) => item.id}
        key={`search-results-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ListingCard listing={item} />
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text accessibilityRole="header" style={styles.heading}>
              Rechercher
            </Text>
            {loading && visibleItems.length ? (
              <Text accessibilityLiveRegion="polite" style={styles.notice}>
                Mise à jour des résultats…
              </Text>
            ) : null}
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
            {categoryId ? (
              <View style={styles.categoryChipRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer le filtre ${categoryLabel || "catégorie"}`}
                  onPress={() =>
                    router.setParams({ categoryId: "", categoryLabel: "" })
                  }
                  style={styles.categoryChip}
                >
                  <Text style={styles.categoryChipText}>
                    {categoryLabel || "Catégorie"} ✕
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {visibleSuggestions.length ? (
              <FlatList
                accessibilityLabel="Suggestions de recherche"
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                data={visibleSuggestions}
                keyExtractor={(item) => item.query}
                contentContainerStyle={styles.suggestions}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Rechercher ${item.label}`}
                    onPress={() => {
                      setQuery(item.query);
                      setError("");
                    }}
                    style={styles.suggestion}
                  >
                    <Text style={styles.suggestionText}>{item.label}</Text>
                  </Pressable>
                )}
              />
            ) : null}
            <FlatList
              accessibilityLabel="Type de recherche"
              accessibilityRole="radiogroup"
              horizontal
              showsHorizontalScrollIndicator={false}
              data={
                [
                  ["marketplace", "Tout"],
                  ["auto", "Auto"],
                  ["immo", "Immo"],
                  ["emploi", "Emploi"],
                  ["education", "Formation"],
                ] as [MobileSearchScope, string][]
              }
              keyExtractor={([value]) => value}
              contentContainerStyle={styles.scopes}
              renderItem={({ item: [value, label] }) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: scope === value }}
                  onPress={() => setScope(value)}
                  style={[
                    styles.scope,
                    scope === value ? styles.scopeSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.scopeText,
                      scope === value ? styles.scopeTextSelected : null,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              )}
            />
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <FormField
                  label={`Prix min. (${activeMarket.currency})`}
                  value={minPrice}
                  onChangeText={(value) => {
                    setMinPrice(value);
                    setError("");
                  }}
                  keyboardType="decimal-pad"
                  error={priceRange.minimumError || undefined}
                />
              </View>
              <View style={styles.priceField}>
                <FormField
                  label={`Prix max. (${activeMarket.currency})`}
                  value={maxPrice}
                  onChangeText={(value) => {
                    setMaxPrice(value);
                    setError("");
                  }}
                  keyboardType="decimal-pad"
                  error={priceRange.maximumError || undefined}
                />
              </View>
            </View>
            {user ? (
              <Button
                label={savingAlert ? "Création…" : "Créer une alerte"}
                onPress={() => void saveAlert()}
                disabled={savingAlert || !query.trim()}
                variant="secondary"
              />
            ) : null}
            {alertNotice ? (
              <Text accessibilityLiveRegion="polite" style={styles.notice}>
                {alertNotice}
              </Text>
            ) : null}
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
                (didYouMean
                  ? `Aucune annonce pour « ${query.trim()} ».`
                  : "Essayez un terme plus général ou vérifiez l’orthographe.")
              }
              tone={visibleError ? "error" : "neutral"}
              actionLabel={
                visibleError
                  ? "Réessayer"
                  : didYouMean
                    ? `Essayer « ${didYouMean} »`
                    : undefined
              }
              onAction={
                visibleError
                  ? () => setRetryVersion((version) => version + 1)
                  : didYouMean
                    ? () => {
                        setQuery(didYouMean);
                        setError("");
                      }
                    : undefined
              }
            />
          )
        }
        ListFooterComponent={
          visibleItems.length && (loadingMore || pageError) ? (
            <View style={styles.loadingState} accessibilityLiveRegion="polite">
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : null}
              {pageError ? (
                <Button
                  label="Réessayer de charger la suite"
                  variant="secondary"
                  onPress={loadMore}
                />
              ) : null}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  cell: { flex: 1 },
  row: { gap: spacing.lg },
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
  categoryChipRow: { flexDirection: "row", marginBottom: spacing.md },
  categoryChip: {
    minHeight: nativeSizing.controlTouch,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: nativeRadius.pill,
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    color: colors.onPrimary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  suggestions: { gap: spacing.sm, paddingBottom: spacing.md },
  suggestion: {
    minHeight: nativeSizing.controlTouch,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: nativeRadius.pill,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  suggestionText: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
  },
  scopes: { gap: spacing.sm, paddingVertical: spacing.md },
  scope: {
    minHeight: nativeSizing.controlTouch,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: nativeRadius.pill,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scopeSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scopeText: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  scopeTextSelected: { color: colors.onPrimary },
  priceRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  priceField: { flex: 1 },
  notice: {
    color: colors.primary,
    fontSize: nativeTypography.size.bodySm,
    marginBottom: spacing.md,
  },
});
