import { useCallback, useState } from "react";
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
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [items, setItems] = useState<MobileConversation[]>([]);
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
      setItems(await messagingService.list(user.id, activeMarket.code));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Messagerie indisponible.",
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        accessibilityState={{ busy: loading }}
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
          loading ? (
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
              title={error ? "Messagerie indisponible" : "Aucune conversation"}
              message={
                error ||
                "Contactez un vendeur depuis une annonce pour démarrer une conversation."
              }
              tone={error ? "error" : "neutral"}
              actionLabel={error ? "Réessayer" : undefined}
              onAction={error ? () => void load() : undefined}
            />
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.72 },
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
    minWidth: 22,
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
