import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type {
  BillingOverview,
  MonetizationCatalog,
} from "@shongre/contracts/monetization";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import { mobileBillingService } from "@/features/billing/billing.service";
import { useMarket } from "@/features/market/MarketProvider";

export default function BillingScreen() {
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const userId = user?.id;
  const requestKey = `${userId || "anonymous"}:${activeMarket.code}`;
  const [result, setResult] = useState<{
    requestKey: string;
    catalog: MonetizationCatalog | null;
    overview: BillingOverview | null;
    error: string;
  }>({ requestKey: "", catalog: null, overview: null, error: "" });

  useEffect(() => {
    let active = true;
    if (!userId) return;
    void Promise.all([
      mobileBillingService.getCatalog(activeMarket.code),
      mobileBillingService.getOverview(userId, activeMarket.code),
    ])
      .then(([nextCatalog, nextOverview]) => {
        if (active)
          setResult({
            requestKey,
            catalog: nextCatalog,
            overview: nextOverview,
            error: "",
          });
      })
      .catch((cause) => {
        if (active)
          setResult({
            requestKey,
            catalog: null,
            overview: null,
            error:
              cause instanceof Error
                ? cause.message
                : "La facturation est indisponible.",
          });
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, requestKey, userId]);

  const loading = Boolean(userId) && result.requestKey !== requestKey;
  const catalog = result.requestKey === requestKey ? result.catalog : null;
  const overview = result.requestKey === requestKey ? result.overview : null;
  const error = result.requestKey === requestKey ? result.error : "";

  const subscription = overview?.currentSubscription;
  const product = useMemo(
    () =>
      catalog?.products.find(
        (candidate) => candidate.id === subscription?.productId,
      ),
    [catalog, subscription?.productId],
  );
  const formatMoney = (amountMinor: number, currency: string) =>
    new Intl.NumberFormat(activeMarket.defaultLocale, {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(activeMarket.defaultLocale, {
      dateStyle: "long",
    }).format(new Date(value));

  return (
    <Screen>
      <View>
        <Text accessibilityRole="header" style={styles.heading}>
          Abonnement et facturation
        </Text>
        <Text style={styles.muted}>
          Consultation sécurisée de votre forfait, de vos quotas et de vos
          factures.
        </Text>
      </View>
      {loading ? (
        <View accessibilityRole="progressbar" style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Chargement de la facturation…</Text>
        </View>
      ) : error ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.cardTitle}>Facturation indisponible</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : !subscription ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aucun abonnement professionnel</Text>
          <Text style={styles.muted}>
            Les offres du marché actif sont consultables, mais aucun achat de
            fonctionnalité numérique n’est proposé dans l’application mobile.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>FORFAIT ACTUEL · DÉMONSTRATION</Text>
            <Text style={styles.cardTitle}>
              {product?.name || subscription.productId}
            </Text>
            <Text style={styles.status}>{subscription.status}</Text>
            <Text style={styles.muted}>
              Renouvellement le {formatDate(subscription.currentPeriodEnd)}
            </Text>
            {subscription.scheduledChangeAt ? (
              <Text style={styles.notice}>
                Changement programmé le{" "}
                {formatDate(subscription.scheduledChangeAt)}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fonctionnalités effectives</Text>
            {overview?.effectiveEntitlements.slice(0, 8).map((entry) => (
              <View
                key={`${entry.verticalId || "general"}:${entry.key}`}
                style={styles.row}
              >
                <Text style={styles.rowLabel}>{entry.label}</Text>
                <Text style={styles.rowValue}>{String(entry.value)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Usage et quotas</Text>
            {overview?.usage.slice(0, 6).map((usage) => (
              <View
                key={`${usage.verticalId || "general"}:${usage.key}`}
                style={styles.row}
              >
                <Text style={styles.rowLabel}>{usage.label}</Text>
                <Text style={styles.rowValue}>
                  {usage.used} / {usage.limit ?? "∞"}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Factures récentes</Text>
            {overview?.invoices.map((invoice) => (
              <View key={invoice.id} style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>{invoice.number}</Text>
                  <Text style={styles.muted}>
                    {formatDate(invoice.issuedAt)}
                  </Text>
                </View>
                <Text style={styles.rowValue}>
                  {formatMoney(
                    invoice.total.amountMinor,
                    invoice.total.currency,
                  )}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.policyCard}>
            <Text style={styles.cardTitle}>Gestion du forfait sur mobile</Text>
            <Text style={styles.muted}>
              Les achats, changements, restaurations et annulations de produits
              numériques restent désactivés jusqu’à validation du parcours de
              facturation Apple et Google. Aucun lien de paiement externe n’est
              présenté.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  muted: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  centered: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  policyCard: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: nativeTypography.size.caption,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  cardTitle: {
    color: colors.text,
    fontSize: nativeTypography.size.headingSm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  status: {
    alignSelf: "flex-start",
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  notice: {
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.medium,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.medium,
  },
  rowValue: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
  },
});
