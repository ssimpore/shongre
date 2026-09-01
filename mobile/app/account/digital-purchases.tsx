import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { DigitalEntitlementProjection } from "@shongre/contracts/digital-products";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import {
  mobileDigitalProductsService,
  type MobileConsumedDigitalAccess,
} from "@/features/digital-products/digital-products.service";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

type Revealed = Extract<
  MobileConsumedDigitalAccess,
  { kind: "EXTERNAL_LINK" | "CREDENTIALS" }
>;

const STATUS_LABELS: Record<DigitalEntitlementProjection["status"], string> = {
  PAYMENT_PENDING: "Paiement en cours de confirmation",
  PAYMENT_FAILED: "Paiement échoué",
  PAYMENT_CANCELLED: "Paiement annulé",
  FULFILLMENT_PROCESSING: "Préparation de l’accès",
  PROVISIONING: "Accès en préparation",
  PROVISIONING_FAILED: "Préparation échouée",
  ACCESS_AVAILABLE: "Accès disponible",
  DELIVERED: "Accès remis",
  INVALID_ACCESS: "Accès signalé invalide",
  QUARANTINED: "Fichier en quarantaine",
  LIMIT_REACHED: "Limite atteinte",
  RESET_REQUESTED: "Réinitialisation demandée",
  REPLACEMENT_REQUESTED: "Remplacement demandé",
  EXPIRED: "Accès expiré",
  REFUND_REQUESTED: "Remboursement demandé",
  PARTIALLY_REFUNDED: "Remboursement partiel",
  REFUNDED: "Commande remboursée",
  DISPUTED: "Accès suspendu pendant le litige",
  REVOKED: "Accès révoqué",
  UNAVAILABLE: "Accès indisponible",
};

const isAvailable = (item: DigitalEntitlementProjection) =>
  item.paymentStatus === "CONFIRMED" &&
  ["ACCESS_AVAILABLE", "DELIVERED"].includes(item.status);

export default function DigitalPurchasesScreen() {
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [items, setItems] = useState<DigitalEntitlementProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({});
  const [reportingId, setReportingId] = useState("");
  const [report, setReport] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    setRevealed({});
    try {
      setItems(
        await mobileDigitalProductsService.listEntitlements(
          activeMarket.code,
          user.id,
        ),
      );
    } catch {
      setItems([]);
      setError("Les achats numériques sont temporairement indisponibles.");
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, user]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const openAccess = async (
    item: DigitalEntitlementProjection,
    assetId?: string,
  ) => {
    setBusyId(item.id);
    try {
      const grant = assetId
        ? await mobileDigitalProductsService.createDownloadGrant(
            activeMarket.code,
            user!.id,
            item.id,
            assetId,
          )
        : await mobileDigitalProductsService.createRevealGrant(
            activeMarket.code,
            user!.id,
            item.id,
          );
      const access = await mobileDigitalProductsService.consumeGrant(
        user!.id,
        grant.id,
      );
      if (access.kind === "DOWNLOAD") {
        if (access.simulated) {
          Alert.alert(
            "Simulation",
            "Le téléchargement est simulé ; aucun fichier réel n’a été ouvert.",
          );
        } else {
          await Linking.openURL(access.url);
        }
      } else if (access.kind === "EXTERNAL_LINK") {
        Alert.alert(
          "Vous quittez Shongre",
          `Destination : ${access.destinationDomain ?? "domaine indisponible"}. Les paramètres secrets restent masqués.`,
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Continuer",
              onPress: () => {
                if (access.destinationUrl && !access.simulated) {
                  void Linking.openURL(access.destinationUrl);
                }
              },
            },
          ],
        );
      } else {
        setRevealed((current) => ({ ...current, [item.id]: access }));
      }
    } catch {
      setError("Cet accès est indisponible. Réessayez depuis la commande.");
    } finally {
      setBusyId("");
    }
  };

  const submitReport = async (entitlementId: string) => {
    if (report.trim().length < 10) return;
    setBusyId(entitlementId);
    try {
      await mobileDigitalProductsService.reportAccess(
        activeMarket.code,
        entitlementId,
        report.trim(),
      );
      setReportingId("");
      setReport("");
      Alert.alert(
        "Signalement envoyé",
        "Le support a reçu une description sans lien ni identifiant secret.",
      );
    } catch {
      setError("Le signalement n’a pas pu être envoyé.");
    } finally {
      setBusyId("");
    }
  };

  if (!user) {
    return (
      <Screen>
        <StatePanel
          title="Session requise"
          message="Connectez-vous pour consulter vos accès numériques."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text accessibilityRole="header" style={styles.heading}>
          Mes achats numériques
        </Text>
        <Text style={styles.subtitle}>
          Téléchargements, liens, identifiants et accès en préparation.
        </Text>
      </View>

      {error ? (
        <StatePanel
          title="Accès indisponible"
          message={error}
          actionLabel="Réessayer"
          onAction={() => void load()}
        />
      ) : null}
      {loading ? (
        <Text style={styles.subtitle}>Chargement des accès…</Text>
      ) : null}
      {!loading && items.length === 0 ? (
        <StatePanel
          title="Aucun achat numérique"
          message="Vos futurs accès numériques seront regroupés ici."
        />
      ) : null}

      {items.map((item) => {
        const access = revealed[item.id];
        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
            <Text style={styles.noShipping}>Aucune livraison physique</Text>
            <Text style={styles.meta}>Version {item.productVersion}</Text>
            {item.simulated ? (
              <Text style={styles.simulated}>
                Simulation — aucun paiement ni accès réel
              </Text>
            ) : null}

            {isAvailable(item) &&
            item.primaryFulfillmentType === "FILE_DOWNLOAD"
              ? item.files.map((file) => (
                  <Button
                    key={file.id}
                    label="Télécharger"
                    variant="secondary"
                    loading={busyId === item.id}
                    disabled={file.status !== "READY" || busyId === item.id}
                    onPress={() => void openAccess(item, file.id)}
                  />
                ))
              : null}

            {isAvailable(item) &&
            item.primaryFulfillmentType !== "FILE_DOWNLOAD" ? (
              <Button
                label={
                  item.primaryFulfillmentType === "ACCESS_LINK"
                    ? "Ouvrir le lien"
                    : "Afficher mes accès"
                }
                variant="secondary"
                loading={busyId === item.id}
                disabled={busyId === item.id}
                onPress={() => void openAccess(item)}
              />
            ) : null}

            {access ? (
              <View style={styles.secretPanel}>
                {access.fields.map((field, index) => (
                  <View key={`${item.id}:${index}`} style={styles.secretRow}>
                    <View style={styles.secretValue}>
                      <Text style={styles.meta}>{field.label}</Text>
                      <Text selectable style={styles.code}>
                        {field.value}
                      </Text>
                    </View>
                    <Button
                      label="Copier"
                      variant="ghost"
                      onPress={() => void Clipboard.setStringAsync(field.value)}
                    />
                  </View>
                ))}
                {access.instructions.map((instruction) => (
                  <Text key={instruction} style={styles.subtitle}>
                    {instruction}
                  </Text>
                ))}
                <Button
                  label="Masquer les accès"
                  variant="ghost"
                  onPress={() =>
                    setRevealed((current) => {
                      const next = { ...current };
                      delete next[item.id];
                      return next;
                    })
                  }
                />
              </View>
            ) : null}

            {reportingId === item.id ? (
              <View style={styles.report}>
                <Text style={styles.subtitle}>
                  Décrivez le problème sans lien, mot de passe, code ni autre
                  secret.
                </Text>
                <FormField
                  label="Description du problème"
                  value={report}
                  onChangeText={setReport}
                  multiline
                />
                <Button
                  label="Envoyer au support"
                  disabled={report.trim().length < 10}
                  loading={busyId === item.id}
                  onPress={() => void submitReport(item.id)}
                />
                <Button
                  label="Annuler"
                  variant="ghost"
                  onPress={() => setReportingId("")}
                />
              </View>
            ) : (
              <Button
                label="Signaler un problème d’accès"
                variant="ghost"
                onPress={() => {
                  setReportingId(item.id);
                  setReport("");
                }}
              />
            )}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.headingLg,
  },
  subtitle: { color: colors.textMuted, fontSize: nativeTypography.size.bodySm },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.bodyLg,
  },
  status: {
    color: colors.primary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  noShipping: {
    color: colors.success,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  meta: { color: colors.textMuted, fontSize: nativeTypography.size.bodySm },
  simulated: {
    color: colors.warning,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  secretPanel: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  secretRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  secretValue: { flex: 1, gap: spacing.xs },
  code: { color: colors.text, fontFamily: nativeTypography.fontFamily.bold },
  report: { gap: spacing.md },
});
