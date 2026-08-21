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
  const { login } = useAuth();
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
      <Button label="Se connecter" onPress={submit} loading={loading} />
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
});
