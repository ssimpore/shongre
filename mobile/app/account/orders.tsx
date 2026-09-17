import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
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
 * transactions page reads. Rows lead to the listing; payment, handover and
 * disputes stay on the Web until their native flows exist.
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

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [purchases, sales] = await Promise.all([
        ordersService.purchases(),
        ordersService.sales(),
      ]);
      setOrders({ purchases, sales });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Vos commandes sont indisponibles.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = orders[tab];

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: "Mes commandes" }} />
      <FlatList
        data={loading ? [] : visible}
        keyExtractor={(item) => item.id}
        accessibilityState={{ busy: loading }}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.listingTitle}, ${ORDER_STATUS_LABELS[item.status] ?? item.status}`}
            onPress={() => router.push(`/listing/${item.listingId}` as never)}
            style={styles.row}
          >
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
          </Pressable>
        )}
        ListHeaderComponent={
          <>
            <Text accessibilityRole="header" style={styles.heading}>
              Mes commandes
            </Text>
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
                    {label} ({orders[value].length})
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
          ) : loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Chargement…</Text>
            </View>
          ) : (
            <StatePanel
              title={
                error
                  ? "Commandes indisponibles"
                  : tab === "purchases"
                    ? "Aucun achat"
                    : "Aucune vente"
              }
              message={
                error ||
                (tab === "purchases"
                  ? "Vos achats sécurisés apparaîtront ici."
                  : "Vos ventes apparaîtront ici dès la première commande.")
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
    flexDirection: "row",
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
