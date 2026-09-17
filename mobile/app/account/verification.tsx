import { useCallback, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import {
  verificationService,
  type MobileVerificationStatus,
} from "@/features/verification/verification.service";

const FACTS: {
  key: keyof Omit<MobileVerificationStatus, "state">;
  label: string;
  hint: string;
}[] = [
  {
    key: "isPhoneVerified",
    label: "Téléphone",
    hint: "Confirmé par le code reçu par SMS.",
  },
  {
    key: "isIdentityVerified",
    label: "Identité",
    hint: "Pièce d’identité contrôlée par notre prestataire.",
  },
  {
    key: "isBusinessVerified",
    label: "Entreprise",
    hint: "Immatriculation vérifiée pour les comptes professionnels.",
  },
  {
    key: "isBankPayoutConfigured",
    label: "Versements",
    hint: "Compte de versement configuré pour recevoir vos ventes.",
  },
];

/**
 * The account's verification facts and the identity check itself. The
 * provider's flow runs in the system browser; the phone reads the outcome
 * back when the screen regains focus.
 */
export default function VerificationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [status, setStatus] = useState<MobileVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setStatus(await verificationService.status(user.id));
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "Le statut de vérification est indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const startIdentity = async () => {
    setStarting(true);
    setStartError("");
    try {
      const session = await verificationService.startIdentitySession(
        activeMarket.countryCode,
      );
      await Linking.openURL(session.redirectUrl);
    } catch (reason) {
      setStartError(
        reason instanceof Error && reason.message
          ? reason.message
          : "La vérification n’a pas pu être lancée.",
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Vérification" }} />
      <Text accessibilityRole="header" style={styles.heading}>
        Vérification du compte
      </Text>
      {!user ? (
        <StatePanel
          title="Connexion requise"
          message="Connectez-vous pour consulter l’état de votre compte."
          actionLabel="Se connecter"
          onAction={() => router.push("/auth/login")}
        />
      ) : loading && !status ? (
        <Text style={styles.muted} accessibilityLiveRegion="polite">
          Chargement…
        </Text>
      ) : error && !status ? (
        <StatePanel
          title="Statut indisponible"
          message={error}
          tone="error"
          actionLabel="Réessayer"
          onAction={() => void load()}
        />
      ) : status ? (
        <>
          <Text style={styles.muted}>
            Chaque étape n’est demandée que lorsqu’une action l’exige. Les
            membres voient uniquement le badge, jamais vos documents.
          </Text>
          <View accessibilityRole="list" style={styles.facts}>
            {FACTS.map((fact) => {
              const done = status[fact.key];
              return (
                <View
                  key={fact.key}
                  accessibilityLabel={`${fact.label} : ${done ? "vérifié" : "à faire"}`}
                  style={styles.fact}
                >
                  <View style={styles.factBody}>
                    <Text style={styles.factLabel}>{fact.label}</Text>
                    <Text style={styles.muted}>{fact.hint}</Text>
                  </View>
                  <Text
                    style={[styles.factState, done ? styles.factDone : null]}
                  >
                    {done ? "Vérifié" : "À faire"}
                  </Text>
                </View>
              );
            })}
          </View>
          {!status.isIdentityVerified ? (
            <>
              <Button
                label="Vérifier mon identité"
                onPress={() => void startIdentity()}
                loading={starting}
                accessibilityHint="Ouvre le contrôle d’identité dans le navigateur"
              />
              {startError ? (
                <Text style={styles.error} accessibilityLiveRegion="assertive">
                  {startError}
                </Text>
              ) : null}
            </>
          ) : null}
          <Text style={styles.muted}>
            La vérification d’entreprise et la configuration des versements se
            font depuis votre espace sur le Web.
          </Text>
        </>
      ) : null}
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
  error: {
    color: colors.danger,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  facts: { gap: spacing.sm },
  fact: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  factBody: { flex: 1, gap: spacing.xs },
  factLabel: {
    color: colors.text,
    fontSize: nativeTypography.size.body,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  factState: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  factDone: { color: colors.success },
});
