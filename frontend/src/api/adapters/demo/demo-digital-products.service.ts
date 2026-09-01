import type {
  CredentialKind,
  DigitalAccessGrant,
  DigitalAssetProjection,
  DigitalEntitlementProjection,
  DigitalMarketPolicy,
  DigitalPolicyProjection,
  DigitalProvisioningTask,
  DigitalSellerProfile,
  FulfillmentType,
} from "@shongre/contracts/digital-products";
import type {
  ConsumedDigitalAccess,
  DigitalAccessReportType,
  DigitalProductsServiceContract,
  DigitalSecretInput,
} from "../../contracts/digital-products.contract";
import { AppError } from "../../errors/app-error";

const FILE_ASSET_ID = "30000000-0000-4000-8000-000000000001";
const NOW = "2026-09-01T10:00:00.000Z";
const AVAILABLE_UNTIL = "2027-09-01T10:00:00.000Z";

const fileProjection: DigitalAssetProjection = {
  id: FILE_ASSET_ID,
  listingId: "list_digital_file",
  version: 1,
  safeFileName: "guide-installation.pdf",
  contentType: "application/pdf",
  sizeBytes: 2_048_000,
  status: "READY",
  scanStatus: "CLEAN",
  createdAt: "2026-08-30T10:00:00.000Z",
  readyAt: "2026-08-30T10:01:00.000Z",
};

function policy(marketCode: string): DigitalPolicyProjection {
  if (!["FR", "BE", "CH", "SN", "BF"].includes(marketCode)) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Marché numérique introuvable.",
    });
  }
  const enabled = ["FR", "BE", "CH"].includes(marketCode);
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
      allowedClasses: [
        "SOFTWARE_LICENSE",
        "COURSE_ACCESS",
        "SERVICE_ACCESS",
        "INVITATION",
        "REDEMPTION",
      ],
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
    currency: marketCode === "CH" ? "CHF" : "EUR",
    minimumPrice: {
      amountMinor: 100,
      currency: marketCode === "CH" ? "CHF" : "EUR",
    },
    maximumPrice: {
      amountMinor: 100_000,
      currency: marketCode === "CH" ? "CHF" : "EUR",
    },
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

function adminPolicy(marketCode: string): DigitalMarketPolicy {
  const projection = policy(marketCode);
  return {
    ...projection,
    id: "10000000-0000-4000-8000-000000000001",
    externalLinks: {
      allowedSchemes: ["https"],
      acceptedDomains: projection.enabled
        ? ["demo.shongre.test", "example.test"]
        : [],
      allowSubdomains: true,
      allowQuery: true,
      allowFragment: false,
    },
    taxPolicyVersion: projection.enabled ? "deterministic-demo-only" : null,
    refundPolicyVersion: projection.enabled ? "deterministic-demo-only" : null,
    withdrawalPresentationVersion: projection.enabled
      ? "deterministic-demo-only"
      : null,
    paymentProviderConfigurationId: projection.enabled
      ? "deterministic-demo-only"
      : null,
    legalApprovalId: projection.enabled ? "deterministic-demo-only" : null,
    refundAccessBehavior: "REVOKE_ON_REFUND",
    disputeAccessBehavior: "SUSPEND",
    listingRemovalAccessBehavior: "PRESERVE_EXISTING_PURCHASES",
    sellerRestrictionAccessBehavior: "SUSPEND",
    effectiveAt: projection.enabled ? NOW : null,
    approvedAt: projection.enabled ? NOW : null,
  };
}

function item(
  input: Partial<DigitalEntitlementProjection> &
    Pick<
      DigitalEntitlementProjection,
      "id" | "title" | "status" | "paymentStatus" | "primaryFulfillmentType"
    >,
): DigitalEntitlementProjection {
  return {
    id: input.id,
    orderId: input.orderId ?? `demo-order-${input.id.slice(-3)}`,
    orderItemId: input.orderItemId ?? `demo-item-${input.id.slice(-3)}`,
    listingId: input.listingId ?? `demo-listing-${input.id.slice(-3)}`,
    sellerId: "user_camille",
    marketCode: "FR",
    title: input.title,
    fulfillmentTypes: input.fulfillmentTypes ?? [input.primaryFulfillmentType],
    primaryFulfillmentType: input.primaryFulfillmentType,
    productVersion: "2026.09-demo",
    fulfillmentVersion: 1,
    status: input.status,
    paymentStatus: input.paymentStatus,
    price: { amountMinor: 2_900, currency: "EUR" },
    commercialEvidenceId: "demo-catalog-snapshot-v1",
    availableAt: input.availableAt === undefined ? NOW : input.availableAt,
    expiresAt:
      input.expiresAt === undefined ? AVAILABLE_UNTIL : input.expiresAt,
    downloadLimit: input.downloadLimit ?? null,
    downloadsUsed: input.downloadsUsed ?? 0,
    revealLimit: input.revealLimit ?? null,
    revealsUsed: input.revealsUsed ?? 0,
    destinationDomain: input.destinationDomain ?? null,
    files:
      input.files ??
      (input.primaryFulfillmentType === "FILE_DOWNLOAD"
        ? [fileProjection]
        : []),
    maskedSecrets: input.maskedSecrets ?? [],
    provisioningDeadlineAt: input.provisioningDeadlineAt ?? null,
    supportAvailable: true,
    replacementAvailable: input.replacementAvailable ?? false,
    simulated: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const seededEntitlements = [
  item({
    id: "20000000-0000-4000-8000-000000000001",
    title: "Guide PDF — scénario réussi",
    status: "ACCESS_AVAILABLE",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "FILE_DOWNLOAD",
    downloadLimit: 5,
  }),
  item({
    id: "20000000-0000-4000-8000-000000000002",
    title: "Cours externe — lien réutilisable",
    status: "ACCESS_AVAILABLE",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "ACCESS_LINK",
    revealLimit: 3,
    destinationDomain: "demo.shongre.test",
  }),
  item({
    id: "20000000-0000-4000-8000-000000000003",
    title: "Cours avec identifiants",
    status: "ACCESS_AVAILABLE",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "ACCESS_CREDENTIALS",
    fulfillmentTypes: ["ACCESS_LINK", "ACCESS_CREDENTIALS"],
    revealLimit: 3,
    destinationDomain: "demo.shongre.test",
    maskedSecrets: [
      {
        kind: "USERNAME",
        label: "Identifiant",
        maskedValue: "••••••••",
        revealed: false,
      },
      {
        kind: "PASSWORD",
        label: "Mot de passe",
        maskedValue: "••••••••",
        revealed: false,
      },
    ],
  }),
  item({
    id: "20000000-0000-4000-8000-000000000004",
    title: "Licence logicielle unique",
    status: "ACCESS_AVAILABLE",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "ACCESS_CREDENTIALS",
    revealLimit: 1,
    maskedSecrets: [
      {
        kind: "LICENSE_KEY",
        label: "Clé de licence",
        maskedValue: "••••••••",
        revealed: false,
      },
    ],
  }),
  item({
    id: "20000000-0000-4000-8000-000000000005",
    title: "Accès créé par le vendeur",
    status: "PROVISIONING",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "SELLER_PROVISIONED",
    availableAt: null,
    provisioningDeadlineAt: "2026-09-04T10:00:00.000Z",
  }),
  item({
    id: "20000000-0000-4000-8000-000000000006",
    title: "Paiement en confirmation",
    status: "PAYMENT_PENDING",
    paymentStatus: "PENDING",
    primaryFulfillmentType: "FILE_DOWNLOAD",
    availableAt: null,
  }),
  item({
    id: "20000000-0000-4000-8000-000000000007",
    title: "Paiement échoué",
    status: "PAYMENT_FAILED",
    paymentStatus: "FAILED",
    primaryFulfillmentType: "FILE_DOWNLOAD",
    availableAt: null,
  }),
  item({
    id: "20000000-0000-4000-8000-000000000008",
    title: "Fichier en quarantaine",
    status: "QUARANTINED",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "FILE_DOWNLOAD",
    availableAt: null,
    files: [
      {
        ...fileProjection,
        status: "QUARANTINED",
        scanStatus: "FAILED",
        readyAt: null,
      },
    ],
  }),
  item({
    id: "20000000-0000-4000-8000-000000000009",
    title: "Accès signalé invalide",
    status: "INVALID_ACCESS",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "ACCESS_CREDENTIALS",
    availableAt: null,
    replacementAvailable: true,
  }),
  item({
    id: "20000000-0000-4000-8000-000000000010",
    title: "Accès expiré",
    status: "EXPIRED",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "ACCESS_LINK",
    expiresAt: "2026-08-01T10:00:00.000Z",
  }),
  item({
    id: "20000000-0000-4000-8000-000000000011",
    title: "Commande contestée",
    status: "DISPUTED",
    paymentStatus: "DISPUTED",
    primaryFulfillmentType: "ACCESS_LINK",
    availableAt: null,
  }),
  item({
    id: "20000000-0000-4000-8000-000000000012",
    title: "Limite atteinte",
    status: "LIMIT_REACHED",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "FILE_DOWNLOAD",
    downloadLimit: 1,
    downloadsUsed: 1,
  }),
  item({
    id: "20000000-0000-4000-8000-000000000013",
    title: "Téléchargement à réessayer",
    status: "UNAVAILABLE",
    paymentStatus: "CONFIRMED",
    primaryFulfillmentType: "FILE_DOWNLOAD",
    availableAt: null,
  }),
];

export class DemoDigitalProductsService implements DigitalProductsServiceContract {
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
  private readonly assets = new Map([[FILE_ASSET_ID, fileProjection]]);
  private readonly inventory = new Map<
    string,
    { ownerId: string; marketCode: string; count: number }
  >();
  private readonly policyDrafts = new Map<string, DigitalMarketPolicy>();

  async getPolicy(marketCode: string) {
    return policy(marketCode);
  }

  async getSellerProfile(marketCode: string, sellerId: string) {
    return this.profiles.get(`${sellerId}:${marketCode}`) ?? null;
  }

  async acceptSellerResponsibilities(
    marketCode: string,
    sellerId: string,
    fulfillmentTypes: FulfillmentType[],
    acceptedPolicyVersion: number,
  ) {
    const activePolicy = policy(marketCode);
    const digitalTypes = [
      ...new Set(fulfillmentTypes.filter((type) => type !== "PHYSICAL")),
    ];
    const combinationAllowed =
      digitalTypes.length > 0 &&
      activePolicy.allowedFulfillmentCombinations.some(
        (combination) =>
          combination.length === digitalTypes.length &&
          combination.every((type) => digitalTypes.includes(type)),
      );
    if (
      !activePolicy.enabled ||
      activePolicy.version !== acceptedPolicyVersion ||
      !combinationAllowed
    )
      throw new AppError({
        code: "CONFLICT",
        message: "La politique numérique doit être relue.",
      });
    const profile: DigitalSellerProfile = {
      sellerId,
      marketCode,
      policyVersion: acceptedPolicyVersion,
      fulfillmentTypes,
      acceptedAt: NOW,
      status: "ACTIVE",
    };
    this.profiles.set(`${sellerId}:${marketCode}`, profile);
    return profile;
  }

  async initializePrivateUpload(
    marketCode: string,
    input: {
      fileName: string;
      contentType: string;
      sizeBytes: number;
      listingId?: string;
    },
  ) {
    const activePolicy = policy(marketCode);
    const extension =
      input.fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
    if (
      !activePolicy.enabled ||
      !activePolicy.allowedMimeTypes.includes(input.contentType) ||
      !activePolicy.allowedFileExtensions.includes(extension) ||
      input.sizeBytes > activePolicy.maxFileSizeBytes
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Fichier non autorisé.",
      });
    const id = "30000000-0000-4000-8000-000000000099";
    const asset: DigitalAssetProjection = {
      id,
      listingId: input.listingId ?? null,
      version: 1,
      safeFileName: input.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_"),
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      status: "UPLOAD_PENDING",
      scanStatus: "PENDING",
      createdAt: NOW,
      readyAt: null,
    };
    this.assets.set(id, asset);
    return {
      asset,
      signedUploadUrl: `https://demo.shongre.test/simulated-upload/${id}`,
      expiresAt: "2026-09-01T10:10:00.000Z",
    };
  }

  async uploadPrivateFile(
    marketCode: string,
    file: File,
    input: { listingId?: string } = {},
  ) {
    const initialized = await this.initializePrivateUpload(marketCode, {
      ...input,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
    return this.completePrivateUpload(marketCode, initialized.asset.id);
  }

  async completePrivateUpload(_marketCode: string, assetId: string) {
    const asset = await this.getAsset(_marketCode, assetId);
    const ready = {
      ...asset,
      status: "READY" as const,
      scanStatus: "CLEAN" as const,
      readyAt: NOW,
    };
    this.assets.set(assetId, ready);
    return ready;
  }
  async getAsset(_marketCode: string, assetId: string) {
    const asset = this.assets.get(assetId);
    if (!asset)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Fichier introuvable.",
      });
    return asset;
  }
  async removeAsset(_marketCode: string, assetId: string) {
    const asset = await this.getAsset(_marketCode, assetId);
    this.assets.set(assetId, { ...asset, status: "REMOVED" });
  }
  async createProtectedAccess(_marketCode: string, input: DigitalSecretInput) {
    return {
      id: "50000000-0000-4000-8000-000000000001",
      destinationDomain: input.destinationUrl
        ? new URL(input.destinationUrl).hostname
        : null,
      masked: true as const,
    };
  }
  async createCredentialBatch(
    marketCode: string,
    _input: Parameters<
      DigitalProductsServiceContract["createCredentialBatch"]
    >[1],
  ) {
    const id = "60000000-0000-4000-8000-000000000001";
    this.inventory.set(id, { ownerId: "user_camille", marketCode, count: 0 });
    return { id, version: 1 };
  }
  async importCredentialInventory(
    marketCode: string,
    batchId: string,
    input: Parameters<
      DigitalProductsServiceContract["importCredentialInventory"]
    >[2],
  ) {
    const record = this.inventory.get(batchId);
    if (!record || record.marketCode !== marketCode)
      throw new AppError({ code: "NOT_FOUND", message: "Lot introuvable." });
    record.count += input.credentials.length;
    return {
      batchId,
      listingId: null,
      availableCount: record.count,
      reservedCount: 0,
      consumedCount: 0,
      canPurchase: record.count > 0,
    };
  }
  async getCredentialInventory(marketCode: string, batchId: string) {
    const record = this.inventory.get(batchId);
    if (!record || record.marketCode !== marketCode)
      throw new AppError({ code: "NOT_FOUND", message: "Lot introuvable." });
    return {
      batchId,
      listingId: null,
      availableCount: record.count,
      reservedCount: 0,
      consumedCount: 0,
      canPurchase: record.count > 0,
    };
  }
  async createFulfillmentVersion(
    _marketCode: string,
    _listingId: string,
    input: Parameters<
      DigitalProductsServiceContract["createFulfillmentVersion"]
    >[2],
  ) {
    return {
      ...input,
      id: "70000000-0000-4000-8000-000000000001",
      version: 1,
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
    };
  }

  async listSellerProvisioningTasks(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalProvisioningTask[]> {
    const entitlement = seededEntitlements.find((entry) =>
      entry.id.endsWith("005"),
    );
    if (
      !entitlement ||
      sellerId !== entitlement.sellerId ||
      marketCode !== entitlement.marketCode
    )
      return [];
    return [
      {
        id: "90000000-0000-4000-8000-000000000001",
        entitlementId: entitlement.id,
        orderId: entitlement.orderId,
        listingId: entitlement.listingId,
        marketCode,
        title: entitlement.title,
        productVersion: entitlement.productVersion,
        productAccessClass: "SERVICE_ACCESS",
        status: entitlement.status === "PROVISIONING" ? "PENDING" : "COMPLETED",
        deadlineAt:
          entitlement.provisioningDeadlineAt ?? "2026-09-04T10:00:00.000Z",
        attemptCount: 0,
        nextAttemptAt: null,
        completedAt:
          entitlement.status === "PROVISIONING" ? null : entitlement.updatedAt,
        failureCode: null,
        createdAt: entitlement.createdAt,
        updatedAt: entitlement.updatedAt,
      },
    ];
  }

  async listEntitlements(marketCode: string, buyerId: string) {
    return buyerId === "user_thomas"
      ? seededEntitlements.filter((entry) => entry.marketCode === marketCode)
      : [];
  }
  async getEntitlement(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
  ) {
    const found = (await this.listEntitlements(marketCode, buyerId)).find(
      (entry) => entry.id === entitlementId,
    );
    if (!found)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Achat numérique introuvable.",
      });
    return found;
  }

  private async grant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
    action: DigitalAccessGrant["action"],
  ): Promise<DigitalAccessGrant> {
    const entitlement = await this.getEntitlement(
      marketCode,
      buyerId,
      entitlementId,
    );
    if (
      entitlement.paymentStatus !== "CONFIRMED" ||
      !["ACCESS_AVAILABLE", "DELIVERED"].includes(entitlement.status)
    )
      throw new AppError({ code: "CONFLICT", message: "Accès indisponible." });
    const used =
      action === "DOWNLOAD"
        ? entitlement.downloadsUsed
        : entitlement.revealsUsed;
    const limit =
      action === "DOWNLOAD"
        ? entitlement.downloadLimit
        : entitlement.revealLimit;
    if (limit !== null && used >= limit)
      throw new AppError({ code: "CONFLICT", message: "Limite atteinte." });
    const id = `90000000-0000-4000-8000-${entitlementId.slice(-12)}`;
    this.grants.set(id, { buyerId, entitlementId, action, consumed: false });
    return {
      id,
      entitlementId,
      action,
      expiresAt: "2026-09-01T10:05:00.000Z",
      consumePath: `/api/v1/digital/access-grants/${id}/consume`,
      destinationDomain: entitlement.destinationDomain ?? undefined,
    };
  }

  createDownloadGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
    _assetId: string,
  ) {
    return this.grant(marketCode, buyerId, entitlementId, "DOWNLOAD");
  }
  async createRevealGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
  ) {
    const entitlement = await this.getEntitlement(
      marketCode,
      buyerId,
      entitlementId,
    );
    return this.grant(
      marketCode,
      buyerId,
      entitlementId,
      entitlement.primaryFulfillmentType === "ACCESS_LINK"
        ? "OPEN_LINK"
        : "REVEAL_SECRET",
    );
  }

  async consumeAccessGrant(
    buyerId: string,
    grantId: string,
  ): Promise<ConsumedDigitalAccess> {
    const grant = this.grants.get(grantId);
    if (!grant || grant.buyerId !== buyerId || grant.consumed)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Autorisation temporaire expirée.",
      });
    grant.consumed = true;
    if (grant.action === "DOWNLOAD")
      return {
        kind: "DOWNLOAD",
        url: `https://demo.shongre.test/simulated-download/${grantId}`,
        fileName: "guide-installation.pdf",
        expiresAt: "2026-09-01T10:05:00.000Z",
        simulated: true,
      };
    if (grant.action === "OPEN_LINK")
      return {
        kind: "EXTERNAL_LINK",
        entitlementId: grant.entitlementId,
        destinationUrl:
          "https://demo.shongre.test/course/welcome?demo=not-a-secret",
        destinationDomain: "demo.shongre.test",
        fields: [],
        instructions: ["Accès simulé."],
        revealedAt: NOW,
        remainingReveals: 2,
        simulated: true,
      };
    const unique = grant.entitlementId.endsWith("004");
    const fields: Array<{
      kind: CredentialKind;
      label: string;
      value: string;
    }> = unique
      ? [
          {
            kind: "LICENSE_KEY",
            label: "Clé de licence",
            value: "DEMO-LICENSE-NOT-VALID",
          },
        ]
      : [
          { kind: "USERNAME", label: "Identifiant", value: "demo-buyer" },
          { kind: "PASSWORD", label: "Mot de passe", value: "DEMO-NOT-VALID" },
        ];
    return {
      kind: "CREDENTIALS",
      entitlementId: grant.entitlementId,
      destinationUrl: unique ? null : "https://demo.shongre.test/course/login",
      destinationDomain: unique ? null : "demo.shongre.test",
      fields,
      instructions: ["Données simulées sans accès réel."],
      revealedAt: NOW,
      remainingReveals: unique ? 0 : 2,
      simulated: true,
    };
  }

  async submitProvisionedAccess(
    _marketCode: string,
    _entitlementId: string,
    _input: DigitalSecretInput,
  ) {}
  async reportInvalidAccess(
    _marketCode: string,
    buyerId: string,
    entitlementId: string,
    _reportType: DigitalAccessReportType,
    description: string,
  ) {
    if (
      buyerId !== "user_thomas" ||
      !seededEntitlements.some((entry) => entry.id === entitlementId) ||
      description.length < 10 ||
      /https?:\/\//i.test(description)
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Signalement invalide.",
      });
    return {
      id: "80000000-0000-4000-8000-000000000001",
      status: "OPEN" as const,
    };
  }
  async getAdminOverview(marketCode: string) {
    return {
      assets: [...this.assets.values()],
      inventory: [...this.inventory.entries()]
        .filter(([, value]) => value.marketCode === marketCode)
        .map(([batchId, { count }]) => ({
          batchId,
          listingId: null,
          availableCount: count,
          reservedCount: 0,
          consumedCount: 0,
          canPurchase: count > 0,
        })),
      entitlements: seededEntitlements.filter(
        (entry) => entry.marketCode === marketCode,
      ),
      openReportCount: 1,
    };
  }
  async getAdminPolicy(marketCode: string) {
    return (
      [...this.policyDrafts.values()]
        .filter((entry) => entry.marketCode === marketCode)
        .sort((left, right) => right.version - left.version)[0] ??
      adminPolicy(marketCode)
    );
  }
  async createAdminPolicyDraft(
    marketCode: string,
    input: DigitalMarketPolicy,
    _reason: string,
  ) {
    const current = await this.getAdminPolicy(marketCode);
    const id = "10000000-0000-4000-8000-000000000002";
    const draft = {
      ...input,
      id,
      marketCode,
      version: current.version + 1,
      status: "DRAFT" as const,
      enabled: false,
      approvedAt: null,
    };
    this.policyDrafts.set(id, draft);
    return draft;
  }
  async activateAdminPolicy(
    _marketCode: string,
    policyId: string,
    _reason: string,
  ) {
    const existing = this.policyDrafts.get(policyId);
    if (!existing)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Politique introuvable.",
      });
    const active = {
      ...existing,
      status: "ACTIVE" as const,
      enabled: true,
      effectiveAt: existing.effectiveAt ?? NOW,
      approvedAt: NOW,
    };
    this.policyDrafts.set(policyId, active);
    return active;
  }
  async moderateAsset(
    marketCode: string,
    assetId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    const asset = await this.getAsset(marketCode, assetId);
    const updated = {
      ...asset,
      status:
        decision === "APPROVED" ? ("READY" as const) : ("REJECTED" as const),
    };
    this.assets.set(assetId, updated);
    return updated;
  }
  async moderateFulfillmentVersion(
    _marketCode: string,
    _fulfillmentVersionId: string,
    _decision: "APPROVED" | "REJECTED",
  ) {
    return { simulated: true };
  }
  async resolveAccessReport(
    _marketCode: string,
    _reportId: string,
    _input: {
      resolutionCode: string;
      entitlementStatus?: "ACCESS_AVAILABLE" | "REVOKED" | "UNAVAILABLE";
    },
  ) {}
}

export const demoDigitalProductsService = new DemoDigitalProductsService();
