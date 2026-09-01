import type {
  CredentialAllocationMode,
  CredentialKind,
  DigitalAccessGrant,
  DigitalAssetProjection,
  DigitalEntitlementProjection,
  DigitalFulfillmentVersionInput,
  DigitalPolicyProjection,
  DigitalProvisioningTask,
  DigitalSellerProfile,
  FulfillmentType,
} from "@shongre/contracts/digital-products";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export type MobileConsumedDigitalAccess =
  | {
      kind: "DOWNLOAD";
      url: string;
      fileName: string;
      expiresAt: string;
      simulated: boolean;
    }
  | {
      kind: "EXTERNAL_LINK" | "CREDENTIALS";
      entitlementId: string;
      destinationUrl: string | null;
      destinationDomain: string | null;
      fields: { kind: CredentialKind; label: string; value: string }[];
      instructions: string[];
      revealedAt: string;
      remainingReveals: number | null;
      simulated: boolean;
    };

export interface MobilePrivateFile {
  uri: string;
  name: string;
  contentType: string;
  sizeBytes: number;
}

export interface MobileDigitalProductsService {
  getPolicy(marketCode: string): Promise<DigitalPolicyProjection>;
  getSellerProfile(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalSellerProfile | null>;
  acceptSellerResponsibilities(
    marketCode: string,
    sellerId: string,
    types: FulfillmentType[],
    policyVersion: number,
  ): Promise<DigitalSellerProfile>;
  uploadPrivateFile(
    marketCode: string,
    ownerId: string,
    file: MobilePrivateFile,
  ): Promise<DigitalAssetProjection>;
  protectAccess(
    marketCode: string,
    input: {
      productAccessClass: string;
      destinationUrl?: string;
      displayDomain?: string;
      fields?: { kind: CredentialKind; label: string; value: string }[];
      instructions?: string;
    },
  ): Promise<{ id: string; destinationDomain: string | null; masked: true }>;
  importUniqueCredentials(
    marketCode: string,
    productAccessClass: string,
    values: string[],
  ): Promise<{ batchId: string; availableCount: number }>;
  listSellerProvisioningTasks(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalProvisioningTask[]>;
  submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: {
      productAccessClass: string;
      destinationUrl: string;
      fields: { kind: CredentialKind; label: string; value: string }[];
    },
  ): Promise<void>;
  listEntitlements(
    marketCode: string,
    buyerId: string,
  ): Promise<DigitalEntitlementProjection[]>;
  createDownloadGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
    assetId: string,
  ): Promise<DigitalAccessGrant>;
  createRevealGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
  ): Promise<DigitalAccessGrant>;
  consumeGrant(
    buyerId: string,
    grantId: string,
  ): Promise<MobileConsumedDigitalAccess>;
  reportAccess(
    marketCode: string,
    entitlementId: string,
    description: string,
  ): Promise<void>;
}

const NOW = "2026-09-01T10:00:00.000Z";
const UNTIL = "2027-09-01T10:00:00.000Z";
const DEMO_FILE_ID = "31000000-0000-4000-8000-000000000001";
const demoFile: DigitalAssetProjection = {
  id: DEMO_FILE_ID,
  listingId: "list_digital_file",
  version: 1,
  safeFileName: "guide-installation.pdf",
  contentType: "application/pdf",
  sizeBytes: 2_048_000,
  status: "READY",
  scanStatus: "CLEAN",
  createdAt: NOW,
  readyAt: NOW,
};

function demoPolicy(marketCode: string): DigitalPolicyProjection {
  if (!["FR", "BE", "CH", "SN", "BF"].includes(marketCode)) {
    throw new Error("Marché numérique introuvable.");
  }
  const enabled = ["FR", "BE", "CH"].includes(marketCode);
  const currency = marketCode === "CH" ? "CHF" : "EUR";
  return {
    marketCode,
    version: 1,
    status: enabled ? "ACTIVE" : "DISABLED",
    enabled,
    allowedAccountTypes: enabled ? ["individual", "professional"] : [],
    allowedSellerTypes: enabled ? ["individual", "professional"] : [],
    allowedCategoryIds: enabled
      ? [
          "digital_products.downloads.documents",
          "digital_products.downloads.creative_assets",
          "digital_products.access.courses",
          "digital_products.access.software_licenses",
        ]
      : [],
    allowedFulfillmentTypes: enabled
      ? [
          "FILE_DOWNLOAD",
          "ACCESS_LINK",
          "ACCESS_CREDENTIALS",
          "SELLER_PROVISIONED",
        ]
      : [],
    allowedFulfillmentCombinations: enabled
      ? [
          ["FILE_DOWNLOAD"],
          ["ACCESS_LINK"],
          ["ACCESS_CREDENTIALS"],
          ["SELLER_PROVISIONED"],
          ["ACCESS_LINK", "ACCESS_CREDENTIALS"],
        ]
      : [],
    requiredVerificationDimensions: ["email", "identity", "payment", "payout"],
    moderationRequired: true,
    allowedMimeTypes: ["application/pdf", "application/zip", "image/png"],
    allowedFileExtensions: [".pdf", ".zip", ".png"],
    maxFileCount: 10,
    maxFileSizeBytes: 52_428_800,
    maxTotalFileSizeBytes: 209_715_200,
    credentialInventory: {
      reusableAllowed: true,
      uniqueAllowed: true,
      providerGeneratedAllowed: true,
      sellerEnteredAfterPaymentAllowed: true,
      minimumAvailableBeforePurchase: 1,
      allowedKinds: [
        "LICENSE_KEY",
        "ACTIVATION_CODE",
        "USERNAME",
        "PASSWORD",
        "PIN",
        "TOKEN",
        "STRUCTURED_INSTRUCTIONS",
      ],
      allowedClasses: ["SOFTWARE_LICENSE", "COURSE_ACCESS", "SERVICE_ACCESS"],
      prohibitedClasses: [
        "PERSONAL_ACCOUNT",
        "SHARED_THIRD_PARTY_ACCOUNT",
        "PAYMENT_CREDENTIAL",
        "IDENTITY_CREDENTIAL",
        "STOLEN_ACCESS",
        "TERMS_VIOLATING_ACCESS",
      ],
    },
    provisioningDeadlineHours: 72,
    defaultEntitlementDurationDays: 365,
    defaultDownloadLimit: 5,
    defaultRevealLimit: 3,
    currency,
    minimumPrice: { amountMinor: 100, currency },
    maximumPrice: { amountMinor: 100_000, currency },
    capabilities: {
      onboarding: enabled,
      listingDrafts: enabled,
      publication: enabled,
      checkout: enabled,
      fulfillment: enabled,
      nativeCheckout: false,
    },
    requirements: [
      {
        id: "demo.simulated",
        label: { "fr-FR": "Parcours simulé" },
        description: {
          "fr-FR":
            "Les paiements et accès de démonstration sont simulés et n’accordent aucun produit réel.",
        },
      },
    ],
    purchaseUnavailableReasons: enabled ? [] : ["MARKET_DISABLED"],
  };
}

function entitlement(
  index: number,
  status: DigitalEntitlementProjection["status"],
  type: DigitalEntitlementProjection["primaryFulfillmentType"],
  title: string,
  overrides: Partial<DigitalEntitlementProjection> = {},
): DigitalEntitlementProjection {
  const id = `32000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return {
    id,
    orderId: `demo-order-${index}`,
    orderItemId: `demo-item-${index}`,
    listingId: `demo-listing-${index}`,
    sellerId: "user_camille",
    marketCode: "FR",
    title,
    fulfillmentTypes: [type],
    primaryFulfillmentType: type,
    productVersion: "2026.09-demo",
    fulfillmentVersion: 1,
    status,
    paymentStatus:
      status === "PAYMENT_PENDING"
        ? "PENDING"
        : status === "PAYMENT_FAILED"
          ? "FAILED"
          : status === "DISPUTED"
            ? "DISPUTED"
            : status === "REFUNDED"
              ? "REFUNDED"
              : "CONFIRMED",
    price: { amountMinor: 2_900, currency: "EUR" },
    commercialEvidenceId: "demo-catalog-v1",
    availableAt: status === "ACCESS_AVAILABLE" ? NOW : null,
    expiresAt: UNTIL,
    downloadLimit: type === "FILE_DOWNLOAD" ? 5 : null,
    downloadsUsed: 0,
    revealLimit: type === "FILE_DOWNLOAD" ? null : 3,
    revealsUsed: 0,
    destinationDomain: type === "ACCESS_LINK" ? "demo.shongre.test" : null,
    files: type === "FILE_DOWNLOAD" ? [demoFile] : [],
    maskedSecrets:
      type === "ACCESS_CREDENTIALS"
        ? [
            {
              kind: "LICENSE_KEY",
              label: "Clé de licence",
              maskedValue: "••••••••",
              revealed: false,
            },
          ]
        : [],
    provisioningDeadlineAt:
      status === "PROVISIONING" ? "2026-09-04T10:00:00.000Z" : null,
    supportAvailable: true,
    replacementAvailable: status === "INVALID_ACCESS",
    simulated: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const demoEntitlements: DigitalEntitlementProjection[] = [
  entitlement(1, "ACCESS_AVAILABLE", "FILE_DOWNLOAD", "Guide PDF"),
  entitlement(2, "ACCESS_AVAILABLE", "ACCESS_LINK", "Cours externe"),
  entitlement(3, "ACCESS_AVAILABLE", "ACCESS_CREDENTIALS", "Licence unique", {
    fulfillmentTypes: ["ACCESS_LINK", "ACCESS_CREDENTIALS"],
    destinationDomain: "demo.shongre.test",
  }),
  entitlement(4, "PROVISIONING", "SELLER_PROVISIONED", "Accès en préparation"),
  entitlement(
    5,
    "PAYMENT_PENDING",
    "FILE_DOWNLOAD",
    "Paiement en confirmation",
  ),
  entitlement(6, "PAYMENT_FAILED", "FILE_DOWNLOAD", "Paiement échoué"),
  entitlement(7, "QUARANTINED", "FILE_DOWNLOAD", "Fichier en quarantaine"),
  entitlement(8, "INVALID_ACCESS", "ACCESS_CREDENTIALS", "Accès invalide"),
  entitlement(9, "EXPIRED", "ACCESS_LINK", "Accès expiré"),
  entitlement(10, "DISPUTED", "ACCESS_LINK", "Commande contestée"),
  entitlement(11, "LIMIT_REACHED", "FILE_DOWNLOAD", "Limite atteinte", {
    downloadLimit: 1,
    downloadsUsed: 1,
  }),
  entitlement(12, "UNAVAILABLE", "FILE_DOWNLOAD", "Téléchargement à réessayer"),
  entitlement(13, "REFUNDED", "ACCESS_LINK", "Commande remboursée"),
];

export class DemoMobileDigitalProductsService implements MobileDigitalProductsService {
  private readonly entitlements = demoEntitlements.map((item) => ({
    ...item,
    files: item.files.map((file) => ({ ...file })),
    maskedSecrets: item.maskedSecrets.map((field) => ({ ...field })),
  }));
  private readonly profiles = new Map<string, DigitalSellerProfile>();
  private readonly grants = new Map<
    string,
    {
      buyerId: string;
      entitlementId: string;
      action: DigitalAccessGrant["action"];
      consumed: boolean;
    }
  >();

  async getPolicy(marketCode: string) {
    return demoPolicy(marketCode);
  }

  async getSellerProfile(marketCode: string, sellerId: string) {
    return this.profiles.get(`${sellerId}:${marketCode}`) ?? null;
  }

  async acceptSellerResponsibilities(
    marketCode: string,
    sellerId: string,
    fulfillmentTypes: FulfillmentType[],
    policyVersion: number,
  ) {
    const policy = demoPolicy(marketCode);
    const digitalTypes = [
      ...new Set(fulfillmentTypes.filter((type) => type !== "PHYSICAL")),
    ];
    const combinationAllowed =
      digitalTypes.length > 0 &&
      policy.allowedFulfillmentCombinations.some(
        (combination) =>
          combination.length === digitalTypes.length &&
          combination.every((type) => digitalTypes.includes(type)),
      );
    if (
      !policy.enabled ||
      policy.version !== policyVersion ||
      !combinationAllowed
    ) {
      throw new Error("La politique numérique doit être relue.");
    }
    const profile: DigitalSellerProfile = {
      sellerId,
      marketCode,
      policyVersion,
      fulfillmentTypes,
      acceptedAt: NOW,
      status: "ACTIVE",
    };
    this.profiles.set(`${sellerId}:${marketCode}`, profile);
    return profile;
  }

  async uploadPrivateFile(
    marketCode: string,
    _ownerId: string,
    file: MobilePrivateFile,
  ) {
    const policy = demoPolicy(marketCode);
    const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
    if (
      !policy.allowedMimeTypes.includes(file.contentType) ||
      !policy.allowedFileExtensions.includes(extension) ||
      file.sizeBytes > policy.maxFileSizeBytes
    ) {
      throw new Error(
        "Ce fichier n’est pas autorisé par la politique du marché.",
      );
    }
    return {
      ...demoFile,
      id: "31000000-0000-4000-8000-000000000099",
      safeFileName: file.name,
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
    };
  }

  async protectAccess(
    marketCode: string,
    input: Parameters<MobileDigitalProductsService["protectAccess"]>[1],
  ) {
    const policy = demoPolicy(marketCode);
    if (
      !policy.enabled ||
      !policy.credentialInventory.allowedClasses.includes(
        input.productAccessClass,
      )
    ) {
      throw new Error("Cette classe d’accès n’est pas autorisée.");
    }
    let destinationDomain: string | null = null;
    if (input.destinationUrl) {
      const destination = new URL(input.destinationUrl);
      destinationDomain = destination.hostname.toLowerCase().replace(/\.$/, "");
      if (
        destination.protocol !== "https:" ||
        destination.username ||
        destination.password ||
        destinationDomain !== "demo.shongre.test" ||
        (input.displayDomain && input.displayDomain !== destinationDomain)
      ) {
        throw new Error("Cette destination d’accès n’est pas autorisée.");
      }
    }
    return {
      id: "33000000-0000-4000-8000-000000000001",
      destinationDomain,
      masked: true as const,
    };
  }

  async importUniqueCredentials(
    _marketCode: string,
    _productAccessClass: string,
    values: string[],
  ) {
    if (!values.length) throw new Error("Ajoutez au moins un accès unique.");
    return {
      batchId: "34000000-0000-4000-8000-000000000001",
      availableCount: values.length,
    };
  }

  async listEntitlements(marketCode: string, buyerId: string) {
    return buyerId === "user_thomas"
      ? this.entitlements.filter((item) => item.marketCode === marketCode)
      : [];
  }

  async listSellerProvisioningTasks(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalProvisioningTask[]> {
    const item = this.entitlements.find(
      (candidate) => candidate.status === "PROVISIONING",
    );
    if (!item || marketCode !== item.marketCode || sellerId !== item.sellerId)
      return [];
    return [
      {
        id: "36000000-0000-4000-8000-000000000001",
        entitlementId: item.id,
        orderId: item.orderId,
        listingId: item.listingId,
        marketCode,
        title: item.title,
        productVersion: item.productVersion,
        productAccessClass: "SERVICE_ACCESS",
        status: "PENDING",
        deadlineAt: item.provisioningDeadlineAt ?? "2026-09-04T10:00:00.000Z",
        attemptCount: 0,
        nextAttemptAt: null,
        completedAt: null,
        failureCode: null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    ];
  }

  async submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: Parameters<
      MobileDigitalProductsService["submitProvisionedAccess"]
    >[2],
  ) {
    const item = this.entitlements.find(
      (candidate) => candidate.id === entitlementId,
    );
    if (
      !item ||
      item.marketCode !== marketCode ||
      item.paymentStatus !== "CONFIRMED" ||
      item.status !== "PROVISIONING" ||
      input.productAccessClass !== "SERVICE_ACCESS"
    ) {
      throw new Error("Cette remise n’est pas disponible.");
    }
    await this.protectAccess(marketCode, input);
    item.status = "ACCESS_AVAILABLE";
    item.availableAt = NOW;
    item.updatedAt = NOW;
  }

  private async grant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
    action: DigitalAccessGrant["action"],
  ) {
    const item = this.entitlements.find(
      (candidate) =>
        buyerId === "user_thomas" &&
        candidate.id === entitlementId &&
        candidate.marketCode === marketCode,
    );
    if (
      !item ||
      item.paymentStatus !== "CONFIRMED" ||
      !["ACCESS_AVAILABLE", "DELIVERED"].includes(item.status)
    ) {
      throw new Error("Cet accès n’est pas disponible.");
    }
    const id = `35000000-0000-4000-8000-${entitlementId.slice(-12)}`;
    this.grants.set(id, { buyerId, entitlementId, action, consumed: false });
    return {
      id,
      entitlementId,
      action,
      expiresAt: "2026-09-01T10:05:00.000Z",
      consumePath: `/api/v1/digital/access-grants/${id}/consume` as const,
      destinationDomain: item.destinationDomain ?? undefined,
    };
  }

  createDownloadGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
    _assetId: string,
  ) {
    const item = this.entitlements.find(
      (candidate) => candidate.id === entitlementId,
    );
    if (!item?.files.some((file) => file.id === _assetId)) {
      return Promise.reject(
        new Error("Ce fichier n’appartient pas à cet achat."),
      );
    }
    return this.grant(marketCode, buyerId, entitlementId, "DOWNLOAD");
  }

  createRevealGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
  ) {
    const item = this.entitlements.find(
      (candidate) => candidate.id === entitlementId,
    );
    return this.grant(
      marketCode,
      buyerId,
      entitlementId,
      item?.primaryFulfillmentType === "ACCESS_LINK"
        ? "OPEN_LINK"
        : "REVEAL_SECRET",
    );
  }

  async consumeGrant(
    buyerId: string,
    grantId: string,
  ): Promise<MobileConsumedDigitalAccess> {
    const grant = this.grants.get(grantId);
    if (!grant || grant.buyerId !== buyerId || grant.consumed) {
      throw new Error("Cette autorisation a expiré.");
    }
    grant.consumed = true;
    if (grant.action === "DOWNLOAD") {
      return {
        kind: "DOWNLOAD",
        url: "https://demo.shongre.test/simulated-download",
        fileName: "guide-installation.pdf",
        expiresAt: "2026-09-01T10:05:00.000Z",
        simulated: true,
      };
    }
    if (grant.action === "OPEN_LINK") {
      return {
        kind: "EXTERNAL_LINK",
        entitlementId: grant.entitlementId,
        destinationUrl: "https://demo.shongre.test/course/welcome",
        destinationDomain: "demo.shongre.test",
        fields: [],
        instructions: ["Accès simulé."],
        revealedAt: NOW,
        remainingReveals: 2,
        simulated: true,
      };
    }
    const item = this.entitlements.find(
      (candidate) => candidate.id === grant.entitlementId,
    );
    return {
      kind: "CREDENTIALS",
      entitlementId: grant.entitlementId,
      destinationUrl: item?.fulfillmentTypes.includes("ACCESS_LINK")
        ? "https://demo.shongre.test/license/activate"
        : null,
      destinationDomain: item?.fulfillmentTypes.includes("ACCESS_LINK")
        ? "demo.shongre.test"
        : null,
      fields: [
        {
          kind: "LICENSE_KEY",
          label: "Clé de licence",
          value: "DEMO-LICENSE-NOT-VALID",
        },
      ],
      instructions: ["Donnée simulée sans accès réel."],
      revealedAt: NOW,
      remainingReveals: 0,
      simulated: true,
    };
  }

  async reportAccess(
    _marketCode: string,
    entitlementId: string,
    description: string,
  ) {
    if (
      !this.entitlements.some((item) => item.id === entitlementId) ||
      description.trim().length < 10 ||
      /https?:\/\//i.test(description)
    ) {
      throw new Error("Décrivez le problème sans inclure de secret.");
    }
  }
}

export class HttpMobileDigitalProductsService implements MobileDigitalProductsService {
  getPolicy(marketCode: string) {
    return apiRequest<DigitalPolicyProjection>(
      "/digital/policy",
      {},
      marketCode,
    );
  }

  getSellerProfile(marketCode: string, _sellerId: string) {
    return apiRequest<DigitalSellerProfile | null>(
      "/digital/seller-profile",
      {},
      marketCode,
    );
  }

  acceptSellerResponsibilities(
    marketCode: string,
    _sellerId: string,
    fulfillmentTypes: FulfillmentType[],
    acceptedPolicyVersion: number,
  ) {
    return apiRequest<DigitalSellerProfile>(
      "/digital/seller-profile",
      {
        method: "PUT",
        body: JSON.stringify({ fulfillmentTypes, acceptedPolicyVersion }),
      },
      marketCode,
    );
  }

  async uploadPrivateFile(
    marketCode: string,
    _ownerId: string,
    file: MobilePrivateFile,
  ) {
    const initialized = await apiRequest<{
      asset: DigitalAssetProjection;
      signedUploadUrl: string;
      expiresAt: string;
    }>(
      "/digital/assets/uploads",
      {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
        }),
      },
      marketCode,
    );
    const uploadUrl = new URL(initialized.signedUploadUrl);
    if (
      uploadUrl.protocol !== "https:" ||
      uploadUrl.username ||
      uploadUrl.password
    ) {
      throw new Error("private_upload_destination_invalid");
    }
    const source = await fetch(file.uri);
    const body = await source.blob();
    const uploaded = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.contentType },
      body,
      credentials: "omit",
      redirect: "error",
    });
    if (!uploaded.ok) throw new Error("Le téléversement privé a échoué.");
    return apiRequest<DigitalAssetProjection>(
      `/digital/assets/uploads/${initialized.asset.id}/complete`,
      { method: "POST" },
      marketCode,
    );
  }

  protectAccess(
    marketCode: string,
    input: Parameters<MobileDigitalProductsService["protectAccess"]>[1],
  ) {
    return apiRequest<{
      id: string;
      destinationDomain: string | null;
      masked: true;
    }>(
      "/digital/access-secrets",
      { method: "POST", body: JSON.stringify(input) },
      marketCode,
    );
  }

  async importUniqueCredentials(
    marketCode: string,
    productAccessClass: string,
    values: string[],
  ) {
    const kinds: CredentialKind[] = ["LICENSE_KEY"];
    const allocationMode: CredentialAllocationMode = "UNIQUE_INVENTORY";
    const batch = await apiRequest<{ id: string; version: number }>(
      "/digital/credential-batches",
      {
        method: "POST",
        body: JSON.stringify({
          productAccessClass,
          allocationMode,
          credentialKinds: kinds,
        }),
      },
      marketCode,
    );
    const inventory = await apiRequest<{ availableCount: number }>(
      `/digital/credential-batches/${batch.id}/credentials`,
      {
        method: "POST",
        body: JSON.stringify({
          productAccessClass,
          credentials: values.map((value) => ({
            fields: [{ kind: "LICENSE_KEY", label: "Clé de licence", value }],
          })),
        }),
      },
      marketCode,
    );
    return { batchId: batch.id, availableCount: inventory.availableCount };
  }

  async listEntitlements(marketCode: string, _buyerId: string) {
    const result = await apiRequest<{ items: DigitalEntitlementProjection[] }>(
      "/digital/entitlements",
      {},
      marketCode,
    );
    return result.items;
  }

  async listSellerProvisioningTasks(marketCode: string, _sellerId: string) {
    const result = await apiRequest<{ items: DigitalProvisioningTask[] }>(
      "/digital/seller/provisioning-tasks",
      {},
      marketCode,
    );
    return result.items;
  }

  async submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: Parameters<
      MobileDigitalProductsService["submitProvisionedAccess"]
    >[2],
  ) {
    await apiRequest(
      `/digital/entitlements/${entitlementId}/provision`,
      { method: "POST", body: JSON.stringify(input) },
      marketCode,
    );
  }

  createDownloadGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
    assetId: string,
  ) {
    return apiRequest<DigitalAccessGrant>(
      `/digital/entitlements/${entitlementId}/download-grants`,
      { method: "POST", body: JSON.stringify({ assetId }) },
      marketCode,
    );
  }

  createRevealGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
  ) {
    return apiRequest<DigitalAccessGrant>(
      `/digital/entitlements/${entitlementId}/reveal-grants`,
      { method: "POST" },
      marketCode,
    );
  }

  consumeGrant(_buyerId: string, grantId: string) {
    return apiRequest<MobileConsumedDigitalAccess>(
      `/digital/access-grants/${grantId}/consume`,
      { method: "POST" },
    );
  }

  async reportAccess(
    marketCode: string,
    entitlementId: string,
    description: string,
  ) {
    await apiRequest(
      `/digital/entitlements/${entitlementId}/reports`,
      {
        method: "POST",
        body: JSON.stringify({
          reportType: "INVALID_CREDENTIALS",
          description,
        }),
      },
      marketCode,
    );
  }
}

export const mobileDigitalProductsService: MobileDigitalProductsService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoMobileDigitalProductsService()
    : new HttpMobileDigitalProductsService();

export type { DigitalFulfillmentVersionInput };
