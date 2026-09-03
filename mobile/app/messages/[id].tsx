import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

  const sendOffer = async () => {
    if (!user || !id) return;
    const amount = Number(offer.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }
    const amountMinor = majorToMinorAmount(amount, activeMarket.currency);
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
            label="Proposer"
            onPress={() => void sendOffer()}
            disabled={sending || !offer.trim()}
            variant="secondary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  messages: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  loading: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  muted: { color: colors.textMuted, fontSize: nativeTypography.size.bodySm },
  bubble: {
    maxWidth: "84%",
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  offerRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  offerField: { flex: 1 },
  error: { color: colors.danger, fontSize: nativeTypography.size.bodySm },
});
