import { StyleSheet, Text, View } from "react-native";
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

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.heading}>
        Compte
      </Text>
      <Button
        label="Pays et réglages"
        onPress={() => router.push("/settings")}
        variant="secondary"
      />
      {loading ? (
        <Text style={styles.muted}>Chargement sécurisé de votre session…</Text>
      ) : user ? (
        <>
          <View style={styles.profile}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.muted}>{user.email}</Text>
            <Text style={styles.badge}>
              {user.accountType === "professional"
                ? "Professionnel"
                : "Particulier"}
            </Text>
          </View>
          <Button
            label="Se déconnecter"
            onPress={() => void logout()}
            variant="ghost"
          />
        </>
      ) : (
        <>
          <Text style={styles.muted}>
            Connectez-vous pour publier, retrouver vos favoris et gérer vos
            conversations.
          </Text>
          <Button
            label="Se connecter"
            onPress={() => router.push("/auth/login")}
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
  muted: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  profile: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    color: colors.text,
    fontSize: nativeTypography.size.headingSm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  badge: {
    alignSelf: "flex-start",
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
});
