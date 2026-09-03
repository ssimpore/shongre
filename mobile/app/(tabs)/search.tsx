import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ListingCardView } from "@shongre/contracts";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-catalog";
import { majorToMinorAmount } from "@shongre/shared/money";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";
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
  type MobileSearchScope,
} from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { watchSubscriptionsService } from "@/features/watch-subscriptions/watch-subscriptions.service";

export default function SearchScreen() {
  const { activeMarket } = useMarket();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<MobileSearchScope>("marketplace");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [alertNotice, setAlertNotice] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);
  const [items, setItems] = useState<ListingCardView[]>([]);
  const [error, setError] = useState("");
  const [completedRequestKey, setCompletedRequestKey] = useState("");
  const requestId = useRef(0);
  const requestKey = `${activeMarket.code}\u0000${scope}\u0000${query}\u0000${minPrice}\u0000${maxPrice}`;
  const loading = completedRequestKey !== requestKey;
  const visibleItems = loading ? [] : items;
  const visibleError = loading ? "" : error;

  const saveAlert = async () => {
    const normalizedQuery = query.trim();
    if (!user || !normalizedQuery) return;
    setSavingAlert(true);
    setAlertNotice("");
    try {
      const minimum = minPrice ? Number(minPrice.replace(",", ".")) : undefined;
      const maximum = maxPrice ? Number(maxPrice.replace(",", ".")) : undefined;
      if (
        (minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0)) ||
        (maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0)) ||
        (minimum !== undefined && maximum !== undefined && minimum > maximum)
      ) {
        throw new Error("Vérifiez les prix minimum et maximum.");
      }
      const minPriceMinor = minPrice
        ? majorToMinorAmount(minimum!, activeMarket.currency)
        : undefined;
      const maxPriceMinor = maxPrice
        ? majorToMinorAmount(maximum!, activeMarket.currency)
        : undefined;
      const categoryId = {
        marketplace: undefined,
        auto: CANONICAL_TAXONOMY_IDS.vehicles,
        immo: CANONICAL_TAXONOMY_IDS.realEstate,
        emploi: CANONICAL_TAXONOMY_IDS.jobs,
        education: CANONICAL_TAXONOMY_IDS.courses,
      }[scope];
      await watchSubscriptionsService.createOrReplace(user.id, {
        marketCode: activeMarket.code,
        targetType: "saved_search",
        targetId: `mobile-${scope}-${normalizedQuery
          .toLocaleLowerCase(activeMarket.defaultLocale)
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 80)}`,
        title: normalizedQuery,
        frequency: "daily",
        channels: { inApp: true, email: false, push: true },
        searchFilter: {
          query: normalizedQuery,
          ...(categoryId ? { categoryId } : {}),
          ...(minPriceMinor !== undefined ? { minPriceMinor } : {}),
          ...(maxPriceMinor !== undefined ? { maxPriceMinor } : {}),
        },
      });
      setAlertNotice("Alerte quotidienne créée pour cette recherche.");
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
    const timer = setTimeout(() => {
      listingsService
        .list(activeMarket.code, query, scope)
        .then((results) => {
          if (currentRequest === requestId.current) {
            const minimum = minPrice
              ? Number(minPrice.replace(",", ".")) * 100
              : 0;
            const maximum = maxPrice
              ? Number(maxPrice.replace(",", ".")) * 100
              : Number.POSITIVE_INFINITY;
            setItems(
              results.filter(
                (item) =>
                  item.price.amountMinor >= minimum &&
                  item.price.amountMinor <= maximum,
              ),
            );
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
  }, [activeMarket.code, maxPrice, minPrice, query, requestKey, scope]);

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
            <FlatList
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: scope === value }}
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
                  onChangeText={setMinPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.priceField}>
                <FormField
                  label={`Prix max. (${activeMarket.currency})`}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="decimal-pad"
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
