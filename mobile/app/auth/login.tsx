import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { loginRequestSchema } from "@shongre/contracts";
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

export default function LoginScreen() {
  const router = useRouter();
  const {
    login,
    completeMfa,
    loginWithProvider,
    socialProviders,
    pendingSocialCompletion,
    socialNotice,
    completePendingSocialRegistration,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const { activeMarket } = useMarket();
  const marketLinks = mobileEnvironment.linksFor(activeMarket);

  const openWebFlow = async (url: string) => {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  };

  const submit = async () => {
    if (mfaToken) {
      if (mfaCode.trim().length < 6) {
        setError("Saisissez votre code de sécurité ou votre code de secours.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        await completeMfa(mfaToken, mfaCode.trim());
        router.back();
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Code invalide ou expiré.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }
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
      const result = await login(parsed.data);
      if (result.kind === "mfa_required") {
        setMfaToken(result.tempMfaToken);
        setPassword("");
      } else {
        router.back();
      }
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
      setError(
        reason instanceof Error
          ? reason.message
          : "Connexion temporairement indisponible.",
      );
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
      setError(
        reason instanceof Error ? reason.message : "Activation impossible.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <BrandLogo size="standard" />
      <Text accessibilityRole="header" style={styles.heading}>
        {mfaToken ? "Vérification de sécurité" : "Ravi de vous revoir"}
      </Text>
      <Text style={styles.subtitle}>
        {mfaToken
          ? "Saisissez le code de votre application d’authentification ou un code de secours."
          : "Votre session est conservée dans le trousseau sécurisé de l’appareil."}
      </Text>
      {mfaToken ? (
        <FormField
          label="Code de sécurité"
          value={mfaCode}
          onChangeText={setMfaCode}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoComplete="one-time-code"
        />
      ) : (
        <>
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
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {socialNotice ? (
        <Text accessibilityRole="alert" style={styles.notice}>
          {socialNotice}
        </Text>
      ) : null}
      {pendingSocialCompletion ? (
        <Button
          label="Vérifier cette adresse"
          onPress={completeSocialProfile}
          loading={loading}
        />
      ) : (
        <>
          <Button
            label={mfaToken ? "Vérifier" : "Se connecter"}
            onPress={submit}
            loading={loading}
          />
          {mfaToken ? (
            <Button
              label="Revenir à la connexion"
              variant="secondary"
              onPress={() => {
                setMfaToken(null);
                setMfaCode("");
                setError("");
              }}
              disabled={loading}
            />
          ) : socialProviders.google ||
            socialProviders.apple ||
            socialProviders.facebook ? (
            <Text style={styles.divider}>ou continuer avec</Text>
          ) : null}
          {!mfaToken && socialProviders.google ? (
            <Button
              label="Continuer avec Google"
              variant="secondary"
              onPress={() => socialLogin("google")}
              disabled={loading}
            />
          ) : null}
          {!mfaToken && socialProviders.apple ? (
            <Button
              label="Continuer avec Apple"
              variant="secondary"
              onPress={() => socialLogin("apple")}
              disabled={loading}
            />
          ) : null}
          {!mfaToken && socialProviders.facebook ? (
            <Button
              label="Continuer avec Facebook"
              variant="secondary"
              onPress={() => socialLogin("facebook")}
              disabled={loading}
            />
          ) : null}
          {/*
           * Registration and password recovery have no native screens. Without
           * these, someone who forgot their password had no route out of this
           * form, and a new user could only join through a social provider.
           * Both open the market's Web flow; the session comes back through the
           * existing deep-link handoff.
           */}
          {!mfaToken ? (
            <View style={styles.recovery}>
              <Button
                label="Mot de passe oublié ?"
                variant="ghost"
                onPress={() => void openWebFlow(marketLinks.passwordResetUrl)}
                disabled={loading}
              />
              <Button
                label="Créer un compte"
                variant="ghost"
                onPress={() => void openWebFlow(marketLinks.registerUrl)}
                disabled={loading}
              />
            </View>
          ) : null}
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
  recovery: { gap: spacing.xs },
});
