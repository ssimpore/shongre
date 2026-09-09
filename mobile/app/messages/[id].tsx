import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import {
  messagingService,
  type MobileMessage,
} from "@/features/messaging/messaging.service";
import { formatMoney } from "@/utils/format";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { majorToMinorAmount } from "@shongre/shared/money";

export default function MessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [messages, setMessages] = useState<MobileMessage[]>([]);
  const [text, setText] = useState("");
  const [offer, setOffer] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError("");
    try {
      const result = await messagingService.messages(
        id,
        user.id,
        activeMarket.code,
      );
      setMessages(result);
      await messagingService.markRead(id, user.id, activeMarket.code);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Conversation indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, id, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const send = async () => {
    if (!user || !id || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      const message = await messagingService.send({
        conversationId: id,
        senderId: user.id,
        marketCode: activeMarket.code,
        text,
      });
      setMessages((current) => [...current, message]);
      setText("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  const submitOffer = async (amountMinor: number) => {
    if (!user || !id) return;
    setSending(true);
    setError("");
    try {
      const message = await messagingService.offer({
        conversationId: id,
        senderId: user.id,
        marketCode: activeMarket.code,
        amountMinor,
      });
      setMessages((current) => [...current, message]);
      setOffer("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Offre impossible.");
    } finally {
      setSending(false);
    }
  };

  const confirmOffer = () => {
    if (!user || !id) return;
    const amount = Number(offer.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }
    const amountMinor = majorToMinorAmount(amount, activeMarket.currency);
    setError("");
    Alert.alert(
      "Envoyer cette offre ?",
      `Vous proposez ${formatMoney({ amountMinor, currency: activeMarket.currency })}. Le vendeur recevra immédiatement cette offre.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Envoyer l’offre",
          onPress: () => void submitOffer(amountMinor),
        },
      ],
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatePanel
          title="Connexion requise"
          message="Connectez-vous pour accéder à cette conversation."
          actionLabel="Se connecter"
          onAction={() => router.replace("/auth/login")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Conversation" }} />
      {/*
       * The composer is pinned below the transcript, which is exactly where the
       * iOS keyboard opens. Without this the field a person is typing into is
       * covered by the keyboard they are typing on. No vertical offset: the
       * native stack header sits above this view, so its own frame already
       * starts below it. Android resizes the window itself.
       */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          accessibilityState={{ busy: loading }}
          renderItem={({ item }) => {
            const mine = item.senderId === user.id;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={mine ? styles.mineText : styles.theirText}>
                  {item.text}
                </Text>
                {item.offer ? (
                  <Text style={mine ? styles.mineOffer : styles.theirOffer}>
                    {formatMoney({
                      amountMinor: item.offer.amountMinor,
                      currency: item.offer.currency,
                    })}{" "}
                    · {item.offer.status}
                  </Text>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loading} accessibilityLiveRegion="polite">
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.muted}>Chargement des messages…</Text>
              </View>
            ) : error ? (
              <StatePanel
                title="Conversation indisponible"
                message={error}
                tone="error"
                actionLabel="Réessayer"
                onAction={() => void load()}
              />
            ) : (
              <StatePanel
                title="Démarrez la conversation"
                message="Posez une question sur l’annonce sans partager d’informations sensibles."
              />
            )
          }
        />
        <View style={styles.composer}>
          {error && messages.length > 0 ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <FormField
            label="Message"
            value={text}
            onChangeText={setText}
            placeholder="Votre message…"
            multiline
          />
          <Button
            label={sending ? "Envoi…" : "Envoyer"}
            onPress={() => void send()}
            disabled={sending || !text.trim()}
          />
          <View style={styles.offerRow}>
            <View style={styles.offerField}>
              <FormField
                label={`Offre (${activeMarket.currency})`}
                value={offer}
                onChangeText={setOffer}
                placeholder="Ex. 1200"
                keyboardType="decimal-pad"
              />
            </View>
            <Button
              label="Envoyer l’offre"
              onPress={confirmOffer}
              disabled={sending || !offer.trim()}
              variant="secondary"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  messages: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  loading: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  muted: { color: colors.textMuted, fontSize: nativeTypography.size.bodySm },
  bubble: {
    maxWidth: nativeSizing.messageBubbleMax,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
  },
  mineText: {
    color: colors.onPrimary,
    lineHeight: nativeTypography.lineHeight.body,
  },
  theirText: {
    color: colors.text,
    lineHeight: nativeTypography.lineHeight.body,
  },
  mineOffer: {
    color: colors.onPrimary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  theirOffer: {
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  composer: {
    padding: spacing.lg,
    borderTopWidth: nativeBorders.hairline,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  offerRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  offerField: { flex: 1 },
  error: { color: colors.danger, fontSize: nativeTypography.size.bodySm },
});
