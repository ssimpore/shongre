import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { loginRequestSchema } from "@shongre/contracts";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { mobileEnvironment } from "@/config/environment";

export default function LoginScreen() {
  const router = useRouter();
  const {
    login,
    loginWithProvider,
    socialProviders,
    pendingSocialCompletion,
    socialNotice,
    completePendingSocialRegistration,
  } = useAuth();
  const [email, setEmail] = useState("thomas.laurent@example.fr");
  const [password, setPassword] = useState("ShongreDemo2024!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(
        "Saisissez une adresse email valide et un mot de passe d’au moins 6 caractères.",
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(parsed.data);
      router.back();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Connexion impossible.",
      );
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = async (provider: "google" | "apple" | "facebook") => {
    setLoading(true);
    setError("");
    try {
      await loginWithProvider(provider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion temporairement indisponible.");
    } finally {
      setLoading(false);
    }
  };

  const completeSocialProfile = async () => {
    if (!loginRequestSchema.shape.email.safeParse(email).success) {
      setError("Saisissez une adresse email valide.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await completePendingSocialRegistration(email.trim().toLowerCase());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Activation impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.heading}>
        Ravi de vous revoir
      </Text>
      <Text style={styles.subtitle}>
        Votre session est conservée dans le trousseau sécurisé de l’appareil.
      </Text>
      {mobileEnvironment.dataMode === "demo" ? (
        <Text style={styles.demo}>
          Mode démonstration : utilisez le compte prérempli avec un mot de passe
          de six caractères ou plus.
        </Text>
      ) : null}
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
        autoComplete="current-password"
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {socialNotice ? <Text accessibilityRole="alert" style={styles.notice}>{socialNotice}</Text> : null}
      {pendingSocialCompletion ? (
        <Button label="Vérifier cette adresse" onPress={completeSocialProfile} loading={loading} />
      ) : (
        <>
          <Button label="Se connecter" onPress={submit} loading={loading} />
          {(socialProviders.google || socialProviders.apple || socialProviders.facebook) ? (
            <Text style={styles.divider}>ou continuer avec</Text>
          ) : null}
          {socialProviders.google ? <Button label="Continuer avec Google" variant="secondary" onPress={() => socialLogin("google")} disabled={loading} /> : null}
          {socialProviders.apple ? <Button label="Continuer avec Apple" variant="secondary" onPress={() => socialLogin("apple")} disabled={loading} /> : null}
          {socialProviders.facebook ? <Button label="Continuer avec Facebook" variant="secondary" onPress={() => socialLogin("facebook")} disabled={loading} /> : null}
        </>
      )}
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
  demo: {
    color: colors.warning,
    fontSize: nativeTypography.size.caption,
    lineHeight: nativeTypography.lineHeight.caption,
    paddingVertical: spacing.sm,
  },
  error: {
    color: colors.danger,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  notice: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  divider: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.caption,
    textAlign: "center",
    paddingVertical: spacing.xs,
  },
});
