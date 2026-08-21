import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (confirmation !== "SUPPRIMER") {
      setError("Saisissez SUPPRIMER pour confirmer.");
      return;
    }
    if (!password) {
      setError("Votre mot de passe est requis pour confirmer votre identité.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await deleteAccount({ password, reason: reason.trim() || undefined });
      Alert.alert(
        "Compte supprimé",
        "Votre accès est révoqué et les données sans obligation de conservation sont supprimées ou anonymisées.",
        [{ text: "Terminer", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Suppression impossible.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Screen>
        <Text accessibilityRole="header" style={styles.heading}>
          Session requise
        </Text>
        <Text style={styles.body}>
          Reconnectez-vous pour supprimer votre compte depuis l’application.
        </Text>
        <Button
          label="Retour au compte"
          onPress={() => router.replace("/(tabs)/account")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.heading}>
        Supprimer définitivement mon compte
      </Text>
      <Text style={styles.body}>
        Cette action révoque votre accès. Les contenus et données sans
        obligation légale de conservation seront supprimés ou anonymisés. Une
        transaction, livraison ou contestation en cours peut différer la
        suppression.
      </Text>
      <FormField
        label="Mot de passe actuel"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      <FormField
        label="Motif facultatif"
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={500}
      />
      <FormField
        label="Confirmation"
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        hint="Saisissez exactement SUPPRIMER"
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label="Supprimer définitivement"
        onPress={submit}
        variant="danger"
        loading={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingMd,
    lineHeight: nativeTypography.lineHeight.headingMd,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  body: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  error: {
    color: colors.danger,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
});
