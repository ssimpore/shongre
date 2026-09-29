import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { majorToMinorAmount } from "@shongre/shared/money";
import { useRouter } from "expo-router";
import {
  publicationInputSchema,
  PUBLICATION_CONSTRAINTS,
  toApplicationListingCondition,
  toTaxonomyV1ItemCondition,
} from "@shongre/contracts";
import type {
  TaxonomyV1ResolvedSchema,
  TaxonomyV1TreeResponse,
} from "@shongre/contracts";
import {
  digitalFulfillmentVersionInputSchema,
  type CredentialAllocationMode,
  type DigitalFulfillmentType,
  type DigitalPolicyProjection,
  type DigitalSellerProfile,
} from "@shongre/contracts/digital-products";
import {
  buildTaxonomyOptionRequests,
  mergeTaxonomyOptionPages,
  reconcileTaxonomyValues,
  resolveTaxonomyFieldState,
} from "@shongre/features";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Screen } from "@/components/Screen";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeAspect,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  listingsService,
  type MobilePublicationDraft,
} from "@/features/listings/listings.service";
import { useMarket } from "@/features/market/MarketProvider";
import { permissionsService } from "@/services/permissions/permissions.service";
import { TaxonomyV1Field } from "@/features/taxonomy/TaxonomyV1Field";
import { taxonomyService } from "@/features/taxonomy/taxonomy.service";
import { mobileDigitalProductsService } from "@/features/digital-products/digital-products.service";
import { mobileDigitalDraftStore } from "@/features/digital-products/digital-draft.store";
import { messagesFr } from "@/i18n/messages.fr";

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
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const key = `${user?.id ?? "guest"}:${activeMarket.code}`;
  const [scope, setScope] = useState({ key, changed: false });
  if (scope.key !== key) setScope({ key, changed: true });
  return <PublicationEditor key={key} scopeChanged={scope.changed} />;
}

function PublicationEditor({ scopeChanged }: { scopeChanged: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { activeMarket, marketContext } = useMarket();
  const [treeRetry, setTreeRetry] = useState(0);
  const treeRequestKey = `${activeMarket.code}:${activeMarket.defaultLocale}:${treeRetry}`;
  const [treeResult, setTreeResult] = useState<{
    key: string;
    tree: TaxonomyV1TreeResponse | null;
    error: string;
  }>({ key: "", tree: null, error: "" });
  const taxonomyTree =
    treeResult.key === treeRequestKey ? treeResult.tree : null;
  const treeError = treeResult.key === treeRequestKey ? treeResult.error : "";
  const treeState: "loading" | "ready" | "error" =
    treeResult.key !== treeRequestKey
      ? "loading"
      : treeResult.error
        ? "error"
        : "ready";
  const availableNodes = useMemo(
    () => taxonomyTree?.items ?? [],
    [taxonomyTree],
  );
  const rootCategories = useMemo(
    () => availableNodes.filter((category) => !category.parentId),
    [availableNodes],
  );
  const [categoryId, setCategoryId] = useState("");
  const [rootCategoryId, setRootCategoryId] = useState("");
  const categoryRootId = useMemo(() => {
    if (!categoryId) return "";
    const byId = new Map(availableNodes.map((node) => [node.id, node]));
    let node = byId.get(categoryId);
    while (node?.parentId) node = byId.get(node.parentId);
    return node?.id ?? "";
  }, [availableNodes, categoryId]);
  const selectedRootId = categoryRootId || rootCategoryId;
  const activeRootCategoryId = rootCategories.some(
    (category) => category.id === selectedRootId,
  )
    ? selectedRootId
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
  const [draftHydrated, setDraftHydrated] = useState(!user?.id);
  const [draftStatus, setDraftStatus] = useState<
    "loading" | "ready" | "saving" | "saved" | "error"
  >(user?.id ? "loading" : "ready");
  const [draftRetry, setDraftRetry] = useState(0);
  const [saveRetry, setSaveRetry] = useState(0);
  const restoredDraft = useRef<MobilePublicationDraft | null>(null);
  const savedDraftSignature = useRef("");
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const published = useRef(false);
  const activeCategoryId = publishableCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : (publishableCategories[0]?.id ?? "");
  const sellerType =
    user?.accountType === "professional" ? "professional" : "individual";
  const listingTypes = useMemo(
    () =>
      (taxonomyTree?.listingTypes ?? []).filter(
        (listingType) =>
          listingType.categoryId === activeCategoryId &&
          listingType.status === "active" &&
          (sellerType === "professional"
            ? listingType.sellerEligibility.professionalAllowed
            : listingType.sellerEligibility.individualAllowed),
      ),
    [activeCategoryId, sellerType, taxonomyTree?.listingTypes],
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
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [taxonomyNotice, setTaxonomyNotice] = useState(
    scopeChanged
      ? "Le compte ou le marché a changé. Choisissez la catégorie et renseignez les informations pour ce contexte."
      : "",
  );

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void listingsService
      .getDraft(activeMarket.code)
      .then((saved) => {
        if (!active) return;
        restoredDraft.current = saved;
        if (saved) {
          savedDraftSignature.current = JSON.stringify({
            title: saved.title,
            description: saved.description,
            price: saved.price,
            city: saved.city,
            postalCode: saved.postalCode,
            categoryId: saved.categoryId,
            listingTypeId: saved.listingTypeId,
            attributes: saved.attributes,
            images: saved.images,
          });
          setTitle(saved.title);
          setDescription(saved.description);
          setPrice(saved.price);
          setCity(saved.city);
          setPostalCode(saved.postalCode);
          setCategoryId(saved.categoryId);
          setListingTypeId(saved.listingTypeId);
          setTaxonomyAttributes(saved.attributes);
          setImages(saved.images);
          if (saved.title || saved.description)
            setTaxonomyNotice(
              "Votre brouillon a été récupéré. Vérifiez les photos avant de publier.",
            );
        }
        setDraftHydrated(true);
        setDraftStatus("ready");
      })
      .catch(() => {
        if (active) setDraftStatus("error");
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, draftRetry, user?.id]);

  const [schemaRetry, setSchemaRetry] = useState(0);
  const schemaRequestKey = `${activeMarket.code}:${activeMarket.defaultLocale}:${activeCategoryId}:${activeListingTypeId}:${sellerType}:${schemaRetry}`;
  const [schemaResult, setSchemaResult] = useState<{
    key: string;
    schema: TaxonomyV1ResolvedSchema | null;
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
    void taxonomyService
      .tree({
        marketContext,
        locale: activeMarket.defaultLocale,
      })
      .then((tree) => {
        if (!active) return;
        setTreeResult({ key: treeRequestKey, tree, error: "" });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setTreeResult({
          key: treeRequestKey,
          tree: null,
          error:
            reason instanceof Error
              ? reason.message
              : "Les catégories sont momentanément indisponibles.",
        });
      });
    return () => {
      active = false;
    };
  }, [activeMarket.defaultLocale, marketContext, treeRequestKey, treeRetry]);

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
    let active = true;
    const draftKey = `${user.id}:${activeMarket.code}`;
    restoredDigitalDraftKey.current = "";
    void mobileDigitalDraftStore
      .read(user.id, activeMarket.code)
      .then((draft) => {
        if (!active) return;
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
    return () => {
      active = false;
    };
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
    if (
      !user?.id ||
      !draftHydrated ||
      published.current ||
      treeState !== "ready"
    )
      return;
    if (categoryId && activeCategoryId !== categoryId) return;
    if (listingTypeId && activeListingTypeId !== listingTypeId) return;
    if (
      ![title, description, price, city, postalCode, categoryId].some((value) =>
        value.trim(),
      ) &&
      !images.length
    )
      return;
    const signature = JSON.stringify({
      title,
      description,
      price,
      city,
      postalCode,
      categoryId: activeCategoryId,
      listingTypeId: activeListingTypeId,
      attributes: taxonomyAttributes,
      images,
    });
    if (signature === savedDraftSignature.current) return;
    let active = true;
    setDraftStatus("ready");
    const timer = setTimeout(() => {
      if (published.current) return;
      setDraftStatus("saving");
      const next = saveChain.current
        .catch(() => undefined)
        .then(() =>
          listingsService.saveDraft(activeMarket.code, {
            title,
            description,
            price,
            city,
            postalCode,
            categoryId: activeCategoryId,
            listingTypeId: activeListingTypeId,
            listingIntent: resolvedSchema?.listingType.intent,
            taxonomyRevision: resolvedSchema?.revision,
            attributes: taxonomyAttributes,
            images,
            source: restoredDraft.current?.source ?? {},
          }),
        );
      saveChain.current = next;
      void next
        .then((saved) => {
          if (active && !published.current) {
            restoredDraft.current = saved;
            savedDraftSignature.current = signature;
            setDraftStatus("saved");
          }
        })
        .catch(() => {
          if (active && !published.current) setDraftStatus("error");
        });
    }, 700);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    activeCategoryId,
    activeListingTypeId,
    activeMarket.code,
    categoryId,
    city,
    description,
    draftHydrated,
    images,
    listingTypeId,
    postalCode,
    price,
    resolvedSchema?.listingType.intent,
    resolvedSchema?.revision,
    saveRetry,
    taxonomyAttributes,
    title,
    treeState,
    user?.id,
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
        taxonomyVersion: "v1",
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

  const cascadeRequests = useMemo(
    () => buildTaxonomyOptionRequests(resolvedSchema, taxonomyAttributes),
    [resolvedSchema, taxonomyAttributes],
  );
  const cascadeRequestKey = JSON.stringify([
    resolvedSchema?.revision,
    resolvedSchema?.listingType.id,
    activeMarket.code,
    activeMarket.defaultLocale,
    cascadeRequests,
  ]);
  const [cascadeResult, setCascadeResult] = useState<{
    key: string;
    options: Record<
      string,
      TaxonomyV1ResolvedSchema["attributes"][number]["options"]
    >;
    failed: boolean;
  }>({ key: "", options: {}, failed: false });
  const cascadeOptions = useMemo(
    () => ({
      ...(cascadeResult.key === cascadeRequestKey ? cascadeResult.options : {}),
      ...Object.fromEntries(
        cascadeRequests
          .filter((request) => !request.parentOptionId)
          .map((request) => [request.attributeId, []]),
      ),
    }),
    [cascadeRequestKey, cascadeRequests, cascadeResult],
  );
  const cascadeState = useMemo(
    () =>
      Object.fromEntries(
        cascadeRequests.map((request) => [
          request.attributeId,
          cascadeRequests.some(
            (other) =>
              other.attributeId === request.attributeId &&
              !other.parentOptionId,
          )
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
            taxonomyRevision: resolvedSchema.revision,
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
          options: mergeTaxonomyOptionPages([
            ...results.map(({ request, page }) => ({
              request,
              items: page.items,
            })),
            ...cascadeRequests
              .filter((request) => !request.parentOptionId)
              .map((request) => ({ request, items: [] })),
          ]),
          failed: false,
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

  const dependentOptionsPending = Object.values(cascadeState).some(
    (state) => state === "loading" || state === "error",
  );
  // Adjust values before rendering fields from a completed schema/options response.
  // The equality guard bounds reconciliation to actual selection changes.
  if (resolvedSchema && !dependentOptionsPending) {
    const reconciled = reconcileTaxonomyValues({
      schema: resolvedSchema,
      values: taxonomyAttributes,
      sellerType,
      optionsByAttribute: cascadeOptions,
    });
    if (
      JSON.stringify(reconciled.values) !== JSON.stringify(taxonomyAttributes)
    ) {
      setTaxonomyAttributes(reconciled.values);
      if (reconciled.removed.length)
        setTaxonomyNotice(
          "Certaines caractéristiques ne s’appliquent plus. Vérifiez vos choix avant de publier.",
        );
    }
  }

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
    if (
      treeState !== "ready" ||
      !activeCategoryId ||
      !activeListingTypeId ||
      !resolvedSchema ||
      dependentOptionsPending
    ) {
      setError(
        "Attendez le chargement des catégories et du formulaire avant de publier.",
      );
      return;
    }
    const numericPrice = Number(price.replace(",", "."));
    // The market currency's own exponent: a franc CFA has no centimes.
    const priceMinor = Number.isFinite(numericPrice)
      ? majorToMinorAmount(numericPrice, activeMarket.currency)
      : Number.NaN;
    const acceptedAttributeIds = new Set(
      resolvedSchema?.attributes.map((field) => field.definition.id) ?? [],
    );
    const canonicalCondition = toTaxonomyV1ItemCondition("good");
    const listingIntent = resolvedSchema?.listingType.intent;
    const managedAttributes: Record<string, unknown> = {
      listing_intent: listingIntent?.toLocaleLowerCase("en-US"),
      title,
      description,
      images,
      price: priceMinor,
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
      amountMinor: priceMinor,
      currency: activeMarket.currency,
      categoryId: activeCategoryId,
      listingTypeId: activeListingTypeId,
      listingIntent: resolvedSchema?.listingType.intent,
      taxonomyRevision: resolvedSchema?.revision,
      taxonomyVersion: "v1",
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
      const listing = await listingsService.publish(parsed.data, user);
      published.current = true;
      await saveChain.current.catch(() => undefined);
      let draftCleared = true;
      try {
        await listingsService.saveDraft(activeMarket.code, {
          title: "",
          description: "",
          price: "",
          city: "",
          postalCode: "",
          categoryId: "",
          listingTypeId: "",
          attributes: {},
          images: [],
          source: {},
        });
      } catch {
        draftCleared = false;
      }
      await mobileDigitalDraftStore.clear(user.id, activeMarket.code);
      Alert.alert(
        "Annonce envoyée",
        `Votre annonce est publiée ou en cours de vérification selon les contrôles de sécurité.${draftCleared ? "" : " Votre ancien brouillon n’a pas pu être effacé."}`,
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
        {user ? (
          <Text
            accessibilityLiveRegion="polite"
            style={draftStatus === "error" ? styles.error : styles.subtitle}
          >
            {draftStatus === "loading"
              ? "Chargement de votre brouillon…"
              : draftStatus === "saving"
                ? "Sauvegarde du brouillon…"
                : draftStatus === "saved"
                  ? "Brouillon sauvegardé."
                  : draftStatus === "error"
                    ? "Le brouillon n’a pas pu être chargé ou sauvegardé."
                    : "Votre brouillon est sauvegardé automatiquement."}
          </Text>
        ) : null}
        {user && draftStatus === "error" ? (
          <Button
            label="Réessayer le brouillon"
            variant="secondary"
            onPress={() => {
              if (draftHydrated) setSaveRetry((value) => value + 1);
              else {
                setDraftStatus("loading");
                setDraftRetry((value) => value + 1);
              }
            }}
          />
        ) : null}
      </View>

      {treeState === "loading" ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityLabel="Chargement des catégories"
          style={styles.subtitle}
        >
          Chargement des catégories…
        </Text>
      ) : null}
      {treeState === "error" ? (
        <View style={styles.categoryGroup}>
          <Text accessibilityRole="alert" style={styles.error}>
            {treeError}
          </Text>
          <Button
            label="Réessayer le chargement des catégories"
            variant="secondary"
            onPress={() => setTreeRetry((value) => value + 1)}
          />
        </View>
      ) : null}
      {treeState === "ready" && rootCategories.length === 0 ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Aucune catégorie publiable n’est disponible sur ce marché.
        </Text>
      ) : null}

      <Text accessibilityRole="header" style={styles.sectionHeading}>
        1. Choisir l’annonce
      </Text>
      <View style={styles.categoryGroup} accessibilityRole="radiogroup">
        <Text style={styles.label}>Univers</Text>
        <View style={styles.categoryRow}>
          {rootCategories.map((category) => (
            <Button
              key={category.id}
              label={
                category.labels[activeMarket.defaultLocale] ??
                category.labels["fr-FR"]
              }
              accessibilityRole="radio"
              accessibilityState={{
                checked: activeRootCategoryId === category.id,
              }}
              variant={
                activeRootCategoryId === category.id ? "primary" : "secondary"
              }
              onPress={() => {
                setRootCategoryId(category.id);
                setCategoryId("");
                setListingTypeId("");
                setTaxonomyAttributes({});
                setTaxonomyNotice(
                  "La catégorie a changé. Renseignez les caractéristiques correspondantes.",
                );
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
              label={
                category.labels[activeMarket.defaultLocale] ??
                category.labels["fr-FR"]
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: activeCategoryId === category.id }}
              variant={
                activeCategoryId === category.id ? "primary" : "secondary"
              }
              onPress={() => {
                setCategoryId(category.id);
                setListingTypeId("");
                setTaxonomyAttributes({});
                setTaxonomyNotice(
                  "La catégorie a changé. Renseignez les caractéristiques correspondantes.",
                );
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
              accessibilityRole="radio"
              accessibilityState={{
                checked: activeListingTypeId === listingType.id,
              }}
              variant={
                activeListingTypeId === listingType.id ? "primary" : "secondary"
              }
              onPress={() => {
                setListingTypeId(listingType.id);
                setTaxonomyAttributes({});
                setTaxonomyNotice(
                  "Le type d’annonce a changé. Vérifiez les caractéristiques.",
                );
              }}
              style={styles.categoryButton}
            />
          ))}
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.sectionHeading}>
        2. Décrire et fixer le prix
      </Text>
      <FormField
        label="Titre"
        value={title}
        onChangeText={setTitle}
        maxLength={PUBLICATION_CONSTRAINTS.title.maxLength}
        hint={messagesFr["publication.titleHint"]
          .replace("{count}", String(title.length))
          .replace("{max}", String(PUBLICATION_CONSTRAINTS.title.maxLength))}
        error={
          title.length > PUBLICATION_CONSTRAINTS.title.maxLength
            ? messagesFr["publication.titleTooLong"].replace(
                "{max}",
                String(PUBLICATION_CONSTRAINTS.title.maxLength),
              )
            : undefined
        }
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
              accessibilityRole="radio"
              accessibilityState={{ checked: fulfillmentMode === mode }}
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
              <View style={styles.categoryRow} accessibilityRole="radiogroup">
                {digitalPolicy?.credentialInventory.allowedClasses.map(
                  (value) => (
                    <Button
                      key={value}
                      label={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: accessClass === value }}
                      variant={accessClass === value ? "primary" : "secondary"}
                      onPress={() => setAccessClass(value)}
                    />
                  ),
                )}
              </View>
              {digitalFulfillmentTypes.includes("ACCESS_CREDENTIALS") ? (
                <View style={styles.categoryRow} accessibilityRole="radiogroup">
                  <Button
                    label="Accès réutilisable"
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: credentialAllocationMode === "REUSABLE",
                    }}
                    variant={
                      credentialAllocationMode === "REUSABLE"
                        ? "primary"
                        : "secondary"
                    }
                    onPress={() => setCredentialAllocationMode("REUSABLE")}
                  />
                  <Button
                    label="Clés uniques"
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: credentialAllocationMode === "UNIQUE_INVENTORY",
                    }}
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
              <View style={styles.categoryRow} accessibilityRole="radiogroup">
                {digitalPolicy?.credentialInventory.allowedClasses.map(
                  (value) => (
                    <Button
                      key={value}
                      label={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: accessClass === value }}
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
      <Text accessibilityRole="header" style={styles.sectionHeading}>
        3. Ajouter les détails et photos
      </Text>
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
          <TaxonomyV1Field
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

      {taxonomyNotice ? (
        <Text accessibilityRole="alert" style={styles.subtitle}>
          {taxonomyNotice}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={user ? "Publier l’annonce" : "Se connecter pour publier"}
        onPress={publish}
        loading={publishing}
        disabled={
          publishing ||
          treeState !== "ready" ||
          schemaState !== "ready" ||
          dependentOptionsPending
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  sectionHeading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingSm,
    fontFamily: nativeTypography.fontFamily.bold,
    marginTop: spacing.lg,
  },
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
    width: nativeSizing.full,
    aspectRatio: nativeAspect.video,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  error: {
    color: colors.danger,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
});
