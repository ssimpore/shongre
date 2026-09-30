import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
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
  nativeBorders,
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
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [items, setItems] = useState<WatchSubscription[]>([]);
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
    setItems([]);
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
      const next = await watchSubscriptionsService.list(
        user.id,
        activeMarket.code,
      );
      if (!current()) return;
      setItems(next);
      setResultScope(requestScope);
    } catch (reason) {
      if (!current()) return;
      setResultScope(requestScope);
      setError(
        reason instanceof Error ? reason.message : "Alertes indisponibles.",
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

  const mutationInFlight = useRef(false);
  const [mutating, setMutating] = useState(false);

  const update = async (
    item: WatchSubscription,
    input: {
      frequency?: WatchFrequency;
      channels?: WatchChannels;
      status?: "active" | "paused";
    },
  ) => {
    if (!user || !ownsResult || mutationInFlight.current) return;
    const requestScope = scopeKey;
    const request = generation.current;
    const current = () =>
      request === generation.current && requestScope === currentScope.current;
    mutationInFlight.current = true;
    setMutating(true);
    setError("");
    try {
      const next = await watchSubscriptionsService.update(
        user.id,
        activeMarket.code,
        item.id,
        input,
      );
      if (!current()) return;
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? next : entry)),
      );
    } catch (reason) {
      if (!current()) return;
      setError(
        reason instanceof Error ? reason.message : "Mise à jour impossible.",
      );
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
    }
  };

  const remove = async (item: WatchSubscription) => {
    if (!user || !ownsResult || mutationInFlight.current) return;
    const requestScope = scopeKey;
    const request = generation.current;
    mutationInFlight.current = true;
    setMutating(true);
    setError("");
    try {
      await watchSubscriptionsService.remove(
        user.id,
        activeMarket.code,
        item.id,
      );
      if (
        requestScope !== currentScope.current ||
        request !== generation.current
      )
        return;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (reason) {
      if (
        requestScope !== currentScope.current ||
        request !== generation.current
      )
        return;
      setError(
        reason instanceof Error ? reason.message : "Suppression impossible.",
      );
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
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
        data={ownsResult && !busy ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        accessibilityState={{ busy }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.heading}>
              Mes alertes
            </Text>
            <Text style={styles.muted}>
              Réglages pour {activeMarket.name}. Chaque alerte reste liée à ce
              marché.
            </Text>
            {visibleError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {visibleError}
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
                disabled={mutating}
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
                disabled={mutating}
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
                  disabled={mutating}
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
              disabled={mutating}
              onPress={() => void remove(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          !user ? (
            <StatePanel
              title="Connexion requise"
              message="Connectez-vous pour gérer vos alertes."
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
              title={visibleError ? "Alertes indisponibles" : "Aucune alerte"}
              message={
                visibleError ||
                "Créez une alerte depuis une recherche ou une annonce."
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
    borderWidth: nativeBorders.hairline,
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
