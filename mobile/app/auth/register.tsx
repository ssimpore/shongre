import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AUTH_CONSTRAINTS, loginRequestSchema } from "@shongre/contracts";
import { Button } from "@/components/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import { mobileEnvironment } from "@/config/environment";

/**
 * Individual sign-up. The account is created in the active market with the
 * same request the Web form sends; the session is stored in the keychain
 * like a sign-in. Professionals need legal identifiers the phone has no
 * business collecting, so that path stays on the Web.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { activeMarket } = useMarket();
  const marketLinks = mobileEnvironment.linksFor(activeMarket);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const credentials = loginRequestSchema.safeParse({ email, password });
    if (name.trim().length < 2) {
      setError("Indiquez votre nom tel qu’il apparaîtra aux autres membres.");
      return;
    }
    if (!credentials.success) {
      setError(
        `Saisissez une adresse email valide et un mot de passe d’au moins ${AUTH_CONSTRAINTS.passwordMinLength} caractères.`,
      );
      return;
    }
    if (!city.trim() || !postalCode.trim()) {
      setError("Indiquez votre ville et votre code postal.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({
        name,
        email: credentials.data.email,
        password: credentials.data.password,
        city,
        postalCode,
        country: activeMarket.code,
      });
      router.back();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Inscription impossible.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <BrandLogo size="standard" />
      <Text accessibilityRole="header" style={styles.heading}>
        Créer un compte
      </Text>
      <Text style={styles.subtitle}>
        Compte particulier sur {activeMarket.name}. Un email de confirmation
        vous sera envoyé.
      </Text>
      <FormField
        label="Nom"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
      />
      <FormField
        label="Adresse email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <FormField
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        hint={`${AUTH_CONSTRAINTS.passwordMinLength} caractères minimum.`}
      />
      <View style={styles.row}>
        <View style={styles.field}>
          <FormField
            label="Ville"
            value={city}
            onChangeText={setCity}
            autoComplete="postal-address-locality"
          />
        </View>
        <View style={styles.field}>
          <FormField
            label="Code postal"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="number-pad"
            autoComplete="postal-code"
          />
        </View>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.legal}>
        En créant un compte, vous acceptez les conditions d’utilisation et la
        politique de confidentialité de Shongre.
      </Text>
      <Button label="Créer mon compte" onPress={submit} loading={loading} />
      <Button
        label="Compte professionnel ? Continuer sur le Web"
        variant="ghost"
        onPress={() => void Linking.openURL(marketLinks.registerUrl)}
        disabled={loading}
      />
      <Button
        label="J’ai déjà un compte"
        variant="ghost"
        onPress={() => router.replace("/auth/login")}
        disabled={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  row: { flexDirection: "row", gap: spacing.md },
  field: { flex: 1 },
  error: {
    color: colors.danger,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  legal: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
});
