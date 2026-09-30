import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import {
  messagingService,
  type MobileConversation,
} from "@/features/messaging/messaging.service";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeOpacity,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useConversationPresence } from "@/features/messaging/useConversationPresence";
import { PresenceStatus } from "@/features/messaging/PresenceStatus";

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [items, setItems] = useState<MobileConversation[]>([]);
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

  const presence = useConversationPresence(
    ownsResult ? items.map((item) => item.id) : [],
    activeMarket.code,
  );

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
      const next = await messagingService.list(user.id, activeMarket.code);
      if (!current()) return;
      setItems(next);
      setResultScope(requestScope);
    } catch (reason) {
      if (!current()) return;
      setResultScope(requestScope);
      setItems([]);
      setError(
        reason instanceof Error ? reason.message : "Messagerie indisponible.",
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={ownsResult && !busy ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        accessibilityState={{ busy }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.heading}>
              Messages
            </Text>
            <Text style={styles.muted}>
              Conversations du marché {activeMarket.name}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Conversation avec ${item.participantName} au sujet de ${item.listingTitle}`}
            onPress={() => router.push(`/messages/${item.id}` as never)}
            style={({ pressed }) => [
              styles.conversation,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.participantName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </Text>
            </View>
            <View style={styles.conversationBody}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.name}>
                  {item.participantName}
                </Text>
                {item.unreadCount > 0 ? (
                  <Text
                    accessibilityLabel={`${item.unreadCount} message non lu`}
                    style={styles.badge}
                  >
                    {item.unreadCount}
                  </Text>
                ) : null}
              </View>
              <PresenceStatus presence={presence[item.id]} />
              <Text numberOfLines={1} style={styles.listingTitle}>
                {item.listingTitle}
              </Text>
              <Text numberOfLines={2} style={styles.message}>
                {item.lastMessageText}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          busy ? (
            <View style={styles.loading} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Chargement des conversations…</Text>
            </View>
          ) : !user ? (
            <StatePanel
              title="Connectez-vous pour échanger"
              message="Vos conversations restent liées à votre compte et protégées par les règles de blocage."
              actionLabel="Se connecter"
              onAction={() => router.push("/auth/login")}
            />
          ) : (
            <StatePanel
              title={
                visibleError ? "Messagerie indisponible" : "Aucune conversation"
              }
              message={
                visibleError ||
                "Contactez un vendeur depuis une annonce pour démarrer une conversation."
              }
              tone={visibleError ? "error" : "neutral"}
              actionLabel={visibleError ? "Réessayer" : undefined}
              onAction={visibleError ? () => void load() : undefined}
            />
          )
        }
        ListFooterComponent={
          ownsResult && items.length > 0 ? (
            <Text style={styles.safety}>
              Ne partagez jamais vos coordonnées bancaires dans la messagerie.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  muted: { color: colors.textMuted, fontSize: nativeTypography.size.bodySm },
  conversation: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
  },
  pressed: { opacity: nativeOpacity.pressed },
  avatar: {
    width: nativeSizing.controlLg,
    height: nativeSizing.controlLg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.onPrimary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  conversationBody: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: nativeTypography.size.body,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  badge: {
    minWidth: nativeSizing.iconNav,
    textAlign: "center",
    color: colors.onPrimary,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    overflow: "hidden",
    fontFamily: nativeTypography.fontFamily.bold,
  },
  listingTitle: {
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.caption,
  },
  message: {
    color: colors.textMuted,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  loading: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  safety: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: nativeTypography.size.caption,
    lineHeight: nativeTypography.lineHeight.caption,
  },
});
