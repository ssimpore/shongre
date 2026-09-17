import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { loginRequestSchema } from "@shongre/contracts";
import { Button } from "@/components/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Password recovery. The API answers the same whether or not the address
 * exists, so the screen does too: it confirms the email was sent and says
 * where the reset link leads.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!loginRequestSchema.shape.email.safeParse(email).success) {
      setError("Saisissez une adresse email valide.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "L’envoi est impossible pour le moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <BrandLogo size="standard" />
      <Text accessibilityRole="header" style={styles.heading}>
        Mot de passe oublié
      </Text>
      {sent ? (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
            Si un compte existe pour {email.trim().toLowerCase()}, un email
            contenant un lien de réinitialisation vient d’être envoyé. Le lien
            ouvre la page de réinitialisation ; connectez-vous ensuite ici avec
            votre nouveau mot de passe.
          </Text>
          <Button
            label="Retour à la connexion"
            onPress={() => router.replace("/auth/login")}
          />
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>
            Indiquez l’adresse email de votre compte. Vous recevrez un lien pour
            choisir un nouveau mot de passe.
          </Text>
          <FormField
            label="Adresse email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Button label="Envoyer le lien" onPress={submit} loading={loading} />
          <Button
            label="Retour à la connexion"
            variant="ghost"
            onPress={() => router.back()}
            disabled={loading}
          />
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
  error: {
    color: colors.danger,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
});
