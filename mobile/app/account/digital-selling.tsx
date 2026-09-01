import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type {
  DigitalPolicyProjection,
  DigitalProvisioningTask,
  DigitalSellerProfile,
  FulfillmentType,
} from "@shongre/contracts/digital-products";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import { mobileDigitalProductsService } from "@/features/digital-products/digital-products.service";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

const OPTIONS: { type: FulfillmentType; label: string }[] = [
  { type: "PHYSICAL", label: "Produits physiques" },
  { type: "FILE_DOWNLOAD", label: "Produits téléchargeables" },
  { type: "ACCESS_LINK", label: "Produits remis par lien" },
  { type: "ACCESS_CREDENTIALS", label: "Produits avec identifiants" },
  { type: "SELLER_PROVISIONED", label: "Accès créé après paiement" },
];

export default function DigitalSellingScreen() {
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const [policy, setPolicy] = useState<DigitalPolicyProjection | null>(null);
  const [profile, setProfile] = useState<DigitalSellerProfile | null>(null);
  const [selected, setSelected] = useState<FulfillmentType[]>(["PHYSICAL"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<DigitalProvisioningTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [username, setUsername] = useState("");
  const [accessSecret, setAccessSecret] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [nextPolicy, nextProfile, nextTasks] = await Promise.all([
        mobileDigitalProductsService.getPolicy(activeMarket.code),
        mobileDigitalProductsService.getSellerProfile(
          activeMarket.code,
          user.id,
        ),
        mobileDigitalProductsService.listSellerProvisioningTasks(
          activeMarket.code,
          user.id,
        ),
      ]);
      setPolicy(nextPolicy);
      setProfile(nextProfile);
      setSelected(nextProfile?.fulfillmentTypes ?? ["PHYSICAL"]);
      setTasks(nextTasks);
    } catch {
      setError("Les responsabilités vendeur sont indisponibles.");
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, user]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const digitalTypes = useMemo(
    () => selected.filter((type) => type !== "PHYSICAL"),
    [selected],
  );
  const combinationAllowed = useMemo(
    () =>
      Boolean(
        policy &&
        digitalTypes.length &&
        policy.allowedFulfillmentCombinations.some(
          (combination) =>
            combination.length === digitalTypes.length &&
            combination.every((type) => digitalTypes.includes(type)),
        ),
      ),
    [digitalTypes, policy],
  );

  const save = async () => {
    if (!user || !policy || !combinationAllowed) return;
    setSaving(true);
    setError("");
    try {
      setProfile(
        await mobileDigitalProductsService.acceptSellerResponsibilities(
          activeMarket.code,
          user.id,
          selected,
          policy.version,
        ),
      );
    } catch {
      setError("Les responsabilités n’ont pas pu être enregistrées.");
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async (task: DigitalProvisioningTask) => {
    if (!destinationUrl.trim() || !accessSecret) return;
    setActiveTaskId(task.id);
    setError("");
    try {
      await mobileDigitalProductsService.submitProvisionedAccess(
        activeMarket.code,
        task.entitlementId,
        {
          productAccessClass: task.productAccessClass,
          destinationUrl: destinationUrl.trim(),
          fields: [
            ...(username.trim()
              ? [
                  {
                    kind: "USERNAME" as const,
                    label: "Identifiant",
                    value: username.trim(),
                  },
                ]
              : []),
            {
              kind: "PASSWORD",
              label: "Mot de passe, code ou clé",
              value: accessSecret,
            },
          ],
        },
      );
      setDestinationUrl("");
      setUsername("");
      setAccessSecret("");
      await load();
    } catch {
      setError(
        "L’accès n’a pas pu être remis. Réessayez sans inclure de secret dans le signalement.",
      );
    } finally {
      setActiveTaskId(null);
    }
  };

  if (!user) {
    return (
      <Screen>
        <StatePanel
          title="Session requise"
          message="Connectez-vous pour configurer vos modes de vente."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text accessibilityRole="header" style={styles.heading}>
          Vendre des produits numériques
        </Text>
        <Text style={styles.subtitle}>
          Choisissez une remise physique, numérique ou combinée. La catégorie ne
          décide jamais du mode de remise.
        </Text>
      </View>
      {loading ? (
        <Text style={styles.subtitle}>Chargement de la politique…</Text>
      ) : null}
      {error ? (
        <StatePanel
          title="Action indisponible"
          message={error}
          actionLabel="Réessayer"
          onAction={() => void load()}
        />
      ) : null}
      {policy && !policy.enabled ? (
        <StatePanel
          title="Vente numérique désactivée"
          message="Les décisions de marché requises ne sont pas encore approuvées."
        />
      ) : null}
      {policy?.enabled ? (
        <>
          <View style={styles.card} accessibilityRole="radiogroup">
            {OPTIONS.map((option) => {
              const allowed =
                option.type === "PHYSICAL" ||
                policy.allowedFulfillmentTypes.includes(option.type);
              const active = selected.includes(option.type);
              return (
                <Button
                  key={option.type}
                  label={`${active ? "✓ " : ""}${option.label}`}
                  variant={active ? "primary" : "secondary"}
                  disabled={!allowed}
                  onPress={() =>
                    setSelected((current) =>
                      active
                        ? current.filter((type) => type !== option.type)
                        : [...current, option.type],
                    )
                  }
                />
              );
            })}
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Exigences applicables</Text>
            <Text style={styles.subtitle}>
              Vérifications : {policy.requiredVerificationDimensions.join(", ")}
            </Text>
            <Text style={styles.subtitle}>
              Fichiers : {policy.maxFileCount} maximum,{" "}
              {Math.round(policy.maxFileSizeBytes / 1_048_576)} Mo par fichier
            </Text>
            <Text style={styles.subtitle}>
              Préparation : {policy.provisioningDeadlineHours} h maximum
            </Text>
            <Text style={styles.subtitle}>
              Les fichiers, liens, identifiants et codes privés ne doivent
              jamais être ajoutés au texte public.
            </Text>
            {policy.requirements.map((requirement) => (
              <View key={requirement.id} style={styles.requirement}>
                <Text style={styles.title}>
                  {requirement.label[activeMarket.defaultLocale] ??
                    requirement.label["fr-FR"]}
                </Text>
                <Text style={styles.subtitle}>
                  {requirement.description[activeMarket.defaultLocale] ??
                    requirement.description["fr-FR"]}
                </Text>
              </View>
            ))}
          </View>
          <Button
            label={
              profile?.policyVersion === policy.version
                ? `Responsabilités à jour — version ${policy.version}`
                : "Accepter les responsabilités"
            }
            loading={saving}
            disabled={!combinationAllowed || saving}
            onPress={() => void save()}
          />
          {digitalTypes.length > 0 && !combinationAllowed ? (
            <Text style={styles.warning} accessibilityRole="alert">
              Cette combinaison de modes de remise n’est pas autorisée pour ce
              marché.
            </Text>
          ) : null}
          <Text style={styles.subtitle}>
            Les vendeurs existants sont sollicités à nouveau seulement
            lorsqu’une nouvelle version l’exige.
          </Text>
          <View
            style={styles.card}
            accessibilityLabel="Accès numériques à préparer"
          >
            <Text style={styles.title}>Accès à préparer</Text>
            <Text style={styles.subtitle}>
              Seules les commandes dont le paiement est confirmé par Shongre
              apparaissent ici. Aucun secret n’est conservé sur l’appareil.
            </Text>
            {tasks.length === 0 ? (
              <Text style={styles.subtitle}>
                Aucun accès numérique n’est à préparer.
              </Text>
            ) : (
              tasks.map((task) => (
                <View key={task.id} style={styles.requirement}>
                  <Text style={styles.title}>{task.title}</Text>
                  <Text style={styles.subtitle}>
                    À remettre avant le{" "}
                    {new Intl.DateTimeFormat(activeMarket.defaultLocale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(task.deadlineAt))}
                  </Text>
                  {task.status === "PENDING" ||
                  task.status === "IN_PROGRESS" ||
                  task.status === "RETRY_PENDING" ? (
                    <>
                      <TextInput
                        accessibilityLabel="Lien HTTPS d’accès"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        placeholder="https://…"
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        value={destinationUrl}
                        onChangeText={setDestinationUrl}
                      />
                      <TextInput
                        accessibilityLabel="Identifiant facultatif"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Identifiant facultatif"
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                      />
                      <TextInput
                        accessibilityLabel="Mot de passe, code ou clé"
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        placeholder="Mot de passe, code ou clé"
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        value={accessSecret}
                        onChangeText={setAccessSecret}
                      />
                      <Button
                        label="Protéger et remettre l’accès"
                        loading={activeTaskId === task.id}
                        disabled={
                          !destinationUrl.trim() ||
                          !accessSecret ||
                          activeTaskId !== null
                        }
                        onPress={() => void completeTask(task)}
                      />
                    </>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </>
      ) : null}
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
  warning: { color: colors.warning, fontSize: nativeTypography.size.bodySm },
  title: { color: colors.text, fontFamily: nativeTypography.fontFamily.bold },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  requirement: { gap: spacing.xs, paddingTop: spacing.sm },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
