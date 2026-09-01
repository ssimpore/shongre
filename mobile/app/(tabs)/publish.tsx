import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import {
  publicationInputSchema,
  toApplicationListingCondition,
  toTaxonomyV4ItemCondition,
} from "@shongre/contracts";
import type { TaxonomyV4ResolvedSchema } from "@shongre/contracts";
import {
  digitalFulfillmentVersionInputSchema,
  type CredentialAllocationMode,
  type DigitalFulfillmentType,
  type DigitalPolicyProjection,
  type DigitalSellerProfile,
} from "@shongre/contracts/digital-products";
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
import { mobileDigitalProductsService } from "@/features/digital-products/digital-products.service";
import { mobileDigitalDraftStore } from "@/features/digital-products/digital-draft.store";

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
  const [loadedDigitalContext, setLoadedDigitalContext] = useState<{
    scope: string;
    policy: DigitalPolicyProjection;
    profile: DigitalSellerProfile | null;
  } | null>(null);
  const [fulfillmentMode, setFulfillmentMode] = useState<
    "PHYSICAL" | DigitalFulfillmentType | "LINK_AND_CREDENTIALS"
  >("PHYSICAL");
  const [productVersion, setProductVersion] = useState("");
  const [buyerFacingDescription, setBuyerFacingDescription] = useState("");
  const [compatibility, setCompatibility] = useState("");
  const [requirements, setRequirements] = useState("");
  const [provisioningHours, setProvisioningHours] = useState("72");
  const [privateAssetIds, setPrivateAssetIds] = useState<string[]>([]);
  const [privateAssetStatus, setPrivateAssetStatus] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [destinationDomain, setDestinationDomain] = useState("");
  const [accessUsername, setAccessUsername] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [privateInstructions, setPrivateInstructions] = useState("");
  const [accessSecretId, setAccessSecretId] = useState<string>();
  const [credentialAllocationMode, setCredentialAllocationMode] =
    useState<CredentialAllocationMode>("REUSABLE");
  const [uniqueCredentials, setUniqueCredentials] = useState("");
  const [credentialBatchIds, setCredentialBatchIds] = useState<string[]>([]);
  const [protectedCredentialKinds, setProtectedCredentialKinds] = useState<
    ("USERNAME" | "PASSWORD")[]
  >([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [accessClass, setAccessClass] = useState("");
  const [digitalOperation, setDigitalOperation] = useState("");
  const restoredDigitalDraftKey = useRef("");
  const digitalContextScope = user
    ? `${user.id}:${activeMarket.code}`
    : "unauthenticated";
  const digitalPolicy =
    loadedDigitalContext?.scope === digitalContextScope
      ? loadedDigitalContext.policy
      : null;
  const digitalProfile =
    loadedDigitalContext?.scope === digitalContextScope
      ? loadedDigitalContext.profile
      : null;

  const digitalFulfillmentTypes: DigitalFulfillmentType[] =
    fulfillmentMode === "PHYSICAL"
      ? []
      : fulfillmentMode === "LINK_AND_CREDENTIALS"
        ? ["ACCESS_LINK", "ACCESS_CREDENTIALS"]
        : [fulfillmentMode];
  const isDigital = digitalFulfillmentTypes.length > 0;

  useEffect(() => {
    let active = true;
    if (!user) return;
    const scope = `${user.id}:${activeMarket.code}`;
    void Promise.all([
      mobileDigitalProductsService.getPolicy(activeMarket.code),
      mobileDigitalProductsService.getSellerProfile(activeMarket.code, user.id),
    ])
      .then(([policy, profile]) => {
        if (!active) return;
        setLoadedDigitalContext({ scope, policy, profile });
        setAccessClass(
          (current) =>
            current || policy.credentialInventory.allowedClasses[0] || "",
        );
      })
      .catch(() => {
        if (!active) return;
        setLoadedDigitalContext(null);
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, user]);

  useEffect(() => {
    if (!user) return;
    const draftKey = `${user.id}:${activeMarket.code}`;
    restoredDigitalDraftKey.current = "";
    void mobileDigitalDraftStore
      .read(user.id, activeMarket.code)
      .then((draft) => {
        if (draft) {
          setFulfillmentMode(draft.fulfillmentMode);
          setProductVersion(draft.productVersion);
          setBuyerFacingDescription(draft.buyerFacingDescription);
          setCompatibility(draft.compatibility);
          setRequirements(draft.requirements);
          setProvisioningHours(draft.provisioningHours);
          setPrivateAssetIds(draft.privateAssetIds);
          setAccessSecretId(draft.accessSecretId);
          setCredentialAllocationMode(draft.credentialAllocationMode);
          setCredentialBatchIds(draft.credentialBatchIds);
          setInventoryCount(draft.inventoryCount);
          setAccessClass(draft.accessClass);
          setProtectedCredentialKinds(draft.protectedCredentialKinds);
        }
        restoredDigitalDraftKey.current = draftKey;
      });
  }, [activeMarket.code, user]);

  useEffect(() => {
    if (!user) return;
    const draftKey = `${user.id}:${activeMarket.code}`;
    if (restoredDigitalDraftKey.current !== draftKey) return;
    void mobileDigitalDraftStore.write(user.id, activeMarket.code, {
      fulfillmentMode,
      productVersion,
      buyerFacingDescription,
      compatibility,
      requirements,
      provisioningHours,
      privateAssetIds,
      accessSecretId,
      credentialAllocationMode,
      credentialBatchIds,
      inventoryCount,
      accessClass,
      protectedCredentialKinds,
    });
  }, [
    accessClass,
    accessSecretId,
    activeMarket.code,
    buyerFacingDescription,
    compatibility,
    credentialAllocationMode,
    credentialBatchIds,
    fulfillmentMode,
    inventoryCount,
    privateAssetIds,
    productVersion,
    protectedCredentialKinds,
    provisioningHours,
    requirements,
    user,
  ]);

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

  const choosePrivateFile = async () => {
    if (!user || !digitalPolicy || !digitalProfile) {
      setError("Acceptez d’abord les responsabilités de vente numérique.");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: false,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setDigitalOperation("file");
    setPrivateAssetStatus("Téléversement et contrôles en cours…");
    try {
      const asset = await mobileDigitalProductsService.uploadPrivateFile(
        activeMarket.code,
        user.id,
        {
          uri: file.uri,
          name: file.name,
          contentType: file.mimeType || "application/octet-stream",
          sizeBytes: file.size || 0,
        },
      );
      setPrivateAssetIds((current) => [...current, asset.id]);
      setPrivateAssetStatus(
        asset.status === "READY"
          ? "Fichier privé prêt"
          : "Fichier en cours de traitement ou de modération",
      );
    } catch {
      setPrivateAssetStatus("Fichier rejeté ou téléversement interrompu.");
    } finally {
      setDigitalOperation("");
    }
  };

  const protectReusableAccess = async () => {
    if (!accessClass) {
      setError("Sélectionnez une classe d’accès autorisée.");
      return;
    }
    if (
      digitalFulfillmentTypes.includes("ACCESS_LINK") &&
      !destinationUrl.trim()
    ) {
      setError("Un lien HTTPS est requis pour ce mode de remise.");
      return;
    }
    if (
      digitalFulfillmentTypes.includes("ACCESS_CREDENTIALS") &&
      credentialAllocationMode === "REUSABLE" &&
      !accessUsername.trim() &&
      !accessPassword
    ) {
      setError("Ajoutez au moins un identifiant, mot de passe, code ou clé.");
      return;
    }
    const fields = [
      ...(accessUsername.trim()
        ? [
            {
              kind: "USERNAME" as const,
              label: "Identifiant",
              value: accessUsername,
            },
          ]
        : []),
      ...(accessPassword
        ? [
            {
              kind: "PASSWORD" as const,
              label: "Mot de passe, code ou clé",
              value: accessPassword,
            },
          ]
        : []),
    ];
    setDigitalOperation("access");
    try {
      const protectedAccess = await mobileDigitalProductsService.protectAccess(
        activeMarket.code,
        {
          productAccessClass: accessClass,
          destinationUrl: destinationUrl.trim() || undefined,
          displayDomain: destinationDomain.trim() || undefined,
          fields,
          instructions: privateInstructions.trim() || undefined,
        },
      );
      setAccessSecretId(protectedAccess.id);
      setProtectedCredentialKinds(fields.map((field) => field.kind));
      setAccessUsername("");
      setAccessPassword("");
      setPrivateInstructions("");
      setDestinationUrl("");
      setDestinationDomain(protectedAccess.destinationDomain ?? "");
    } catch {
      setError(
        "Le lien ou les accès ne respectent pas la politique du marché.",
      );
    } finally {
      setDigitalOperation("");
    }
  };

  const importInventory = async () => {
    if (!accessClass) return;
    const values = uniqueCredentials
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    setDigitalOperation("inventory");
    try {
      const result = await mobileDigitalProductsService.importUniqueCredentials(
        activeMarket.code,
        accessClass,
        values,
      );
      setCredentialBatchIds((current) => [...current, result.batchId]);
      setInventoryCount(result.availableCount);
      setUniqueCredentials("");
    } catch {
      setError("L’inventaire n’a pas pu être chiffré et importé.");
    } finally {
      setDigitalOperation("");
    }
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
    if (isDigital) {
      if (
        !digitalPolicy?.enabled ||
        !digitalPolicy.capabilities.publication ||
        !digitalPolicy.allowedCategoryIds.includes(activeCategoryId)
      ) {
        setError(
          "La publication numérique n’est pas autorisée pour cette catégorie et ce marché.",
        );
        return;
      }
      if (
        !digitalProfile ||
        digitalProfile.policyVersion !== digitalPolicy.version ||
        digitalFulfillmentTypes.some(
          (type) => !digitalProfile.fulfillmentTypes.includes(type),
        )
      ) {
        setError(
          "Le profil vendeur numérique doit être complété ou mis à jour.",
        );
        return;
      }
    }
    const digitalFulfillment = isDigital
      ? digitalFulfillmentVersionInputSchema.safeParse({
          fulfillmentTypes: digitalFulfillmentTypes,
          primaryFulfillmentType: digitalFulfillmentTypes[0],
          productVersion,
          buyerFacingDescription,
          productAccessClass: digitalFulfillmentTypes.some(
            (type) => type !== "FILE_DOWNLOAD",
          )
            ? accessClass
            : undefined,
          compatibility: compatibility
            .split(/\r?\n/)
            .map((value) => value.trim())
            .filter(Boolean),
          requirements: requirements
            .split(/\r?\n/)
            .map((value) => value.trim())
            .filter(Boolean),
          privateAssetVersionIds: privateAssetIds,
          accessSecretVersionId: accessSecretId,
          credentialBatchIds,
          credentialAllocationMode: digitalFulfillmentTypes.includes(
            "ACCESS_CREDENTIALS",
          )
            ? credentialAllocationMode
            : undefined,
          credentialKinds: digitalFulfillmentTypes.includes(
            "ACCESS_CREDENTIALS",
          )
            ? credentialAllocationMode === "UNIQUE_INVENTORY"
              ? ["LICENSE_KEY"]
              : protectedCredentialKinds
            : [],
          provisioningTimeHours: digitalFulfillmentTypes.includes(
            "SELLER_PROVISIONED",
          )
            ? Number(provisioningHours)
            : undefined,
          entitlementDurationDays:
            digitalPolicy?.defaultEntitlementDurationDays,
          downloadLimit: digitalFulfillmentTypes.includes("FILE_DOWNLOAD")
            ? digitalPolicy?.defaultDownloadLimit
            : undefined,
          revealLimit: digitalFulfillmentTypes.some(
            (type) => type === "ACCESS_LINK" || type === "ACCESS_CREDENTIALS",
          )
            ? digitalPolicy?.defaultRevealLimit
            : undefined,
        })
      : null;
    if (digitalFulfillment && !digitalFulfillment.success) {
      setError(
        digitalFulfillment.error.issues[0]?.message ||
          "Vérifiez la remise numérique.",
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
      city: isDigital ? "" : city,
      postalCode: isDigital ? "" : postalCode,
      condition: toApplicationListingCondition(resolvedAttributes, "good"),
      images,
      digitalFulfillment: digitalFulfillment?.data,
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
      await mobileDigitalDraftStore.clear(user.id, activeMarket.code);
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

      <View style={styles.categoryGroup} accessibilityRole="radiogroup">
        <Text style={styles.label}>Mode de remise</Text>
        <Text style={styles.subtitle}>
          Le mode de remise est explicite et indépendant de la catégorie.
        </Text>
        <View style={styles.categoryRow}>
          {[
            ["PHYSICAL", "Produit physique"],
            ["FILE_DOWNLOAD", "Fichier privé"],
            ["ACCESS_LINK", "Lien d’accès"],
            ["ACCESS_CREDENTIALS", "Accès avec identifiants"],
            ["SELLER_PROVISIONED", "Accès préparé après paiement"],
            ["LINK_AND_CREDENTIALS", "Lien et identifiants"],
          ].map(([mode, label]) => (
            <Button
              key={mode}
              label={label}
              variant={fulfillmentMode === mode ? "primary" : "secondary"}
              onPress={() => setFulfillmentMode(mode as typeof fulfillmentMode)}
              style={styles.categoryButton}
            />
          ))}
        </View>
      </View>

      {!isDigital ? (
        <>
          <FormField label="Ville" value={city} onChangeText={setCity} />
          <FormField
            label="Code postal"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="number-pad"
            autoComplete="postal-code"
          />
        </>
      ) : (
        <View style={styles.digitalPanel}>
          <Text style={styles.label}>
            Produit numérique — aucune livraison physique
          </Text>
          {!digitalPolicy?.enabled ? (
            <Text accessibilityRole="alert" style={styles.error}>
              La vente numérique est désactivée tant que les décisions requises
              pour ce marché ne sont pas approuvées.
            </Text>
          ) : null}
          {!digitalProfile ||
          digitalProfile.policyVersion !== digitalPolicy?.version ? (
            <Button
              label="Configurer mes responsabilités vendeur"
              variant="secondary"
              onPress={() => router.push("/account/digital-selling" as never)}
            />
          ) : null}
          <FormField
            label="Version du produit"
            value={productVersion}
            onChangeText={setProductVersion}
            maxLength={120}
          />
          <FormField
            label="Ce que l’acheteur recevra"
            value={buyerFacingDescription}
            onChangeText={setBuyerFacingDescription}
            multiline
            maxLength={2000}
          />
          <FormField
            label="Compatibilité, une valeur par ligne"
            value={compatibility}
            onChangeText={setCompatibility}
            multiline
          />
          <FormField
            label="Prérequis, une valeur par ligne"
            value={requirements}
            onChangeText={setRequirements}
            multiline
          />

          {digitalFulfillmentTypes.includes("FILE_DOWNLOAD") ? (
            <View style={styles.categoryGroup}>
              <Button
                label={
                  digitalOperation === "file"
                    ? "Téléversement et contrôles…"
                    : "Choisir un fichier privé"
                }
                variant="secondary"
                disabled={digitalOperation !== ""}
                onPress={() => void choosePrivateFile()}
              />
              {privateAssetStatus ? (
                <Text accessibilityRole="text" style={styles.subtitle}>
                  {privateAssetStatus}
                </Text>
              ) : null}
            </View>
          ) : null}

          {digitalFulfillmentTypes.some(
            (type) => type === "ACCESS_LINK" || type === "ACCESS_CREDENTIALS",
          ) ? (
            <View style={styles.categoryGroup}>
              <Text style={styles.label}>Accès privé chiffré</Text>
              <View style={styles.categoryRow}>
                {digitalPolicy?.credentialInventory.allowedClasses.map(
                  (value) => (
                    <Button
                      key={value}
                      label={value}
                      variant={accessClass === value ? "primary" : "secondary"}
                      onPress={() => setAccessClass(value)}
                    />
                  ),
                )}
              </View>
              {digitalFulfillmentTypes.includes("ACCESS_CREDENTIALS") ? (
                <View style={styles.categoryRow}>
                  <Button
                    label="Accès réutilisable"
                    variant={
                      credentialAllocationMode === "REUSABLE"
                        ? "primary"
                        : "secondary"
                    }
                    onPress={() => setCredentialAllocationMode("REUSABLE")}
                  />
                  <Button
                    label="Clés uniques"
                    variant={
                      credentialAllocationMode === "UNIQUE_INVENTORY"
                        ? "primary"
                        : "secondary"
                    }
                    onPress={() =>
                      setCredentialAllocationMode("UNIQUE_INVENTORY")
                    }
                  />
                </View>
              ) : null}
              {digitalFulfillmentTypes.includes("ACCESS_LINK") ||
              credentialAllocationMode === "REUSABLE" ? (
                <>
                  <FormField
                    label="Lien secret HTTPS"
                    value={destinationUrl}
                    onChangeText={setDestinationUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <FormField
                    label="Domaine affiché"
                    value={destinationDomain}
                    onChangeText={setDestinationDomain}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {digitalFulfillmentTypes.includes("ACCESS_CREDENTIALS") &&
                  credentialAllocationMode === "REUSABLE" ? (
                    <>
                      <FormField
                        label="Identifiant"
                        value={accessUsername}
                        onChangeText={setAccessUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <FormField
                        label="Mot de passe, code ou clé"
                        value={accessPassword}
                        onChangeText={setAccessPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </>
                  ) : null}
                  <FormField
                    label="Instructions privées"
                    value={privateInstructions}
                    onChangeText={setPrivateInstructions}
                    multiline
                  />
                  <Button
                    label={
                      accessSecretId
                        ? "Accès chiffré et masqué"
                        : "Valider et protéger l’accès"
                    }
                    disabled={digitalOperation !== ""}
                    loading={digitalOperation === "access"}
                    onPress={() => void protectReusableAccess()}
                  />
                </>
              ) : null}
              {digitalFulfillmentTypes.includes("ACCESS_CREDENTIALS") &&
              credentialAllocationMode === "UNIQUE_INVENTORY" ? (
                <>
                  <FormField
                    label="Clés uniques, une par ligne"
                    value={uniqueCredentials}
                    onChangeText={setUniqueCredentials}
                    multiline
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    label={
                      inventoryCount
                        ? `${inventoryCount} accès uniques disponibles`
                        : "Chiffrer et importer l’inventaire"
                    }
                    disabled={
                      digitalOperation !== "" || !uniqueCredentials.trim()
                    }
                    loading={digitalOperation === "inventory"}
                    onPress={() => void importInventory()}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          {digitalFulfillmentTypes.includes("SELLER_PROVISIONED") ? (
            <View style={styles.categoryGroup}>
              <Text style={styles.label}>Classe d’accès autorisée</Text>
              <View style={styles.categoryRow}>
                {digitalPolicy?.credentialInventory.allowedClasses.map(
                  (value) => (
                    <Button
                      key={value}
                      label={value}
                      variant={accessClass === value ? "primary" : "secondary"}
                      onPress={() => setAccessClass(value)}
                    />
                  ),
                )}
              </View>
              <FormField
                label="Délai de préparation en heures"
                value={provisioningHours}
                onChangeText={setProvisioningHours}
                keyboardType="number-pad"
              />
            </View>
          ) : null}
          <Text style={styles.subtitle}>
            L’achat numérique n’est pas activé dans l’application native. Le
            paiement et l’accès restent disponibles sur le Web lorsque la
            politique du marché l’autorise.
          </Text>
        </View>
      )}

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
        <Image
          source={{ uri: images[0] }}
          style={styles.preview}
          accessibilityLabel="Aperçu de la première photo sélectionnée"
          accessibilityIgnoresInvertColors
        />
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
  digitalPanel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
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
