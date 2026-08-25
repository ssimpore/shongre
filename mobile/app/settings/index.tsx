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
import { useMarket } from "@/features/market/MarketProvider";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket, countries, isSelectable, selectMarket } = useMarket();
  const marketLinks = mobileEnvironment.linksFor(activeMarket);

  const changeMarket = async (code: string) => {
    try {
      await selectMarket(code);
    } catch (reason) {
      Alert.alert(
        "Marché indisponible",
        reason instanceof Error
          ? reason.message
          : "Ce pays n’est pas encore accessible.",
      );
    }
  };

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
        <Text style={styles.sectionTitle}>Pays et marché</Text>
        <Text style={styles.muted}>
          Marché actuel : {activeMarket.flag} {activeMarket.name} ·{" "}
          {activeMarket.currency} · {activeMarket.timezone}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.marketList}>
          {countries.map((country) => {
            const available = isSelectable(country);
            const selected = country.code === activeMarket.code;
            return (
              <Button
                key={country.code}
                label={`${country.flag} ${country.name}${available ? "" : " · À venir"}`}
                accessibilityLabel={`${country.name}${selected ? ", marché sélectionné" : ""}${available ? "" : ", ouverture prochaine"}`}
                onPress={() => void changeMarket(country.code)}
                variant={selected ? "primary" : "secondary"}
                disabled={!available}
              />
            );
          })}
        </View>
      </View>
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
          onPress={() => void open(marketLinks.privacyUrl)}
          variant="ghost"
        />
        <Button
          label="Conditions d’utilisation"
          onPress={() => void open(marketLinks.termsUrl)}
          variant="ghost"
        />
        <Button
          label="Aide et support"
          onPress={() => void open(marketLinks.supportUrl)}
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
            onPress={() => void open(marketLinks.accountDeletionUrl)}
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
  marketList: { gap: spacing.sm },
});
