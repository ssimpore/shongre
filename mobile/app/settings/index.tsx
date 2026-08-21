import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { mobileEnvironment } from "@/config/environment";
import { notificationsService } from "@/services/notifications/notifications.service";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const enableNotifications = async () => {
    const outcome = await notificationsService.enable();
    const message =
      outcome === "granted"
        ? "Les notifications sont autorisées et cet appareil est associé à votre compte."
        : outcome === "blocked"
          ? "L’autorisation est bloquée. Ouvrez les réglages du téléphone pour la modifier."
          : "Aucune notification ne sera envoyée sans votre accord.";
    Alert.alert("Notifications", message);
  };

  const open = async (url: string) => {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else
      Alert.alert(
        "Lien indisponible",
        "Cette page ne peut pas être ouverte pour le moment.",
      );
  };

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.heading}>
        Réglages
      </Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.muted}>
          L’autorisation est demandée ici, jamais automatiquement pendant
          l’inscription.
        </Text>
        <Button
          label="Configurer les notifications"
          onPress={enableNotifications}
          variant="secondary"
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations et assistance</Text>
        <Button
          label="Confidentialité"
          onPress={() => void open(mobileEnvironment.privacyUrl)}
          variant="ghost"
        />
        <Button
          label="Conditions d’utilisation"
          onPress={() => void open(mobileEnvironment.termsUrl)}
          variant="ghost"
        />
        <Button
          label="Aide et support"
          onPress={() => void open(mobileEnvironment.supportUrl)}
          variant="ghost"
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        {user ? (
          <Button
            label="Supprimer mon compte"
            onPress={() => router.push("/settings/delete-account")}
            variant="danger"
          />
        ) : (
          <Button
            label="Demander une suppression sur le web"
            onPress={() => void open(mobileEnvironment.accountDeletionUrl)}
            variant="secondary"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: nativeTypography.size.bodyLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  muted: {
    color: colors.textMuted,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
});
