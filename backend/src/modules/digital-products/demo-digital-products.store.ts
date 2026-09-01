import { randomUUID } from "node:crypto";
import type {
  DigitalAssetProjection,
  DigitalEntitlementProjection,
  DigitalFulfillmentVersionInput,
  DigitalMarketPolicy,
  DigitalProvisioningTask,
  DigitalSellerProfile,
} from "@shongre/contracts/digital-products";
import { AppError } from "../../shared/errors/app-error.js";
import {
  encryptDigitalSecret,
  maskDigitalSecret,
  type DigitalSecretEnvelope,
  type DigitalSecretPayload,
} from "./digital-secret-envelope.js";
import type {
  DigitalAccessGrantRecord,
  DigitalAccessReportType,
  DigitalAssetUploadInput,
  DigitalCredentialBatchInput,
  DigitalEntitlementSecretRecord,
  DigitalFulfillmentVersionRecord,
  DigitalInventoryCounts,
  DigitalProductStore,
} from "./digital-products.types.js";

const DEMO_CATEGORY_IDS = [
  "digital_products.downloads.documents",
  "digital_products.downloads.creative_assets",
  "digital_products.access.courses",
  "digital_products.access.software_licenses",
];

const UUIDS = {
  policy: "10000000-0000-4000-8000-000000000001",
  fileEntitlement: "20000000-0000-4000-8000-000000000001",
  linkEntitlement: "20000000-0000-4000-8000-000000000002",
  credentialEntitlement: "20000000-0000-4000-8000-000000000003",
  uniqueEntitlement: "20000000-0000-4000-8000-000000000004",
  provisioningEntitlement: "20000000-0000-4000-8000-000000000005",
  pendingPaymentEntitlement: "20000000-0000-4000-8000-000000000006",
  failedPaymentEntitlement: "20000000-0000-4000-8000-000000000007",
  quarantinedEntitlement: "20000000-0000-4000-8000-000000000008",
  invalidEntitlement: "20000000-0000-4000-8000-000000000009",
  expiredEntitlement: "20000000-0000-4000-8000-000000000010",
  disputedEntitlement: "20000000-0000-4000-8000-000000000011",
  exhaustedEntitlement: "20000000-0000-4000-8000-000000000012",
  retryEntitlement: "20000000-0000-4000-8000-000000000013",
  fileAsset: "30000000-0000-4000-8000-000000000001",
  quarantinedAsset: "30000000-0000-4000-8000-000000000002",
} as const;

function policyFor(marketCode: string): DigitalMarketPolicy | null {
  if (!new Set(["FR", "BE", "CH", "SN", "BF"]).has(marketCode)) return null;
  const active = new Set(["FR", "BE", "CH"]).has(marketCode);
  const currency = marketCode === "CH" ? "CHF" : "EUR";
  return {
    id: UUIDS.policy,
    marketCode,
    version: 1,
    status: active ? "ACTIVE" : "DISABLED",
    enabled: active,
    allowedAccountTypes: ["individual", "professional"],
    allowedSellerTypes: ["individual", "professional"],
    allowedCategoryIds: active ? DEMO_CATEGORY_IDS : [],
    allowedFulfillmentTypes: active
      ? [
          "FILE_DOWNLOAD",
          "ACCESS_LINK",
          "ACCESS_CREDENTIALS",
          "SELLER_PROVISIONED",
        ]
      : [],
    allowedFulfillmentCombinations: active
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
    maxFileSizeBytes: 50 * 1024 * 1024,
    maxTotalFileSizeBytes: 200 * 1024 * 1024,
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
        "DIGITAL_SERVICE",
        "CREATOR_ASSET",
        "EVENT_INVITATION",
      ],
      prohibitedClasses: [
        "PERSONAL_ACCOUNT",
        "SHARED_THIRD_PARTY_ACCOUNT",
        "PAYMENT_CREDENTIAL",
        "IDENTITY_CREDENTIAL",
        "STOLEN_ACCESS",
        "PROVIDER_TERMS_VIOLATION",
      ],
    },
    externalLinks: {
      allowedSchemes: ["https"],
      acceptedDomains: ["demo.shongre.test", "example.test"],
      allowSubdomains: true,
      allowQuery: true,
      allowFragment: false,
    },
    provisioningDeadlineHours: 72,
    defaultEntitlementDurationDays: 365,
    defaultDownloadLimit: 5,
    defaultRevealLimit: 3,
    currency,
    minimumPrice: { amountMinor: 100, currency },
    maximumPrice: { amountMinor: 1_000_000, currency },
    taxPolicyVersion: active ? "deterministic-demo-only" : null,
    refundPolicyVersion: active ? "deterministic-demo-only" : null,
    withdrawalPresentationVersion: active ? "deterministic-demo-only" : null,
    paymentProviderConfigurationId: active ? "deterministic-demo-only" : null,
    legalApprovalId: active ? "deterministic-demo-only" : null,
    capabilities: {
      onboarding: active,
      listingDrafts: active,
      publication: active,
      checkout: active,
      fulfillment: active,
      nativeCheckout: false,
    },
    refundAccessBehavior: "REVOKE_ON_REFUND",
    disputeAccessBehavior: "SUSPEND",
    listingRemovalAccessBehavior: "PRESERVE_EXISTING_PURCHASES",
    sellerRestrictionAccessBehavior: "SUSPEND",
    requirements: [
      {
        id: "simulated",
        label: { "fr-FR": "Parcours simulé" },
        description: {
          "fr-FR":
            "Les paiements et accès de cette démonstration sont simulés et n’accordent aucun produit réel.",
        },
      },
    ],
    effectiveAt: active ? "2026-09-01T00:00:00.000Z" : null,
    approvedAt: active ? "2026-09-01T00:00:00.000Z" : null,
  };
}

function entitlement(
  input: Partial<DigitalEntitlementProjection> &
    Pick<
      DigitalEntitlementProjection,
      "id" | "status" | "paymentStatus" | "primaryFulfillmentType"
    >,
): DigitalEntitlementProjection {
  const fulfillmentTypes = input.fulfillmentTypes ?? [
    input.primaryFulfillmentType,
  ];
  const now = "2026-09-01T10:00:00.000Z";
  return {
    id: input.id,
    orderId: input.orderId ?? `demo-order-${input.id.slice(-3)}`,
    orderItemId: input.orderItemId ?? `demo-item-${input.id.slice(-3)}`,
    listingId: input.listingId ?? `demo-digital-${input.id.slice(-3)}`,
    sellerId: input.sellerId ?? "user_camille",
    marketCode: input.marketCode ?? "FR",
    title: input.title ?? "Produit numérique de démonstration",
    fulfillmentTypes,
    primaryFulfillmentType: input.primaryFulfillmentType,
    productVersion: input.productVersion ?? "2026.09-demo",
    fulfillmentVersion: input.fulfillmentVersion ?? 1,
    status: input.status,
    paymentStatus: input.paymentStatus,
    price: input.price ?? { amountMinor: 2_900, currency: "EUR" },
    commercialEvidenceId:
      input.commercialEvidenceId ?? "demo-catalog-snapshot-v1",
    availableAt: input.availableAt === undefined ? now : input.availableAt,
    expiresAt:
      input.expiresAt === undefined
        ? "2027-09-01T10:00:00.000Z"
        : input.expiresAt,
    downloadLimit:
      input.downloadLimit === undefined ? null : input.downloadLimit,
    downloadsUsed: input.downloadsUsed ?? 0,
    revealLimit: input.revealLimit === undefined ? null : input.revealLimit,
    revealsUsed: input.revealsUsed ?? 0,
    destinationDomain: input.destinationDomain ?? null,
    files:
      input.files ??
      (input.primaryFulfillmentType === "FILE_DOWNLOAD"
        ? [
            {
              id: UUIDS.fileAsset,
              listingId:
                input.listingId ?? `demo-digital-${input.id.slice(-3)}`,
              version: 1,
              safeFileName: "guide-installation.pdf",
              contentType: "application/pdf",
              sizeBytes: 2_048_000,
              status: input.status === "UNAVAILABLE" ? "UNAVAILABLE" : "READY",
              scanStatus: input.status === "UNAVAILABLE" ? "FAILED" : "CLEAN",
              createdAt: "2026-08-30T10:00:00.000Z",
              readyAt:
                input.status === "UNAVAILABLE"
                  ? null
                  : "2026-08-30T10:01:00.000Z",
            },
          ]
        : []),
    maskedSecrets: input.maskedSecrets ?? [],
    provisioningDeadlineAt: input.provisioningDeadlineAt ?? null,
    supportAvailable: input.supportAvailable ?? true,
    replacementAvailable: input.replacementAvailable ?? false,
    simulated: true,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export class DemoDigitalProductsStore implements DigitalProductStore {
  private readonly key = Buffer.from(
    "shongre-digital-dev-key-32bytes!",
    "utf8",
  );
  private readonly sellerProfiles = new Map<string, DigitalSellerProfile>();
  private readonly assets = new Map<string, DigitalAssetProjection>();
  private readonly assetMarkets = new Map<string, string>();
  private readonly batches = new Map<
    string,
    {
      ownerId: string;
      marketCode: string;
      input: DigitalCredentialBatchInput;
      credentials: Array<{
        envelope: DigitalSecretEnvelope;
        status: "AVAILABLE" | "RESERVED" | "CONSUMED";
      }>;
    }
  >();
  private readonly fulfillmentVersions = new Map<
    string,
    DigitalFulfillmentVersionRecord
  >();
  private readonly entitlements = new Map<
    string,
    DigitalEntitlementProjection
  >();
  private readonly entitlementSecrets = new Map<
    string,
    DigitalSecretEnvelope
  >();
  private readonly accessGrants = new Map<string, DigitalAccessGrantRecord>();
  private readonly accessReports = new Map<
    string,
    { id: string; type: DigitalAccessReportType; status: "OPEN" | "RESOLVED" }
  >();
  private readonly paidOrderEntitlements = new Map<string, string>();
  private readonly policyDrafts = new Map<
    string,
    { id: string; policy: DigitalMarketPolicy }
  >();

  constructor() {
    this.seed();
  }

  private encrypted(payload: DigitalSecretPayload) {
    return encryptDigitalSecret(payload, this.key, "deterministic-demo-v1");
  }

  private seed(): void {
    this.assets.set(UUIDS.fileAsset, {
      id: UUIDS.fileAsset,
      listingId: "demo-digital-file",
      version: 1,
      safeFileName: "guide-installation.pdf",
      contentType: "application/pdf",
      sizeBytes: 2_048_000,
      status: "READY",
      scanStatus: "CLEAN",
      createdAt: "2026-08-30T10:00:00.000Z",
      readyAt: "2026-08-30T10:01:00.000Z",
    });
    this.assets.set(UUIDS.quarantinedAsset, {
      id: UUIDS.quarantinedAsset,
      listingId: "demo-digital-quarantined",
      version: 1,
      safeFileName: "archive-a-verifier.zip",
      contentType: "application/zip",
      sizeBytes: 3_000_000,
      status: "QUARANTINED",
      scanStatus: "FAILED",
      createdAt: "2026-08-31T10:00:00.000Z",
      readyAt: null,
    });
    this.assetMarkets.set(UUIDS.fileAsset, "FR");
    this.assetMarkets.set(UUIDS.quarantinedAsset, "FR");

    const linkSecret = this.encrypted({
      destinationUrl: "https://demo.shongre.test/course/welcome",
      fields: [],
    });
    const credentialPayload: DigitalSecretPayload = {
      destinationUrl: "https://demo.shongre.test/course/login",
      fields: [
        { kind: "USERNAME", label: "Identifiant", value: "demo-buyer" },
        { kind: "PASSWORD", label: "Mot de passe", value: "DEMO-NOT-VALID" },
      ],
      instructions: "Données simulées, sans accès réel.",
    };
    const credentialSecret = this.encrypted(credentialPayload);
    const uniqueSecret = this.encrypted({
      fields: [
        {
          kind: "LICENSE_KEY",
          label: "Clé de licence",
          value: "DEMO-LICENSE-NOT-VALID",
        },
      ],
    });

    const seeded = [
      entitlement({
        id: UUIDS.fileEntitlement,
        title: "Guide PDF — scénario réussi",
        status: "ACCESS_AVAILABLE",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "FILE_DOWNLOAD",
        downloadLimit: 5,
      }),
      entitlement({
        id: UUIDS.linkEntitlement,
        title: "Cours externe — lien réutilisable",
        status: "ACCESS_AVAILABLE",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "ACCESS_LINK",
        revealLimit: 3,
        destinationDomain: "demo.shongre.test",
      }),
      entitlement({
        id: UUIDS.credentialEntitlement,
        title: "Cours avec identifiants",
        status: "ACCESS_AVAILABLE",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "ACCESS_CREDENTIALS",
        fulfillmentTypes: ["ACCESS_LINK", "ACCESS_CREDENTIALS"],
        revealLimit: 3,
        destinationDomain: "demo.shongre.test",
        maskedSecrets: maskDigitalSecret(credentialPayload),
      }),
      entitlement({
        id: UUIDS.uniqueEntitlement,
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
      entitlement({
        id: UUIDS.provisioningEntitlement,
        title: "Accès créé par le vendeur",
        status: "PROVISIONING",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "SELLER_PROVISIONED",
        availableAt: null,
        provisioningDeadlineAt: "2026-09-04T10:00:00.000Z",
      }),
      entitlement({
        id: UUIDS.pendingPaymentEntitlement,
        title: "Paiement en confirmation",
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
        primaryFulfillmentType: "FILE_DOWNLOAD",
        availableAt: null,
      }),
      entitlement({
        id: UUIDS.failedPaymentEntitlement,
        title: "Paiement échoué",
        status: "PAYMENT_FAILED",
        paymentStatus: "FAILED",
        primaryFulfillmentType: "FILE_DOWNLOAD",
        availableAt: null,
      }),
      entitlement({
        id: UUIDS.quarantinedEntitlement,
        title: "Fichier en quarantaine",
        status: "QUARANTINED",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "FILE_DOWNLOAD",
        availableAt: null,
      }),
      entitlement({
        id: UUIDS.invalidEntitlement,
        title: "Accès signalé invalide",
        status: "INVALID_ACCESS",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "ACCESS_CREDENTIALS",
        availableAt: null,
        replacementAvailable: true,
      }),
      entitlement({
        id: UUIDS.expiredEntitlement,
        title: "Accès expiré",
        status: "EXPIRED",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "ACCESS_LINK",
        expiresAt: "2026-08-01T10:00:00.000Z",
      }),
      entitlement({
        id: UUIDS.disputedEntitlement,
        title: "Commande contestée",
        status: "DISPUTED",
        paymentStatus: "DISPUTED",
        primaryFulfillmentType: "ACCESS_LINK",
        availableAt: null,
      }),
      entitlement({
        id: UUIDS.exhaustedEntitlement,
        title: "Limite de téléchargement atteinte",
        status: "LIMIT_REACHED",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "FILE_DOWNLOAD",
        downloadLimit: 1,
        downloadsUsed: 1,
      }),
      entitlement({
        id: UUIDS.retryEntitlement,
        title: "Téléchargement à réessayer",
        status: "UNAVAILABLE",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "FILE_DOWNLOAD",
        availableAt: null,
      }),
    ];
    for (const item of seeded) this.entitlements.set(item.id, item);
    this.entitlementSecrets.set(UUIDS.linkEntitlement, linkSecret);
    this.entitlementSecrets.set(UUIDS.credentialEntitlement, credentialSecret);
    this.entitlementSecrets.set(UUIDS.uniqueEntitlement, uniqueSecret);
  }

  async getPolicy(marketCode: string) {
    const managed = [...this.policyDrafts.values()]
      .filter(
        (entry) =>
          entry.policy.marketCode === marketCode &&
          ["ACTIVE", "DISABLED"].includes(entry.policy.status),
      )
      .sort((left, right) => right.policy.version - left.policy.version)[0];
    return managed?.policy ?? policyFor(marketCode);
  }

  async getAdminPolicy(marketCode: string) {
    const drafts = [...this.policyDrafts.values()]
      .filter((entry) => entry.policy.marketCode === marketCode)
      .sort((left, right) => right.policy.version - left.policy.version);
    return drafts[0]?.policy ?? policyFor(marketCode);
  }

  async getPolicyById(policyId: string) {
    return this.policyDrafts.get(policyId)?.policy ?? null;
  }

  async createPolicyDraft(
    _staffId: string,
    policy: DigitalMarketPolicy,
    _reason: string,
  ) {
    const current = await this.getAdminPolicy(policy.marketCode);
    const id = randomUUID();
    const draft: DigitalMarketPolicy = {
      ...policy,
      id,
      version: (current?.version ?? 0) + 1,
      status: "DRAFT",
      enabled: false,
      effectiveAt: policy.effectiveAt ?? null,
      approvedAt: null,
    };
    this.policyDrafts.set(id, { id, policy: draft });
    return draft;
  }

  async activatePolicy(_staffId: string, policyId: string, _reason: string) {
    const record = this.policyDrafts.get(policyId);
    if (!record || record.policy.status !== "DRAFT") {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Politique numérique introuvable.",
      });
    }
    const active: DigitalMarketPolicy = {
      ...record.policy,
      status: "ACTIVE",
      enabled: true,
      approvedAt: new Date().toISOString(),
      effectiveAt: record.policy.effectiveAt ?? new Date().toISOString(),
    };
    this.policyDrafts.set(policyId, { ...record, policy: active });
    return active;
  }

  async getSellerProfile(sellerId: string, marketCode: string) {
    return this.sellerProfiles.get(`${sellerId}:${marketCode}`) ?? null;
  }

  async saveSellerProfile(profile: DigitalSellerProfile) {
    this.sellerProfiles.set(
      `${profile.sellerId}:${profile.marketCode}`,
      profile,
    );
    return profile;
  }

  async createAssetUpload(
    ownerUserId: string,
    input: DigitalAssetUploadInput,
    policy: DigitalMarketPolicy,
  ) {
    const extension =
      input.fileName.toLowerCase().match(/\.[a-z0-9]{1,16}$/)?.[0] ?? "";
    if (
      !policy.allowedMimeTypes.includes(input.contentType) ||
      !policy.allowedFileExtensions.includes(extension) ||
      input.sizeBytes > policy.maxFileSizeBytes
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce fichier ne respecte pas la politique du marché.",
      });
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const asset: DigitalAssetProjection = {
      id,
      listingId: input.listingId ?? null,
      version: input.replacesAssetId ? 2 : 1,
      safeFileName: input.fileName
        .replace(/[^a-zA-Z0-9._ -]/g, "_")
        .slice(0, 120),
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      status: "UPLOAD_PENDING",
      scanStatus: "PENDING",
      createdAt: now,
      readyAt: null,
    };
    this.assets.set(id, asset);
    this.assetMarkets.set(id, policy.marketCode);
    return {
      asset,
      signedUploadUrl: `https://demo.shongre.test/simulated-upload/${id}`,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
  }

  async completeAssetUpload(ownerUserId: string, assetId: string) {
    void ownerUserId;
    const asset = this.assets.get(assetId);
    if (!asset)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Fichier introuvable.",
      });
    const ready = {
      ...asset,
      status: "READY" as const,
      scanStatus: "CLEAN" as const,
      readyAt: new Date().toISOString(),
    };
    this.assets.set(assetId, ready);
    return ready;
  }

  async getAsset(ownerUserId: string, marketCode: string, assetId: string) {
    void ownerUserId;
    return this.assetMarkets.get(assetId) === marketCode
      ? (this.assets.get(assetId) ?? null)
      : null;
  }
  async removeAsset(ownerUserId: string, marketCode: string, assetId: string) {
    void ownerUserId;
    const asset =
      this.assetMarkets.get(assetId) === marketCode
        ? this.assets.get(assetId)
        : null;
    if (!asset)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Fichier introuvable.",
      });
    this.assets.set(assetId, { ...asset, status: "REMOVED" });
  }

  async createAccessSecret(
    ownerUserId: string,
    marketCode: string,
    listingId: string | undefined,
    targetDomain: string | undefined,
    envelope: DigitalSecretEnvelope,
  ) {
    void ownerUserId;
    void marketCode;
    void listingId;
    void targetDomain;
    const id = randomUUID();
    this.entitlementSecrets.set(id, envelope);
    return id;
  }

  async createCredentialBatch(
    ownerUserId: string,
    marketCode: string,
    input: DigitalCredentialBatchInput,
  ) {
    const id = randomUUID();
    this.batches.set(id, {
      ownerId: ownerUserId,
      marketCode,
      input,
      credentials: [],
    });
    return { id, version: 1 };
  }

  async importCredentialInventory(
    ownerUserId: string,
    marketCode: string,
    batchId: string,
    items: Array<{ envelope: DigitalSecretEnvelope }>,
  ) {
    const batch = this.batches.get(batchId);
    if (
      !batch ||
      batch.ownerId !== ownerUserId ||
      batch.marketCode !== marketCode
    )
      throw new AppError({
        code: "NOT_FOUND",
        message: "Lot d’accès introuvable.",
      });
    const fingerprints = new Set(
      batch.credentials.map((item) => item.envelope.fingerprint),
    );
    for (const item of items) {
      if (fingerprints.has(item.envelope.fingerprint))
        throw new AppError({
          code: "CONFLICT",
          message: "Un accès identique existe déjà dans ce lot.",
        });
      fingerprints.add(item.envelope.fingerprint);
      batch.credentials.push({ ...item, status: "AVAILABLE" });
    }
    return this.inventory(batchId, batch);
  }

  private inventory(
    batchId: string,
    batch: {
      input: DigitalCredentialBatchInput;
      credentials: Array<{ status: "AVAILABLE" | "RESERVED" | "CONSUMED" }>;
    },
  ): DigitalInventoryCounts {
    const availableCount = batch.credentials.filter(
      (item) => item.status === "AVAILABLE",
    ).length;
    return {
      batchId,
      listingId: batch.input.listingId ?? null,
      availableCount,
      reservedCount: batch.credentials.filter(
        (item) => item.status === "RESERVED",
      ).length,
      consumedCount: batch.credentials.filter(
        (item) => item.status === "CONSUMED",
      ).length,
      canPurchase: availableCount > 0,
    };
  }

  async getInventory(ownerUserId: string, marketCode: string, batchId: string) {
    const batch = this.batches.get(batchId);
    return !batch ||
      batch.ownerId !== ownerUserId ||
      batch.marketCode !== marketCode
      ? null
      : this.inventory(batchId, batch);
  }

  async createFulfillmentVersion(
    ownerUserId: string,
    listingId: string,
    input: DigitalFulfillmentVersionInput,
    policy: DigitalMarketPolicy,
  ) {
    const id = randomUUID();
    const record: DigitalFulfillmentVersionRecord = {
      ...input,
      id,
      listingId,
      sellerId: ownerUserId,
      marketCode: policy.marketCode,
      policyId: UUIDS.policy,
      policyVersion: policy.version,
      version: 1,
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    this.fulfillmentVersions.set(id, record);
    return record;
  }

  async assertPurchasableListing(listingId: string, marketCode: string) {
    if (marketCode !== "FR" || !listingId.startsWith("list_digital_")) {
      throw new AppError({
        code: "CONFLICT",
        message: "Ce produit numérique n’est pas disponible.",
      });
    }
    return {
      fulfillmentVersionId: "40000000-0000-4000-8000-000000000001",
      fulfillmentModel: "FILE_DOWNLOAD" as const,
      productVersion: "2026.09-demo",
    };
  }

  async confirmPaidOrder(orderId: string) {
    const existing = this.paidOrderEntitlements.get(orderId);
    if (existing) return existing;
    const id = randomUUID();
    this.entitlements.set(
      id,
      entitlement({
        id,
        status: "ACCESS_AVAILABLE",
        paymentStatus: "CONFIRMED",
        primaryFulfillmentType: "FILE_DOWNLOAD",
      }),
    );
    this.paidOrderEntitlements.set(orderId, id);
    return id;
  }

  async applyOrderAccessState(
    orderId: string,
    state: "DISPUTED" | "REFUND_REQUESTED" | "REFUNDED" | "REVERSED",
  ) {
    const entitlementId = this.paidOrderEntitlements.get(orderId);
    if (!entitlementId) return;
    const item = this.entitlements.get(entitlementId);
    if (!item) return;
    item.status =
      state === "DISPUTED"
        ? "DISPUTED"
        : state === "REFUND_REQUESTED"
          ? "REFUND_REQUESTED"
          : state === "REFUNDED"
            ? "REFUNDED"
            : "REVOKED";
    item.paymentStatus =
      state === "REFUND_REQUESTED" ? "REFUND_PENDING" : state;
    item.availableAt = null;
    item.updatedAt = new Date().toISOString();
  }

  async listBuyerEntitlements(buyerId: string, marketCode: string) {
    if (buyerId !== "user_thomas") return [];
    return [...this.entitlements.values()].filter(
      (item) => item.marketCode === marketCode,
    );
  }

  async getBuyerEntitlement(
    buyerId: string,
    marketCode: string,
    entitlementId: string,
  ) {
    if (buyerId !== "user_thomas") return null;
    const item = this.entitlements.get(entitlementId);
    return item?.marketCode === marketCode ? item : null;
  }

  async listSellerProvisioningTasks(
    sellerId: string,
    marketCode: string,
  ): Promise<DigitalProvisioningTask[]> {
    const item = this.entitlements.get(UUIDS.provisioningEntitlement);
    if (!item || item.sellerId !== sellerId || item.marketCode !== marketCode)
      return [];
    return [
      {
        id: "90000000-0000-4000-8000-000000000001",
        entitlementId: item.id,
        orderId: item.orderId,
        listingId: item.listingId,
        marketCode: item.marketCode,
        title: item.title,
        productVersion: item.productVersion,
        productAccessClass: "DIGITAL_SERVICE",
        status: item.status === "PROVISIONING" ? "PENDING" : "COMPLETED",
        deadlineAt: item.provisioningDeadlineAt ?? "2026-09-04T10:00:00.000Z",
        attemptCount: 0,
        nextAttemptAt: null,
        completedAt: item.status === "PROVISIONING" ? null : item.updatedAt,
        failureCode: null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    ];
  }

  async getSellerEntitlementPolicy(
    sellerId: string,
    marketCode: string,
    entitlementId: string,
  ) {
    const item = this.entitlements.get(entitlementId);
    return item?.sellerId === sellerId && item.marketCode === marketCode
      ? policyFor(marketCode)
      : null;
  }

  async issueAccessGrant(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    assetId?: string;
    action: "DOWNLOAD" | "OPEN_LINK" | "REVEAL_SECRET";
    requestId: string;
  }) {
    void input.requestId;
    const item = await this.getBuyerEntitlement(
      input.buyerId,
      input.marketCode,
      input.entitlementId,
    );
    if (!item)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Achat numérique introuvable.",
      });
    if (
      item.paymentStatus !== "CONFIRMED" ||
      !["ACCESS_AVAILABLE", "DELIVERED"].includes(item.status) ||
      (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now())
    )
      throw new AppError({
        code: "CONFLICT",
        message: "Cet accès n’est pas disponible.",
      });
    if (input.action === "DOWNLOAD") {
      if (
        item.downloadLimit !== null &&
        item.downloadsUsed >= item.downloadLimit
      )
        throw new AppError({
          code: "CONFLICT",
          message: "La limite de téléchargement est atteinte.",
        });
      item.downloadsUsed += 1;
    } else {
      if (item.revealLimit !== null && item.revealsUsed >= item.revealLimit)
        throw new AppError({
          code: "CONFLICT",
          message: "La limite d’ouverture est atteinte.",
        });
      item.revealsUsed += 1;
    }
    item.updatedAt = new Date().toISOString();
    const id = randomUUID();
    const grant: DigitalAccessGrantRecord = {
      id,
      entitlementId: item.id,
      buyerId: input.buyerId,
      assetId:
        input.assetId ?? (input.action === "DOWNLOAD" ? UUIDS.fileAsset : null),
      action: input.action,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      consumedAt: null,
    };
    this.accessGrants.set(id, grant);
    return grant;
  }

  async consumeAccessGrant(buyerId: string, grantId: string) {
    const grant = this.accessGrants.get(grantId);
    if (
      !grant ||
      grant.buyerId !== buyerId ||
      grant.consumedAt ||
      new Date(grant.expiresAt).getTime() <= Date.now()
    )
      return null;
    const consumed = { ...grant, consumedAt: new Date().toISOString() };
    this.accessGrants.set(grantId, consumed);
    return consumed;
  }

  async getAssetDownload(assetId: string) {
    const asset = this.assets.get(assetId);
    return asset?.status === "READY"
      ? { privatePath: asset.id, safeFileName: asset.safeFileName }
      : null;
  }

  async revealBuyerSecret(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    requestId: string;
  }): Promise<DigitalEntitlementSecretRecord | null> {
    void input.requestId;
    const item = await this.getBuyerEntitlement(
      input.buyerId,
      input.marketCode,
      input.entitlementId,
    );
    if (
      !item ||
      item.paymentStatus !== "CONFIRMED" ||
      !["ACCESS_AVAILABLE", "DELIVERED"].includes(item.status)
    )
      return null;
    if (item.revealLimit !== null && item.revealsUsed >= item.revealLimit)
      throw new AppError({
        code: "CONFLICT",
        message: "La limite d’affichage est atteinte.",
      });
    const secretEnvelope = this.entitlementSecrets.get(item.id);
    if (!secretEnvelope) return null;
    item.revealsUsed += 1;
    item.status = "DELIVERED";
    item.updatedAt = new Date().toISOString();
    return { entitlement: item, secretEnvelopes: [secretEnvelope] };
  }

  async getSecretForConsumedGrant(input: {
    buyerId: string;
    grantId: string;
    entitlementId: string;
  }) {
    const grant = this.accessGrants.get(input.grantId);
    const item = this.entitlements.get(input.entitlementId);
    const secretEnvelope = this.entitlementSecrets.get(input.entitlementId);
    if (
      !grant?.consumedAt ||
      grant.buyerId !== input.buyerId ||
      grant.entitlementId !== input.entitlementId ||
      !item ||
      !secretEnvelope
    )
      return null;
    return { entitlement: item, secretEnvelopes: [secretEnvelope] };
  }

  async submitProvisionedAccess(input: {
    sellerId: string;
    entitlementId: string;
    targetDomain?: string;
    envelope: DigitalSecretEnvelope;
    requestId: string;
  }) {
    void input.targetDomain;
    void input.requestId;
    const item = this.entitlements.get(input.entitlementId);
    if (!item || item.sellerId !== input.sellerId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Tâche de remise introuvable.",
      });
    if (item.paymentStatus !== "CONFIRMED" || item.status !== "PROVISIONING")
      throw new AppError({
        code: "CONFLICT",
        message: "Cette remise ne peut pas être complétée.",
      });
    this.entitlementSecrets.set(item.id, input.envelope);
    item.status = "ACCESS_AVAILABLE";
    item.availableAt = new Date().toISOString();
    item.updatedAt = item.availableAt;
  }

  async createAccessReport(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    reportType: DigitalAccessReportType;
  }) {
    const item = await this.getBuyerEntitlement(
      input.buyerId,
      input.marketCode,
      input.entitlementId,
    );
    if (!item)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Achat numérique introuvable.",
      });
    const id = randomUUID();
    this.accessReports.set(id, { id, type: input.reportType, status: "OPEN" });
    return { id, status: "OPEN" as const };
  }

  async resolveAccessReport(input: { marketCode: string; reportId: string }) {
    if (input.marketCode !== "FR")
      throw new AppError({
        code: "NOT_FOUND",
        message: "Signalement introuvable.",
      });
    const report = this.accessReports.get(input.reportId);
    if (!report)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Signalement introuvable.",
      });
    report.status = "RESOLVED";
  }

  async moderateAsset(input: {
    marketCode: string;
    assetId: string;
    decision: "APPROVED" | "REJECTED";
  }) {
    const asset = this.assets.get(input.assetId);
    if (!asset || this.assetMarkets.get(input.assetId) !== input.marketCode)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Fichier introuvable.",
      });
    const updated = {
      ...asset,
      status:
        input.decision === "APPROVED"
          ? ("READY" as const)
          : ("REJECTED" as const),
      readyAt: input.decision === "APPROVED" ? new Date().toISOString() : null,
    };
    this.assets.set(input.assetId, updated);
    return updated;
  }

  async moderateFulfillmentVersion(input: {
    marketCode: string;
    fulfillmentVersionId: string;
    decision: "APPROVED" | "REJECTED";
  }) {
    const record = this.fulfillmentVersions.get(input.fulfillmentVersionId);
    if (!record || record.marketCode !== input.marketCode)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Version de remise introuvable.",
      });
    const updated: DigitalFulfillmentVersionRecord = {
      ...record,
      moderationStatus: input.decision,
      status: input.decision === "APPROVED" ? "PUBLISHED" : "SUSPENDED",
      publishedAt:
        input.decision === "APPROVED" ? new Date().toISOString() : null,
    };
    this.fulfillmentVersions.set(updated.id, updated);
    return updated;
  }

  async getAdminOverview(marketCode: string) {
    return {
      assets: [...this.assets.values()].filter(
        (asset) => !asset.listingId || marketCode === "FR",
      ),
      inventory: [...this.batches.entries()].map(([id, batch]) =>
        this.inventory(id, batch),
      ),
      entitlements: [...this.entitlements.values()].filter(
        (item) => item.marketCode === marketCode,
      ),
      openReportCount: [...this.accessReports.values()].filter(
        (report) => report.status === "OPEN",
      ).length,
    };
  }
}
