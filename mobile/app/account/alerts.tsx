import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import type {
  WatchChannels,
  WatchFrequency,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import { Button } from "@/components/Button";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import { watchSubscriptionsService } from "@/features/watch-subscriptions/watch-subscriptions.service";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

const frequencies: WatchFrequency[] = ["immediate", "daily", "weekly"];
const frequencyLabel: Record<WatchFrequency, string> = {
  immediate: "Immédiate",
  daily: "Quotidienne",
  weekly: "Hebdomadaire",
};
const typeLabel = {
  listing_price: "Baisse de prix",
  seller: "Nouvelles annonces du vendeur",
  saved_search: "Nouveaux résultats",
} as const;

export default function MobileAlertsScreen() {
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [items, setItems] = useState<WatchSubscription[]>([]);
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
      setItems(
        await watchSubscriptionsService.list(user.id, activeMarket.code),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Alertes indisponibles.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const update = async (
    item: WatchSubscription,
    input: {
      frequency?: WatchFrequency;
      channels?: WatchChannels;
      status?: "active" | "paused";
    },
  ) => {
    if (!user) return;
    try {
      const next = await watchSubscriptionsService.update(
        user.id,
        activeMarket.code,
        item.id,
        input,
      );
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? next : entry)),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Mise à jour impossible.",
      );
    }
  };

  const toggleChannel = (
    item: WatchSubscription,
    channel: keyof WatchChannels,
    enabled: boolean,
  ) => {
    const channels = { ...item.channels, [channel]: enabled };
    if (!Object.values(channels).some(Boolean)) {
      setError("Conservez au moins un canal actif.");
      return;
    }
    void update(item, { channels });
  };

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: "Mes alertes" }} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        accessibilityState={{ busy: loading }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.heading}>
              Mes alertes
            </Text>
            <Text style={styles.muted}>
              Réglages pour {activeMarket.name}. Chaque alerte reste liée à ce
              marché.
            </Text>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>{typeLabel[item.targetType]}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.muted}>
              Fréquence : {frequencyLabel[item.frequency]}
            </Text>
            <View style={styles.actions}>
              <Button
                label="Changer la fréquence"
                size="sm"
                variant="secondary"
                onPress={() =>
                  void update(item, {
                    frequency:
                      frequencies[
                        (frequencies.indexOf(item.frequency) + 1) %
                          frequencies.length
                      ],
                  })
                }
              />
              <Button
                label={item.status === "active" ? "Suspendre" : "Réactiver"}
                size="sm"
                variant="ghost"
                onPress={() =>
                  void update(item, {
                    status: item.status === "active" ? "paused" : "active",
                  })
                }
              />
            </View>
            {(["inApp", "email", "push"] as const).map((channel) => (
              <View key={channel} style={styles.switchRow}>
                <Text style={styles.channel}>
                  {channel === "inApp"
                    ? "Dans l’application"
                    : channel === "email"
                      ? "Email"
                      : "Notification push"}
                </Text>
                <Switch
                  value={item.channels[channel]}
                  onValueChange={(value) => toggleChannel(item, channel, value)}
                  accessibilityLabel={`Canal ${channel}`}
                />
              </View>
            ))}
            <Button
              label="Supprimer l’alerte"
              size="sm"
              variant="danger"
              onPress={() =>
                user &&
                void watchSubscriptionsService
                  .remove(user.id, activeMarket.code, item.id)
                  .then(() =>
                    setItems((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    ),
                  )
                  .catch((reason) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Suppression impossible.",
                    ),
                  )
              }
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Chargement…</Text>
            </View>
          ) : (
            <StatePanel
              title={error ? "Alertes indisponibles" : "Aucune alerte"}
              message={
                error || "Créez une alerte depuis une recherche ou une annonce."
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
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: { gap: spacing.xs },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  muted: { color: colors.textMuted, fontSize: nativeTypography.size.bodySm },
  error: { color: colors.danger },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  type: {
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.caption,
  },
  title: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.bodyLg,
  },
  actions: { gap: spacing.sm },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  channel: { flex: 1, color: colors.text },
  loading: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
});
