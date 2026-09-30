import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { mobileEnvironment } from "@/config/environment";
import { StatePanel } from "@/components/StatePanel";
import { formatMoney } from "@/utils/format";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import {
  ORDER_STATUS_LABELS,
  ordersService,
  type MobileOrderSummary,
} from "@/features/orders/orders.service";

type Tab = "purchases" | "sales";

/**
 * Purchases and sales, from the same participant projections the Web
 * transactions page reads. Each row links to the Web order workflow and
 * offers the listing separately.
 */
export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [tab, setTab] = useState<Tab>("purchases");
  const [orders, setOrders] = useState<Record<Tab, MobileOrderSummary[]>>({
    purchases: [],
    sales: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scopeKey = `${user?.id ?? "anonymous"}:${activeMarket.code}`;
  const currentScope = useRef(scopeKey);
  const generation = useRef(0);
  useLayoutEffect(() => {
    currentScope.current = scopeKey;
    generation.current += 1;
  }, [scopeKey]);
  const [resultScope, setResultScope] = useState("");
  const ownsResult = Boolean(user) && resultScope === scopeKey;
  const busy = Boolean(user) && (!ownsResult || loading);
  const visibleError = ownsResult ? error : "";

  const load = useCallback(async () => {
    const request = ++generation.current;
    const requestScope = scopeKey;
    const current = () =>
      request === generation.current && requestScope === currentScope.current;
    setOrders({ purchases: [], sales: [] });
    setResultScope("");
    setError("");
    if (!user) {
      setLoading(false);
      setResultScope(requestScope);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [purchases, sales] = await Promise.all([
        ordersService.purchases(activeMarket.code),
        ordersService.sales(activeMarket.code),
      ]);
      if (!current()) return;
      setOrders({ purchases, sales });
      setResultScope(requestScope);
    } catch (reason) {
      if (!current()) return;
      setResultScope(requestScope);
      setError(
        reason instanceof Error
          ? reason.message
          : "Vos commandes sont indisponibles.",
      );
    } finally {
      if (current()) setLoading(false);
    }
  }, [activeMarket.code, scopeKey, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current += 1;
      };
    }, [load]),
  );

  const visible = ownsResult ? orders[tab] : [];

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: "Mes commandes" }} />
      <FlatList
        data={busy ? [] : visible}
        keyExtractor={(item) => item.id}
        accessibilityState={{ busy }}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.title} numberOfLines={2}>
                {item.listingTitle}
              </Text>
              <Text style={styles.muted}>
                {item.role === "buyer" ? "Vendu par" : "Acheté par"}{" "}
                {item.counterpartName} · {item.orderNumber}
              </Text>
              <Text style={styles.muted}>
                {new Date(item.createdAt).toLocaleDateString(
                  activeMarket.defaultLocale,
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </Text>
            </View>
            <View style={styles.rowAside}>
              <Text style={styles.amount}>
                {formatMoney(
                  { amountMinor: item.totalMinor, currency: item.currency },
                  activeMarket.defaultLocale,
                )}
              </Text>
              <Text style={styles.status}>
                {ORDER_STATUS_LABELS[item.status] ?? item.status}
              </Text>
              {item.status === "completed" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Laisser un avis sur ${item.listingTitle}`}
                  onPress={() =>
                    router.push(`/orders/${item.id}/review` as never)
                  }
                  style={styles.reviewLink}
                >
                  <Text style={styles.reviewLinkText}>Laisser un avis</Text>
                </Pressable>
              ) : null}
            </View>
            <Button
              label="Gérer cette commande sur le Web"
              accessibilityRole="link"
              accessibilityHint="Ouvre votre dossier dans le navigateur. Une connexion peut être demandée."
              onPress={() => {
                const request = generation.current;
                const url = new URL(
                  mobileEnvironment.marketWebUrl(
                    activeMarket,
                    "/compte/achats",
                  ),
                );
                url.searchParams.set("transactionId", item.id);
                void Linking.openURL(url.toString()).catch(() => {
                  if (
                    request === generation.current &&
                    scopeKey === currentScope.current
                  )
                    setError("Impossible d’ouvrir la commande. Réessayez.");
                });
              }}
            />
            <Button
              label="Voir l’annonce"
              variant="ghost"
              onPress={() => router.push(`/listing/${item.listingId}` as never)}
            />
          </View>
        )}
        ListHeaderComponent={
          <>
            <Text accessibilityRole="header" style={styles.heading}>
              Mes commandes
            </Text>
            {visibleError && visible.length ? (
              <Text accessibilityRole="alert" style={styles.muted}>
                {visibleError}
              </Text>
            ) : null}
            <View accessibilityRole="tablist" style={styles.tabs}>
              {(
                [
                  ["purchases", "Achats"],
                  ["sales", "Ventes"],
                ] as [Tab, string][]
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === value }}
                  onPress={() => setTab(value)}
                  style={[
                    styles.tab,
                    tab === value ? styles.tabSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      tab === value ? styles.tabTextSelected : null,
                    ]}
                  >
                    {label} ({ownsResult ? orders[value].length : 0})
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          !user ? (
            <StatePanel
              title="Connexion requise"
              message="Connectez-vous pour retrouver vos achats et vos ventes."
              actionLabel="Se connecter"
              onAction={() => router.push("/auth/login")}
            />
          ) : busy ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Chargement…</Text>
            </View>
          ) : (
            <StatePanel
              title={
                visibleError
                  ? "Commandes indisponibles"
                  : tab === "purchases"
                    ? "Aucun achat"
                    : "Aucune vente"
              }
              message={
                visibleError ||
                (tab === "purchases"
                  ? "Vos achats sécurisés apparaîtront ici."
                  : "Vos ventes apparaîtront ici dès la première commande.")
              }
              tone={visibleError ? "error" : "neutral"}
              actionLabel={visibleError ? "Réessayer" : undefined}
              onAction={visibleError ? () => void load() : undefined}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
    marginBottom: spacing.md,
  },
  tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    minHeight: nativeSizing.controlTouch,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontFamily: nativeTypography.fontFamily.bold },
  tabTextSelected: { color: colors.onPrimary },
  row: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowBody: { flex: 1, gap: spacing.xs },
  rowAside: { alignItems: "flex-end", gap: spacing.xs },
  title: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.body,
    lineHeight: nativeTypography.lineHeight.body,
  },
  amount: {
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.body,
  },
  reviewLink: {
    minHeight: nativeSizing.controlTouch,
    justifyContent: "center",
  },
  reviewLinkText: {
    color: colors.primary,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  status: {
    color: colors.textMuted,
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
