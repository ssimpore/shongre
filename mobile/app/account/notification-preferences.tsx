import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Button } from "@/components/Button";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  notificationsService,
  type MobileNotificationPreferences,
  type NotificationPreferenceCategory,
} from "@/services/notifications/notifications.service";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

const categoryLabels: Record<NotificationPreferenceCategory, string> = {
  messages: "Messages et offres",
  transactions: "Transactions et paiements",
  listings: "Annonces et alertes",
  delivery: "Livraison",
  reviews: "Avis",
  promotions: "Mises en avant",
  security: "Sécurité",
  marketing: "Actualités et offres",
};
const categories = Object.keys(
  categoryLabels,
) as NotificationPreferenceCategory[];

export default function MobileNotificationPreferencesScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] =
    useState<MobileNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setPreferences(await notificationsService.getPreferences(user.id));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Préférences indisponibles.",
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

  const toggle = (
    category: NotificationPreferenceCategory,
    channel: "inApp" | "email" | "push",
  ) => {
    if (!preferences) return;
    const current = preferences[category];
    if (current.isMandatory && channel !== "push") return;
    setPreferences({
      ...preferences,
      [category]: { ...current, [channel]: !current[channel] },
    });
  };

  const save = async () => {
    if (!user || !preferences) return;
    setSaving(true);
    setError("");
    try {
      setPreferences(
        await notificationsService.updatePreferences(user.id, preferences),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  if (!preferences)
    return (
      <StatePanel
        title="Préférences indisponibles"
        message={error || "Connectez-vous pour les gérer."}
        tone="error"
        actionLabel={user ? "Réessayer" : undefined}
        onAction={user ? () => void load() : undefined}
      />
    );

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Notifications" }} />
      <Text accessibilityRole="header" style={styles.heading}>
        Préférences de notification
      </Text>
      <Text style={styles.muted}>
        Choisissez un canal par catégorie. Les alertes essentielles restent
        actives.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {categories.map((category) => {
        const current = preferences[category];
        return (
          <View key={category} style={styles.card}>
            <Text style={styles.title}>
              {categoryLabels[category]}
              {current.isMandatory ? " · Obligatoire" : ""}
            </Text>
            {(["inApp", "email", "push"] as const).map((channel) => (
              <View key={channel} style={styles.row}>
                <Text style={styles.label}>
                  {channel === "inApp"
                    ? "Application"
                    : channel === "email"
                      ? "Email"
                      : "Push"}
                </Text>
                <Switch
                  accessibilityLabel={`${categoryLabels[category]} — ${channel}`}
                  value={current[channel]}
                  disabled={current.isMandatory && channel !== "push"}
                  onValueChange={() => toggle(category, channel)}
                />
              </View>
            ))}
          </View>
        );
      })}
      <Button
        label={saving ? "Enregistrement…" : "Enregistrer"}
        onPress={() => void save()}
        disabled={saving}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  muted: {
    color: colors.textMuted,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  error: { color: colors.danger },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontFamily: nativeTypography.fontFamily.bold },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { color: colors.text },
});
