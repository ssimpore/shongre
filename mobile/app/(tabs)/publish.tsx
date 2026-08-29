import { useEffect, useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  publicationInputSchema,
  toApplicationListingCondition,
  toTaxonomyV4ItemCondition,
} from "@shongre/contracts";
import type { TaxonomyV4ResolvedSchema } from "@shongre/contracts";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import { resolveTaxonomyFieldState } from "@shongre/features";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import { listingsService } from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";
import { permissionsService } from "@/services/permissions/permissions.service";
import { TaxonomyV4Field } from "@/features/taxonomy/TaxonomyV4Field";
import { taxonomyService } from "@/features/taxonomy/taxonomy.service";

const taxonomyBundle = getTaxonomyV4PublicBundle();
const NATIVE_MANAGED_FIELDS = new Set([
  "title",
  "description",
  "images",
  "listing_intent",
  "price",
  "price_type",
  "currency",
  "seller_type",
  "condition",
  "country",
  "postal_code",
  "city",
  "address",
  "location_country",
  "location_postcode",
  "location_city",
  "item_condition",
]);

export default function PublishScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket, marketContext } = useMarket();
  const availableNodes = useMemo(
    () =>
      taxonomyBundle.categories.filter(
        (category) =>
          category.status === "active" &&
          category.marketAvailability.some(
            (availability) =>
              availability.marketCode === activeMarket.code &&
              availability.marketplaceEnabled,
          ),
      ),
    [activeMarket.code],
  );
  const rootCategories = useMemo(
    () => availableNodes.filter((category) => !category.parentId),
    [availableNodes],
  );
  const [rootCategoryId, setRootCategoryId] = useState("");
  const activeRootCategoryId = rootCategories.some(
    (category) => category.id === rootCategoryId,
  )
    ? rootCategoryId
    : (rootCategories[0]?.id ?? "");
  const publishableCategories = useMemo(() => {
    const descendants = new Set<string>();
    let frontier = [activeRootCategoryId];
    while (frontier.length > 0) {
      const parents = new Set(frontier);
      const children = availableNodes.filter(
        (category) => category.parentId && parents.has(category.parentId),
      );
      children.forEach((category) => descendants.add(category.id));
      frontier = children.map((category) => category.id);
    }
    return availableNodes.filter(
      (category) => descendants.has(category.id) && category.publishable,
    );
  }, [activeRootCategoryId, availableNodes]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const activeCategoryId = publishableCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : (publishableCategories[0]?.id ?? "");
  const sellerType =
    user?.accountType === "professional" ? "professional" : "individual";
  const listingTypes = useMemo(
    () =>
      taxonomyBundle.listingTypes.filter(
        (listingType) =>
          listingType.categoryId === activeCategoryId &&
          listingType.status === "active" &&
          (sellerType === "professional"
            ? listingType.sellerEligibility.professionalAllowed
            : listingType.sellerEligibility.individualAllowed) &&
          listingType.marketAvailability.some(
            (availability) =>
              availability.marketCode === activeMarket.code &&
              availability.marketplaceEnabled,
          ),
      ),
    [activeCategoryId, activeMarket.code, sellerType],
  );
  const [listingTypeId, setListingTypeId] = useState("");
  const activeListingTypeId = listingTypes.some(
    (listingType) => listingType.id === listingTypeId,
  )
    ? listingTypeId
    : (listingTypes[0]?.id ?? "");
  const [taxonomyAttributes, setTaxonomyAttributes] = useState<
    Record<string, unknown>
  >({});
  const [schemaRetry, setSchemaRetry] = useState(0);
  const schemaRequestKey = `${activeMarket.code}:${activeMarket.defaultLocale}:${activeCategoryId}:${activeListingTypeId}:${sellerType}:${schemaRetry}`;
  const [schemaResult, setSchemaResult] = useState<{
    key: string;
    schema: TaxonomyV4ResolvedSchema | null;
    error: string;
  }>({ key: "", schema: null, error: "" });
  const resolvedSchema =
    schemaResult.key === schemaRequestKey ? schemaResult.schema : null;
  const schemaError =
    schemaResult.key === schemaRequestKey ? schemaResult.error : "";
  const schemaState: "idle" | "loading" | "ready" | "error" =
    !activeCategoryId || !activeListingTypeId
      ? "idle"
      : schemaResult.key !== schemaRequestKey
        ? "loading"
        : schemaResult.error
          ? "error"
          : "ready";
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!activeCategoryId || !activeListingTypeId) return;
    void taxonomyService
      .resolve({
        marketContext,
        categoryIdentity: activeCategoryId,
        listingTypeId: activeListingTypeId,
        sellerType,
        locale: activeMarket.defaultLocale,
        taxonomyVersion: "4.0.0",
      })
      .then((schema) => {
        if (!active) return;
        setSchemaResult({ key: schemaRequestKey, schema, error: "" });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setSchemaResult({
          key: schemaRequestKey,
          schema: null,
          error:
            reason instanceof Error
              ? reason.message
              : "Le formulaire de cette annonce est indisponible.",
        });
      });
    return () => {
      active = false;
    };
  }, [
    activeMarket.defaultLocale,
    activeCategoryId,
    activeListingTypeId,
    marketContext,
    schemaRetry,
    schemaRequestKey,
    sellerType,
  ]);

  const cascadeRequests = useMemo(() => {
    if (!resolvedSchema) return [];
    return resolvedSchema.dependencyRules.flatMap((rule) => {
      if (
        rule.effect !== "FILTER_OPTIONS" ||
        rule.trigger.kind !== "attribute"
      ) {
        return [];
      }
      const parent = resolvedSchema.attributes.find(
        (field) => field.definition.id === rule.trigger.key,
      );
      const parentValue = taxonomyAttributes[rule.trigger.key];
      if (!parent?.definition.optionSetId) return [];
      return rule.targets.flatMap((target) => {
        if (target.kind !== "attribute") return [];
        const child = resolvedSchema.attributes.find(
          (field) => field.definition.id === target.key,
        );
        if (!child?.definition.optionSetId) return [];
        return [
          {
            attributeId: target.key,
            optionSetId: child.definition.optionSetId,
            parentOptionId:
              parentValue === undefined ||
              parentValue === null ||
              parentValue === ""
                ? undefined
                : `${parent.definition.optionSetId}:${String(parentValue)}`,
          },
        ];
      });
    });
  }, [resolvedSchema, taxonomyAttributes]);
  const cascadeRequestKey = JSON.stringify(cascadeRequests);
  const [cascadeResult, setCascadeResult] = useState<{
    key: string;
    options: Record<
      string,
      TaxonomyV4ResolvedSchema["attributes"][number]["options"]
    >;
    failed: boolean;
  }>({ key: "", options: {}, failed: false });
  const cascadeOptions =
    cascadeResult.key === cascadeRequestKey ? cascadeResult.options : {};
  const cascadeState = useMemo(
    () =>
      Object.fromEntries(
        cascadeRequests.map((request) => [
          request.attributeId,
          !request.parentOptionId
            ? "empty"
            : cascadeResult.key !== cascadeRequestKey
              ? "loading"
              : cascadeResult.failed
                ? "error"
                : (cascadeResult.options[request.attributeId]?.length ?? 0) > 0
                  ? "ready"
                  : "empty",
        ]),
      ) as Record<string, "loading" | "ready" | "empty" | "error">,
    [cascadeRequestKey, cascadeRequests, cascadeResult],
  );

  useEffect(() => {
    let active = true;
    if (
      !resolvedSchema ||
      !cascadeRequests.some((request) => request.parentOptionId)
    ) {
      return;
    }
    void Promise.all(
      cascadeRequests
        .filter((request) => request.parentOptionId)
        .map(async (request) => ({
          request,
          page: await taxonomyService.lookupOptions({
            marketContext,
            optionSetId: request.optionSetId,
            parentOptionId: request.parentOptionId,
            limit: 200,
          }),
        })),
    )
      .then((results) => {
        if (!active) return;
        setCascadeResult({
          key: cascadeRequestKey,
          options: Object.fromEntries(
            results.map(({ request, page }) => [
              request.attributeId,
              page.items,
            ]),
          ),
          failed: false,
        });
        setTaxonomyAttributes((current) => {
          let changed = false;
          const next = { ...current };
          results.forEach(({ request, page }) => {
            const selected = next[request.attributeId];
            if (
              selected !== undefined &&
              selected !== "" &&
              !page.items.some((option) => option.key === String(selected))
            ) {
              delete next[request.attributeId];
              changed = true;
            }
          });
          return changed ? next : current;
        });
      })
      .catch(() => {
        if (!active) return;
        setCascadeResult({ key: cascadeRequestKey, options: {}, failed: true });
      });

    return () => {
      active = false;
    };
  }, [cascadeRequestKey, cascadeRequests, marketContext, resolvedSchema]);

  const choosePhoto = async () => {
    const outcome = await permissionsService.requestPhotoSelection();
    if (outcome !== "granted") {
      Alert.alert(
        "Accès aux photos refusé",
        "Vous pouvez continuer sans photo ou autoriser l’accès dans les réglages du téléphone.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled)
      setImages((current) => [...current, result.assets[0].uri].slice(0, 12));
  };

  const publish = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const numericPrice = Number(price.replace(",", "."));
    const acceptedAttributeIds = new Set(
      resolvedSchema?.attributes.map((field) => field.definition.id) ?? [],
    );
    const canonicalCondition = toTaxonomyV4ItemCondition("good");
    const listingIntent = resolvedSchema?.listingType.intent;
    const managedAttributes: Record<string, unknown> = {
      listing_intent: listingIntent?.toLocaleLowerCase("en-US"),
      title,
      description,
      images,
      price: Math.round(numericPrice * 100),
      price_type: listingIntent === "DONATE" ? "free" : "fixed",
      currency: activeMarket.currency,
      seller_type: sellerType,
      condition: canonicalCondition,
      country: activeMarket.code,
      postal_code: postalCode,
      city,
      location_country: activeMarket.code,
      location_postcode: postalCode,
      location_city: city,
      item_condition: canonicalCondition,
    };
    const resolvedAttributes: Record<string, unknown> = {
      ...taxonomyAttributes,
      ...Object.fromEntries(
        Object.entries(managedAttributes).filter(
          ([attributeId, value]) =>
            acceptedAttributeIds.has(attributeId) && value !== undefined,
        ),
      ),
    };
    const missingTaxonomyField = resolvedSchema?.attributes.find((field) => {
      const state = resolveTaxonomyFieldState({
        schema: resolvedSchema,
        attributeId: field.definition.id,
        values: resolvedAttributes,
        sellerType,
      });
      if (!state.visible || (!field.binding.required && !state.required)) {
        return false;
      }
      const value = resolvedAttributes[field.definition.id];
      return (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      );
    });
    if (missingTaxonomyField) {
      setError(
        `Renseignez « ${missingTaxonomyField.definition.labels[activeMarket.defaultLocale] ?? missingTaxonomyField.definition.labels["fr-FR"]} » avant de publier.`,
      );
      return;
    }
    const parsed = publicationInputSchema.safeParse({
      title,
      description,
      amountMinor: Math.round(numericPrice * 100),
      currency: activeMarket.currency,
      categoryId: activeCategoryId,
      listingTypeId: activeListingTypeId,
      listingIntent: resolvedSchema?.listingType.intent,
      taxonomyVersion: "4.0.0",
      attributes: resolvedAttributes,
      marketCode: activeMarket.code,
      city,
      postalCode,
      condition: toApplicationListingCondition(resolvedAttributes, "good"),
      images,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message || "Vérifiez les informations saisies.",
      );
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const listing = await listingsService.publish(parsed.data);
      Alert.alert(
        "Annonce envoyée",
        "Votre annonce est publiée ou en cours de vérification selon les contrôles de sécurité.",
        [
          {
            text: "Voir l’annonce",
            onPress: () => router.replace(`/listing/${listing.id}`),
          },
        ],
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Publication impossible.",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.heading}>
          Publier une annonce
        </Text>
        <Text style={styles.subtitle}>
          Ajoutez l’essentiel maintenant. Vous pourrez compléter les détails
          depuis votre espace vendeur.
        </Text>
      </View>

      <View style={styles.categoryGroup}>
        <Text style={styles.label}>Univers</Text>
        <View style={styles.categoryRow}>
          {rootCategories.map((category) => (
            <Button
              key={category.id}
              label={category.labels["fr-FR"]}
              variant={
                activeRootCategoryId === category.id ? "primary" : "secondary"
              }
              onPress={() => {
                setRootCategoryId(category.id);
                setCategoryId("");
                setListingTypeId("");
                setTaxonomyAttributes({});
              }}
              style={styles.categoryButton}
            />
          ))}
        </View>
      </View>

      <View style={styles.categoryGroup} accessibilityRole="radiogroup">
        <Text style={styles.label}>Catégorie</Text>
        <View style={styles.categoryRow}>
          {publishableCategories.map((category) => (
            <Button
              key={category.id}
              label={category.labels["fr-FR"]}
              variant={
                activeCategoryId === category.id ? "primary" : "secondary"
              }
              onPress={() => {
                setCategoryId(category.id);
                setListingTypeId("");
                setTaxonomyAttributes({});
              }}
              style={styles.categoryButton}
            />
          ))}
        </View>
      </View>

      <View style={styles.categoryGroup} accessibilityRole="radiogroup">
        <Text style={styles.label}>Type d’annonce</Text>
        <View style={styles.categoryRow}>
          {listingTypes.map((listingType) => (
            <Button
              key={listingType.id}
              label={
                listingType.intentLabel[activeMarket.defaultLocale] ??
                listingType.intentLabel["fr-FR"]
              }
              variant={
                activeListingTypeId === listingType.id ? "primary" : "secondary"
              }
              onPress={() => {
                setListingTypeId(listingType.id);
                setTaxonomyAttributes({});
              }}
              style={styles.categoryButton}
            />
          ))}
        </View>
      </View>

      <FormField
        label="Titre"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Décrivez précisément l’objet"
      />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
        placeholder="État, dimensions, accessoires, défauts…"
      />
      <FormField
        label={`Prix en ${activeMarket.currencySymbol ?? activeMarket.currency}`}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="0,00"
      />
      <FormField label="Ville" value={city} onChangeText={setCity} />
      <FormField
        label="Code postal"
        value={postalCode}
        onChangeText={setPostalCode}
        keyboardType="number-pad"
        autoComplete="postal-code"
      />

      {schemaState === "loading" ? (
        <Text accessibilityRole="text" style={styles.subtitle}>
          Chargement des caractéristiques…
        </Text>
      ) : null}
      {schemaState === "error" ? (
        <View style={styles.categoryGroup}>
          <Text accessibilityRole="alert" style={styles.error}>
            {schemaError}
          </Text>
          <Button
            label="Réessayer"
            variant="secondary"
            onPress={() => setSchemaRetry((value) => value + 1)}
          />
        </View>
      ) : null}
      {resolvedSchema?.attributes.map((field) => {
        if (NATIVE_MANAGED_FIELDS.has(field.definition.id)) return null;
        const fieldState = resolveTaxonomyFieldState({
          schema: resolvedSchema,
          attributeId: field.definition.id,
          values: taxonomyAttributes,
          sellerType,
        });
        if (!fieldState.visible) return null;
        const resolvedField = fieldState.required
          ? {
              ...field,
              binding: { ...field.binding, required: true },
            }
          : field;
        const controlledField =
          field.definition.id in cascadeOptions
            ? {
                ...resolvedField,
                options: cascadeOptions[field.definition.id] ?? [],
              }
            : resolvedField;
        return (
          <TaxonomyV4Field
            key={field.definition.id}
            field={controlledField}
            locale={activeMarket.defaultLocale}
            value={taxonomyAttributes[field.definition.id]}
            disabled={fieldState.disabled}
            state={
              cascadeState[field.definition.id] ??
              (field.definition.optionSetId && field.options.length === 0
                ? "empty"
                : "ready")
            }
            error="Impossible de charger les options liées."
            onRetry={() => setSchemaRetry((value) => value + 1)}
            onChange={(value) =>
              setTaxonomyAttributes((current) => ({
                ...current,
                [field.definition.id]: value,
              }))
            }
          />
        );
      })}

      {images[0] ? (
        <Image source={{ uri: images[0] }} style={styles.preview} />
      ) : null}
      <Button
        label={
          images.length
            ? `Ajouter une photo (${images.length}/12)`
            : "Choisir une photo"
        }
        onPress={choosePhoto}
        variant="secondary"
      />

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={user ? "Publier l’annonce" : "Se connecter pour publier"}
        onPress={publish}
        loading={publishing}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
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
  label: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  categoryGroup: { gap: spacing.sm },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryButton: { minHeight: nativeSizing.controlTouch },
  preview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  error: {
    color: colors.danger,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
});
