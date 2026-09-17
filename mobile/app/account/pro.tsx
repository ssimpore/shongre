import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ProBadge } from "@shongre/ui/native";
import { Button } from "@/components/Button";
import { ListingCard } from "@/components/ListingCard";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import { formatMoney } from "@/utils/format";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import {
  workspaceService,
  type MobileProAnalytics,
} from "@/features/workspace/workspace.service";
import { mobileEnvironment } from "@/config/environment";

/**
 * The Pro workspace headline: this month's revenue, the catalogue's audience
 * and the listings that carry it — the figures the Web dashboard leads with.
 * Team seats, invoicing and plan changes stay on the Web.
 */
export default function ProWorkspaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const marketLinks = mobileEnvironment.linksFor(activeMarket);
  const isProfessional = user?.accountType === "professional";
  const [retryVersion, setRetryVersion] = useState(0);
  const requestKey = `${user?.id ?? ""} ${activeMarket.code} ${retryVersion}`;
  // Loading is derived from which request last answered, so the effect only
  // ever sets state from the response callbacks.
  const [result, setResult] = useState<{
    key: string;
    analytics: MobileProAnalytics | null;
    error: boolean;
  }>({ key: "", analytics: null, error: false });

  useEffect(() => {
    if (!user || !isProfessional) return;
    let cancelled = false;
    workspaceService
      .proAnalytics(user.id, activeMarket.code)
      .then((analytics) => {
        if (!cancelled) setResult({ key: requestKey, analytics, error: false });
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: requestKey, analytics: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [activeMarket.code, isProfessional, requestKey, user]);

  const state: "loading" | "error" | "ready" =
    result.key !== requestKey ? "loading" : result.error ? "error" : "ready";
  const analytics = state === "ready" ? result.analytics : null;
  const locale = activeMarket.defaultLocale;

  return (
    <Screen edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Espace Pro" }} />
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.heading}>
          Espace Pro
        </Text>
        <ProBadge
          size="xs"
          label="Pro"
          accessibilityLabel="Espace professionnel"
        />
      </View>
      {!user ? (
        <StatePanel
          title="Connexion requise"
          message="Connectez-vous avec votre compte professionnel."
          actionLabel="Se connecter"
          onAction={() => router.push("/auth/login")}
        />
      ) : !isProfessional ? (
        <>
          <StatePanel
            title="Compte particulier"
            message="Le passage en compte professionnel demande vos identifiants légaux ; il se fait depuis le Web."
          />
          <Button
            label="Passer Pro sur le Web"
            variant="secondary"
            onPress={() => void Linking.openURL(marketLinks.proUpgradeUrl)}
          />
        </>
      ) : state === "loading" ? (
        <Text style={styles.muted} accessibilityLiveRegion="polite">
          Chargement de vos chiffres…
        </Text>
      ) : state === "error" ? (
        <StatePanel
          title="Chiffres indisponibles"
          message="Les statistiques n’ont pas pu être chargées."
          tone="error"
          actionLabel="Réessayer"
          onAction={() => setRetryVersion((version) => version + 1)}
        />
      ) : analytics ? (
        <>
          <View accessibilityRole="summary" style={styles.figures}>
            <View style={styles.figure}>
              <Text style={styles.figureLabel}>Ventes du mois</Text>
              {analytics.revenueByCurrency.length === 0 ? (
                <Text style={styles.figureValue}>
                  {formatMoney(
                    { amountMinor: 0, currency: activeMarket.currency },
                    locale,
                  )}
                </Text>
              ) : (
                analytics.revenueByCurrency.map((money) => (
                  <Text key={money.currency} style={styles.figureValue}>
                    {formatMoney(money, locale)}
                  </Text>
                ))
              )}
            </View>
            <View style={styles.figure}>
              <Text style={styles.figureLabel}>Vues cumulées</Text>
              <Text style={styles.figureValue}>
                {analytics.monthlyViews.toLocaleString(locale)}
              </Text>
            </View>
            <View style={styles.figure}>
              <Text style={styles.figureLabel}>Taux de conversion</Text>
              <Text style={styles.figureValue}>
                {analytics.conversionRate.toLocaleString(locale, {
                  maximumFractionDigits: 1,
                })}{" "}
                %
              </Text>
              <Text style={styles.muted}>
                Ventes terminées ce mois rapportées aux vues du catalogue.
              </Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={styles.section}>
            Annonces les plus vues
          </Text>
          {analytics.topListings.length === 0 ? (
            <Text style={styles.muted}>
              Publiez une annonce pour voir son audience ici.
            </Text>
          ) : (
            <View style={styles.list}>
              {analytics.topListings.slice(0, 6).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </View>
          )}
          <Button
            label="Gérer mon abonnement"
            variant="secondary"
            onPress={() => router.push("/account/billing" as never)}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  figures: { gap: spacing.sm },
  figure: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  figureLabel: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  figureValue: {
    color: colors.text,
    fontSize: nativeTypography.size.headingMd,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  section: {
    color: colors.text,
    fontSize: nativeTypography.size.headingSm,
    fontFamily: nativeTypography.fontFamily.bold,
    marginTop: spacing.sm,
  },
  list: { gap: spacing.md },
});
