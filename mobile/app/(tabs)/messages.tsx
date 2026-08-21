import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  if (!user) {
    return (
      <Screen>
        <Text accessibilityRole="header" style={styles.heading}>
          Messages
        </Text>
        <StatePanel
          title="Connectez-vous pour échanger"
          message="Vos conversations restent liées à votre compte et protégées par les règles de blocage."
          actionLabel="Se connecter"
          onAction={() => router.push("/auth/login")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.heading}>
        Messages
      </Text>
      <View style={styles.conversation}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>CM</Text>
        </View>
        <View style={styles.conversationBody}>
          <Text style={styles.name}>Camille Martin</Text>
          <Text numberOfLines={2} style={styles.message}>
            Bonjour, le vélo est toujours disponible. Souhaitez-vous venir
            l’essayer ?
          </Text>
          <Text style={styles.time}>Aujourd’hui · 10:42</Text>
        </View>
      </View>
      <Text style={styles.safety}>
        Ne partagez jamais vos coordonnées bancaires dans la messagerie.
        Signalez ou bloquez un utilisateur depuis l’annonce concernée.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  conversation: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  name: {
    color: colors.text,
    fontSize: nativeTypography.size.body,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  message: {
    color: colors.textMuted,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  time: { color: colors.textMuted, fontSize: nativeTypography.size.caption },
  safety: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.caption,
    lineHeight: nativeTypography.lineHeight.caption,
  },
});
