import { randomUUID } from "node:crypto";
import {
  DIGITAL_ACCESS_REPORT_DESCRIPTION_MAX_LENGTH,
  DIGITAL_ACCESS_REPORT_DESCRIPTION_MIN_LENGTH,
  digitalFulfillmentVersionInputSchema,
  digitalMarketPolicySchema,
  digitalPolicyProjectionSchema,
  digitalSellerProfileSchema,
  type CredentialKind,
  type DigitalFulfillmentType,
  type DigitalMarketPolicy,
  type DigitalPolicyProjection,
  type FulfillmentType,
} from "@shongre/contracts/digital-products";
import { getCurrencyMinorUnitDigits } from "@shongre/shared";
import { config } from "../../app/config/index.js";
import { repositories } from "../../infrastructure/database/repositories/index.js";
import {
  storageService,
  type StorageService,
} from "../../infrastructure/storage/storage-service.js";
import { AppError } from "../../shared/errors/app-error.js";
import { DatabaseDigitalProductsStore } from "./database-digital-products.store.js";
import { DemoDigitalProductsStore } from "./demo-digital-products.store.js";
import {
  decryptDigitalSecret,
  encryptDigitalSecret,
  type DigitalSecretPayload,
} from "./digital-secret-envelope.js";
import {
  assertDigitalPolicy,
  digitalPolicyUnavailableReasons,
  type DigitalCapability,
} from "./digital-policy.js";
import { validateExternalDestination } from "./external-link-policy.js";
import type {
  DigitalAccessReportType,
  DigitalAssetUploadInput,
  DigitalCredentialBatchInput,
  DigitalCredentialImportItem,
  DigitalProductStore,
} from "./digital-products.types.js";

const PRIVATE_DESCRIPTION_PATTERNS = [
  /https?:\/\//i,
  /\b(?:password|mot de passe|token|jeton|pin|license key|clé de licence)\s*[:=]/i,
  /\b(?:sk|pk)_(?:live|test)_[a-z0-9_-]+/i,
];

export class DigitalProductsService {
  constructor(
    private readonly store: DigitalProductStore = config.dataMode === "demo"
      ? new DemoDigitalProductsStore()
      : new DatabaseDigitalProductsStore(),
    private readonly storage: StorageService = storageService,
  ) {}

  async getPolicyProjection(
    marketCode: string,
  ): Promise<DigitalPolicyProjection> {
    const policy = await this.requirePolicy(marketCode);
    return digitalPolicyProjectionSchema.parse({
      ...policy,
      purchaseUnavailableReasons: digitalPolicyUnavailableReasons(policy),
    });
  }

  async getOwnSellerProfile(sellerId: string, marketCode: string) {
    return this.store.getSellerProfile(sellerId, marketCode);
  }

  async acceptSellerResponsibilities(input: {
    sellerId: string;
    marketCode: string;
    fulfillmentTypes: FulfillmentType[];
    acceptedPolicyVersion: number;
  }) {
    const policy = await this.requirePolicy(input.marketCode);
    const user = await repositories.users.findById(input.sellerId);
    if (!user || user.staffStatus)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Compte vendeur introuvable.",
      });
    const accountType =
      user.accountType === "professional" ? "professional" : "individual";
    const digitalTypes = [
      ...new Set(
        input.fulfillmentTypes.filter(
          (type): type is DigitalFulfillmentType => type !== "PHYSICAL",
        ),
      ),
    ];
    if (
      !digitalTypes.length ||
      input.acceptedPolicyVersion !== policy.version
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La version actuelle des responsabilités numériques doit être acceptée.",
      });
    }
    assertDigitalPolicy({
      policy,
      capability: "onboarding",
      marketCode: input.marketCode,
      accountType,
      sellerType: accountType,
      fulfillmentTypes: digitalTypes,
    });
    const profile = digitalSellerProfileSchema.parse({
      sellerId: input.sellerId,
      marketCode: input.marketCode,
      policyVersion: policy.version,
      fulfillmentTypes: [...new Set(input.fulfillmentTypes)],
      acceptedAt: new Date().toISOString(),
      status: "ACTIVE",
    });
    return this.store.saveSellerProfile(profile);
  }

  async initializePrivateUpload(
    ownerUserId: string,
    marketCode: string,
    input: DigitalAssetUploadInput,
  ) {
    const policy = await this.authorizedSellerPolicy(
      ownerUserId,
      marketCode,
      "listingDrafts",
    );
    if (input.listingId)
      await this.requireOwnedListing(ownerUserId, input.listingId, marketCode);
    return this.store.createAssetUpload(ownerUserId, input, policy);
  }

  async completePrivateUpload(
    ownerUserId: string,
    marketCode: string,
    assetId: string,
  ) {
    const policy = await this.authorizedSellerPolicy(
      ownerUserId,
      marketCode,
      "listingDrafts",
    );
    return this.store.completeAssetUpload(ownerUserId, assetId, policy);
  }

  async getOwnAsset(ownerUserId: string, marketCode: string, assetId: string) {
    const asset = await this.store.getAsset(ownerUserId, marketCode, assetId);
    if (!asset)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Fichier numérique introuvable.",
      });
    return asset;
  }

  async removeOwnAsset(
    ownerUserId: string,
    marketCode: string,
    assetId: string,
  ) {
    await this.store.removeAsset(ownerUserId, marketCode, assetId);
    return { success: true };
  }

  async createProtectedAccess(input: {
    sellerId: string;
    marketCode: string;
    listingId?: string;
    productAccessClass: string;
    destinationUrl?: string;
    displayDomain?: string;
    fields?: Array<{ kind: CredentialKind; label: string; value: string }>;
    instructions?: string;
  }) {
    const policy = await this.authorizedSellerPolicy(
      input.sellerId,
      input.marketCode,
      "listingDrafts",
    );
    this.assertAccessClass(
      policy.credentialInventory.allowedClasses,
      policy.credentialInventory.prohibitedClasses,
      input.productAccessClass,
    );
    if (input.listingId)
      await this.requireOwnedListing(
        input.sellerId,
        input.listingId,
        input.marketCode,
      );
    const fields = input.fields ?? [];
    this.assertCredentialKinds(
      fields.map((field) => field.kind),
      policy.credentialInventory.allowedKinds,
    );
    const destination = input.destinationUrl
      ? validateExternalDestination(
          input.destinationUrl,
          policy.externalLinks,
          input.displayDomain,
        )
      : undefined;
    const payload: DigitalSecretPayload = {
      destinationUrl: destination?.secretUrl,
      fields,
      instructions: input.instructions?.trim() || undefined,
    };
    this.assertNonEmptySecretPayload(payload);
    const envelope = encryptDigitalSecret(
      payload,
      this.currentKey(),
      config.digitalFulfillmentKeyVersion,
    );
    const id = await this.store.createAccessSecret(
      input.sellerId,
      input.marketCode,
      input.listingId,
      destination?.destinationDomain,
      envelope,
    );
    return {
      id,
      destinationDomain: destination?.destinationDomain ?? null,
      masked: true,
    };
  }

  async createCredentialBatch(
    sellerId: string,
    marketCode: string,
    productAccessClass: string,
    input: DigitalCredentialBatchInput,
  ) {
    const policy = await this.authorizedSellerPolicy(
      sellerId,
      marketCode,
      "listingDrafts",
    );
    this.assertAccessClass(
      policy.credentialInventory.allowedClasses,
      policy.credentialInventory.prohibitedClasses,
      productAccessClass,
    );
    this.assertCredentialKinds(
      input.credentialKinds,
      policy.credentialInventory.allowedKinds,
    );
    assertDigitalPolicy({
      policy,
      capability: "listingDrafts",
      marketCode,
      allocationMode: input.allocationMode,
    });
    if (input.listingId)
      await this.requireOwnedListing(sellerId, input.listingId, marketCode);
    return this.store.createCredentialBatch(sellerId, marketCode, input);
  }

  async importCredentialInventory(input: {
    sellerId: string;
    marketCode: string;
    batchId: string;
    productAccessClass: string;
    credentials: DigitalCredentialImportItem[];
  }) {
    const policy = await this.authorizedSellerPolicy(
      input.sellerId,
      input.marketCode,
      "listingDrafts",
    );
    this.assertAccessClass(
      policy.credentialInventory.allowedClasses,
      policy.credentialInventory.prohibitedClasses,
      input.productAccessClass,
    );
    if (!input.credentials.length || input.credentials.length > 1_000)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "L’import doit contenir entre 1 et 1 000 accès.",
      });
    const encrypted = input.credentials.map((credential) => {
      if (!credential.fields.length) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Chaque accès importé doit contenir au moins une valeur protégée.",
        });
      }
      this.assertCredentialKinds(
        credential.fields.map((field) => field.kind),
        policy.credentialInventory.allowedKinds,
      );
      const destination = credential.destinationUrl
        ? validateExternalDestination(
            credential.destinationUrl,
            policy.externalLinks,
          )
        : undefined;
      return {
        envelope: encryptDigitalSecret(
          {
            destinationUrl: destination?.secretUrl,
            fields: credential.fields,
            instructions: credential.instructions?.trim() || undefined,
          },
          this.currentKey(),
          config.digitalFulfillmentKeyVersion,
        ),
        expiresAt: credential.expiresAt,
      };
    });
    return this.store.importCredentialInventory(
      input.sellerId,
      input.marketCode,
      input.batchId,
      encrypted,
    );
  }

  async getOwnInventory(sellerId: string, marketCode: string, batchId: string) {
    const inventory = await this.store.getInventory(
      sellerId,
      marketCode,
      batchId,
    );
    if (!inventory)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Inventaire d’accès introuvable.",
      });
    return inventory;
  }

  async createFulfillmentVersion(input: {
    sellerId: string;
    marketCode: string;
    listingId: string;
    fulfillment: unknown;
  }) {
    const fulfillment = digitalFulfillmentVersionInputSchema.parse(
      input.fulfillment,
    );
    const listing = await this.requireOwnedListing(
      input.sellerId,
      input.listingId,
      input.marketCode,
    );
    await this.assertPublicationInput({
      sellerId: input.sellerId,
      marketCode: input.marketCode,
      categoryId: listing.categoryId,
      priceMajor: listing.price,
      currency: listing.currency,
      fulfillment,
    });
    const policy = await this.authorizedSellerPolicy(
      input.sellerId,
      input.marketCode,
      "publication",
    );
    return this.store.createFulfillmentVersion(
      input.sellerId,
      input.listingId,
      fulfillment,
      policy,
    );
  }

  async assertPublicationInput(input: {
    sellerId: string;
    marketCode: string;
    categoryId: string;
    priceMajor: number;
    currency: string;
    fulfillment: unknown;
  }) {
    const fulfillment = digitalFulfillmentVersionInputSchema.parse(
      input.fulfillment,
    );
    const policy = await this.authorizedSellerPolicy(
      input.sellerId,
      input.marketCode,
      "publication",
    );
    const seller = await repositories.users.findById(input.sellerId);
    const accountType =
      seller?.accountType === "professional" ? "professional" : "individual";
    const profile = await this.requireCurrentSellerProfile(
      input.sellerId,
      input.marketCode,
      policy.version,
    );
    if (
      fulfillment.fulfillmentTypes.some(
        (type) => !profile.fulfillmentTypes.includes(type),
      )
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Le profil vendeur n’autorise pas ce mode de remise.",
      });
    }
    assertDigitalPolicy({
      policy,
      capability: "publication",
      marketCode: input.marketCode,
      categoryId: input.categoryId,
      accountType,
      sellerType: accountType,
      fulfillmentTypes: fulfillment.fulfillmentTypes,
      allocationMode: fulfillment.credentialAllocationMode,
      priceMinor: Math.round(
        input.priceMajor * 10 ** getCurrencyMinorUnitDigits(input.currency),
      ),
      currency: input.currency,
    });
    if (fulfillment.productAccessClass) {
      this.assertAccessClass(
        policy.credentialInventory.allowedClasses,
        policy.credentialInventory.prohibitedClasses,
        fulfillment.productAccessClass,
      );
    }
    return fulfillment;
  }

  async confirmAuthoritativePayment(
    orderId: string,
    paymentIntentId: string,
    requestId = randomUUID(),
  ) {
    if (!orderId || !paymentIntentId)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Confirmation de paiement incomplète.",
      });
    return {
      entitlementId: await this.store.confirmPaidOrder(
        orderId,
        paymentIntentId,
        requestId,
      ),
    };
  }

  async assertListingCheckout(listingId: string, marketCode: string) {
    const policy = await this.requirePolicy(marketCode);
    assertDigitalPolicy({ policy, capability: "checkout", marketCode });
    return this.store.assertPurchasableListing(listingId, marketCode);
  }

  async applyAuthoritativeOrderAccessState(
    orderId: string,
    state: "DISPUTED" | "REFUND_REQUESTED" | "REFUNDED" | "REVERSED",
  ) {
    await this.store.applyOrderAccessState(orderId, state);
  }

  async listBuyerEntitlements(buyerId: string, marketCode: string) {
    await this.requirePolicy(marketCode);
    return {
      items: await this.store.listBuyerEntitlements(buyerId, marketCode),
    };
  }

  async getBuyerEntitlement(
    buyerId: string,
    marketCode: string,
    entitlementId: string,
  ) {
    const item = await this.store.getBuyerEntitlement(
      buyerId,
      marketCode,
      entitlementId,
    );
    if (!item)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Achat numérique introuvable.",
      });
    return item;
  }

  async listSellerProvisioningTasks(sellerId: string, marketCode: string) {
    await this.authorizedSellerPolicy(sellerId, marketCode, "fulfillment");
    return this.store.listSellerProvisioningTasks(sellerId, marketCode);
  }

  async createDownloadGrant(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    assetId: string;
    requestId?: string;
  }) {
    const entitlement = await this.requireBuyerEntitlement(
      input.buyerId,
      input.marketCode,
      input.entitlementId,
    );
    if (!entitlement.fulfillmentTypes.includes("FILE_DOWNLOAD"))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Téléchargement introuvable.",
      });
    const grant = await this.store.issueAccessGrant({
      ...input,
      action: "DOWNLOAD",
      requestId: input.requestId ?? randomUUID(),
    });
    return {
      id: grant.id,
      entitlementId: grant.entitlementId,
      action: grant.action,
      expiresAt: grant.expiresAt,
      consumePath: `/api/v1/digital/access-grants/${grant.id}/consume`,
    };
  }

  async createRevealGrant(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    requestId?: string;
  }) {
    const entitlement = await this.requireBuyerEntitlement(
      input.buyerId,
      input.marketCode,
      input.entitlementId,
    );
    const action =
      entitlement.fulfillmentTypes.includes("ACCESS_CREDENTIALS") ||
      entitlement.fulfillmentTypes.includes("SELLER_PROVISIONED")
        ? ("REVEAL_SECRET" as const)
        : ("OPEN_LINK" as const);
    if (
      !entitlement.fulfillmentTypes.some((type) =>
        ["ACCESS_LINK", "ACCESS_CREDENTIALS", "SELLER_PROVISIONED"].includes(
          type,
        ),
      )
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Accès protégé introuvable.",
      });
    }
    const grant = await this.store.issueAccessGrant({
      ...input,
      action,
      requestId: input.requestId ?? randomUUID(),
    });
    return {
      id: grant.id,
      entitlementId: grant.entitlementId,
      action: grant.action,
      expiresAt: grant.expiresAt,
      consumePath: `/api/v1/digital/access-grants/${grant.id}/consume`,
      destinationDomain: entitlement.destinationDomain ?? undefined,
    };
  }

  async consumeAccessGrant(buyerId: string, grantId: string) {
    const grant = await this.store.consumeAccessGrant(buyerId, grantId);
    if (!grant)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Autorisation temporaire introuvable ou expirée.",
      });
    if (grant.action === "DOWNLOAD") {
      if (!grant.assetId)
        throw new AppError({
          code: "CONFLICT",
          message: "Fichier numérique indisponible.",
        });
      const asset = await this.store.getAssetDownload(grant.assetId);
      if (!asset)
        throw new AppError({
          code: "CONFLICT",
          message: "Fichier numérique indisponible.",
        });
      if (config.dataMode === "demo") {
        return {
          kind: "DOWNLOAD" as const,
          url: `https://demo.shongre.test/simulated-download/${grant.id}`,
          fileName: asset.safeFileName,
          expiresAt: grant.expiresAt,
          simulated: true,
        };
      }
      const signed = await this.storage.createDigitalProductSignedUrl(
        asset.privatePath,
        asset.safeFileName,
        120,
      );
      return {
        kind: "DOWNLOAD" as const,
        url: signed.signedUrl,
        fileName: asset.safeFileName,
        expiresAt: signed.expiresAt,
        simulated: false,
      };
    }
    const record = await this.store.getSecretForConsumedGrant({
      buyerId,
      grantId,
      entitlementId: grant.entitlementId,
    });
    if (!record)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Accès protégé introuvable.",
      });
    const payloads = record.secretEnvelopes.map((envelope) =>
      decryptDigitalSecret(envelope, this.keyFor(envelope.keyVersion)),
    );
    const destinationUrl = payloads
      .map((payload) => payload.destinationUrl)
      .find(Boolean);
    const fields = payloads.flatMap((payload) => payload.fields);
    const instructions = payloads
      .map((payload) => payload.instructions)
      .filter((value): value is string => Boolean(value));
    if (grant.action === "OPEN_LINK" && !destinationUrl)
      throw new AppError({
        code: "CONFLICT",
        message: "Lien d’accès indisponible.",
      });
    return {
      kind:
        grant.action === "OPEN_LINK"
          ? ("EXTERNAL_LINK" as const)
          : ("CREDENTIALS" as const),
      entitlementId: record.entitlement.id,
      destinationUrl: destinationUrl ?? null,
      destinationDomain: destinationUrl
        ? new URL(destinationUrl).hostname
        : null,
      fields,
      instructions,
      revealedAt: new Date().toISOString(),
      remainingReveals:
        record.entitlement.revealLimit === null
          ? null
          : Math.max(
              0,
              record.entitlement.revealLimit - record.entitlement.revealsUsed,
            ),
      simulated: record.entitlement.simulated,
    };
  }

  async submitSellerProvisionedAccess(input: {
    sellerId: string;
    marketCode: string;
    entitlementId: string;
    productAccessClass: string;
    destinationUrl?: string;
    displayDomain?: string;
    fields?: Array<{ kind: CredentialKind; label: string; value: string }>;
    instructions?: string;
    requestId?: string;
  }) {
    await this.authorizedSellerPolicy(
      input.sellerId,
      input.marketCode,
      "fulfillment",
    );
    const task = (
      await this.store.listSellerProvisioningTasks(
        input.sellerId,
        input.marketCode,
      )
    ).find((candidate) => candidate.entitlementId === input.entitlementId);
    if (!task)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Tâche de remise introuvable.",
      });
    const policy = await this.store.getSellerEntitlementPolicy(
      input.sellerId,
      input.marketCode,
      input.entitlementId,
    );
    if (!policy)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Tâche de remise introuvable.",
      });
    if (input.productAccessClass !== task.productAccessClass) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La classe d’accès ne correspond pas à la commande.",
      });
    }
    this.assertAccessClass(
      policy.credentialInventory.allowedClasses,
      policy.credentialInventory.prohibitedClasses,
      task.productAccessClass,
    );
    const fields = input.fields ?? [];
    this.assertCredentialKinds(
      fields.map((field) => field.kind),
      policy.credentialInventory.allowedKinds,
    );
    const destination = input.destinationUrl
      ? validateExternalDestination(
          input.destinationUrl,
          policy.externalLinks,
          input.displayDomain,
        )
      : undefined;
    const envelope = encryptDigitalSecret(
      this.validatedSecretPayload({
        destinationUrl: destination?.secretUrl,
        fields,
        instructions: input.instructions?.trim() || undefined,
      }),
      this.currentKey(),
      config.digitalFulfillmentKeyVersion,
    );
    await this.store.submitProvisionedAccess({
      sellerId: input.sellerId,
      entitlementId: input.entitlementId,
      targetDomain: destination?.destinationDomain,
      envelope,
      requestId: input.requestId ?? randomUUID(),
    });
    return { success: true };
  }

  async reportInvalidAccess(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    reportType: DigitalAccessReportType;
    description: string;
  }) {
    const description = input.description.trim();
    if (
      description.length < DIGITAL_ACCESS_REPORT_DESCRIPTION_MIN_LENGTH ||
      description.length > DIGITAL_ACCESS_REPORT_DESCRIPTION_MAX_LENGTH ||
      PRIVATE_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(description))
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Décrivez le problème sans inclure de lien, code, identifiant ou secret.",
      });
    }
    return this.store.createAccessReport({
      buyerId: input.buyerId,
      marketCode: input.marketCode,
      entitlementId: input.entitlementId,
      reportType: input.reportType,
      safeDescription: description,
    });
  }

  async resolveAccessReport(
    staffId: string,
    marketCode: string,
    reportId: string,
    body: {
      resolutionCode: string;
      entitlementStatus?: "ACCESS_AVAILABLE" | "REVOKED" | "UNAVAILABLE";
    },
  ) {
    if (!body.resolutionCode?.trim() || body.resolutionCode.length > 120)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif de résolution valide est requis.",
      });
    await this.store.resolveAccessReport({
      staffId,
      marketCode,
      reportId,
      resolutionCode: body.resolutionCode.trim(),
      entitlementStatus: body.entitlementStatus,
    });
    return { success: true };
  }

  async moderateAsset(
    staffId: string,
    marketCode: string,
    assetId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    return this.store.moderateAsset({ staffId, marketCode, assetId, decision });
  }

  async moderateFulfillmentVersion(
    staffId: string,
    marketCode: string,
    fulfillmentVersionId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    return this.store.moderateFulfillmentVersion({
      staffId,
      marketCode,
      fulfillmentVersionId,
      decision,
    });
  }

  async getAdminOverview(marketCode: string) {
    return this.store.getAdminOverview(marketCode);
  }

  async getAdminPolicy(marketCode: string) {
    const policy = await this.store.getAdminPolicy(marketCode);
    if (!policy)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Politique numérique introuvable.",
      });
    return policy;
  }

  async createPolicyDraft(input: {
    staffId: string;
    marketCode: string;
    policy: unknown;
    reason: string;
  }) {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 10 || reason.length > 240) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif de gouvernance d’au moins 10 caractères est requis.",
      });
    }
    const parsed = digitalMarketPolicySchema.parse({
      ...(input.policy as Record<string, unknown>),
      marketCode: input.marketCode,
      version: 1,
      status: "DRAFT",
      enabled: false,
      approvedAt: null,
    });
    this.assertPolicyStructure(parsed);
    return this.store.createPolicyDraft(input.staffId, parsed, reason);
  }

  async activatePolicy(input: {
    staffId: string;
    policyId: string;
    marketCode: string;
    reason: string;
  }) {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 10 || reason.length > 240) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif d’activation d’au moins 10 caractères est requis.",
      });
    }
    const policy = await this.store.getPolicyById(input.policyId);
    if (!policy || policy.status !== "DRAFT") {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Version de politique numérique introuvable.",
      });
    }
    if (policy.marketCode !== input.marketCode) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Version de politique numérique introuvable.",
      });
    }
    this.assertPolicyStructure(policy);
    const evidence = [
      policy.taxPolicyVersion,
      policy.refundPolicyVersion,
      policy.withdrawalPresentationVersion,
      policy.paymentProviderConfigurationId,
      policy.legalApprovalId,
    ];
    if (evidence.some((value) => !value)) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "L’activation reste bloquée tant que les preuves fiscales, juridiques, de remboursement, de retrait et de paiement ne sont pas renseignées.",
      });
    }
    return this.store.activatePolicy(input.staffId, input.policyId, reason);
  }

  private async requirePolicy(marketCode: string) {
    const policy = await this.store.getPolicy(marketCode);
    if (!policy)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Politique numérique introuvable pour ce marché.",
      });
    return policy;
  }

  private async authorizedSellerPolicy(
    sellerId: string,
    marketCode: string,
    capability: DigitalCapability,
  ) {
    const policy = await this.requirePolicy(marketCode);
    const user = await repositories.users.findById(sellerId);
    if (!user || user.staffStatus)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Compte vendeur introuvable.",
      });
    const accountType =
      user.accountType === "professional" ? "professional" : "individual";
    assertDigitalPolicy({
      policy,
      capability,
      marketCode,
      accountType,
      sellerType: accountType,
    });
    return policy;
  }

  private async requireCurrentSellerProfile(
    sellerId: string,
    marketCode: string,
    policyVersion: number,
  ) {
    const profile = await this.store.getSellerProfile(sellerId, marketCode);
    if (!profile || profile.status !== "ACTIVE")
      throw new AppError({
        code: "FORBIDDEN",
        message: "Le profil vendeur numérique doit être complété.",
      });
    if (profile.policyVersion !== policyVersion)
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Les responsabilités numériques mises à jour doivent être acceptées.",
      });
    return profile;
  }

  private async requireOwnedListing(
    sellerId: string,
    listingId: string,
    marketCode: string,
  ) {
    const listing = await repositories.listings.findById(listingId);
    if (
      !listing ||
      listing.sellerId !== sellerId ||
      listing.marketCode !== marketCode
    )
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      });
    return listing;
  }

  private async requireBuyerEntitlement(
    buyerId: string,
    marketCode: string,
    entitlementId: string,
  ) {
    const item = await this.store.getBuyerEntitlement(
      buyerId,
      marketCode,
      entitlementId,
    );
    if (!item)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Achat numérique introuvable.",
      });
    return item;
  }

  private assertAccessClass(
    allowed: string[],
    prohibited: string[],
    accessClass: string,
  ): void {
    if (
      !accessClass ||
      prohibited.includes(accessClass) ||
      !allowed.includes(accessClass)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Cette classe d’accès n’est pas autorisée. Les comptes personnels, comptes partagés, moyens de paiement et justificatifs d’identité sont interdits.",
      });
    }
  }

  private assertCredentialKinds(
    requested: CredentialKind[],
    allowed: CredentialKind[],
  ): void {
    if (requested.some((kind) => !allowed.includes(kind)))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Ce type d’accès protégé n’est pas autorisé par la politique du marché.",
      });
  }

  private validatedSecretPayload(
    payload: DigitalSecretPayload,
  ): DigitalSecretPayload {
    this.assertNonEmptySecretPayload(payload);
    return payload;
  }

  private assertNonEmptySecretPayload(payload: DigitalSecretPayload): void {
    if (
      !payload.destinationUrl &&
      !payload.fields.length &&
      !payload.instructions?.trim()
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Ajoutez un lien, une valeur protégée ou des instructions d’accès.",
      });
    }
  }

  private assertPolicyStructure(policy: DigitalMarketPolicy): void {
    if (
      policy.minimumPrice.currency !== policy.currency ||
      policy.maximumPrice.currency !== policy.currency ||
      policy.minimumPrice.amountMinor > policy.maximumPrice.amountMinor
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La plage de prix et la devise de la politique sont incohérentes.",
      });
    }
    const allowed = new Set(policy.allowedFulfillmentTypes);
    if (
      config.dataMode !== "demo" &&
      policy.credentialInventory.providerGeneratedAllowed
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "La génération par fournisseur reste désactivée tant qu’un adaptateur approuvé n’est pas configuré.",
      });
    }
    if (
      policy.allowedFulfillmentCombinations.some((combination) =>
        combination.some((type) => !allowed.has(type)),
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une combinaison de remise contient un type non autorisé.",
      });
    }
    if (
      allowed.has("FILE_DOWNLOAD") &&
      (!policy.allowedMimeTypes.length || !policy.allowedFileExtensions.length)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Les fichiers restent désactivés sans formats MIME et extensions autorisés.",
      });
    }
    if (
      config.dataMode !== "demo" &&
      allowed.has("FILE_DOWNLOAD") &&
      config.malwareScannerMode !== "http"
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Les fichiers restent désactivés sans analyse antivirus configurée.",
      });
    }
    if (
      allowed.has("ACCESS_LINK") &&
      !policy.externalLinks.acceptedDomains.length
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Les liens restent désactivés sans domaines approuvés.",
      });
    }
    if (
      allowed.has("ACCESS_CREDENTIALS") &&
      (!policy.credentialInventory.allowedClasses.length ||
        !policy.credentialInventory.allowedKinds.length)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Les accès protégés restent désactivés sans classes et types approuvés.",
      });
    }
  }

  private currentKey(): Buffer {
    return Buffer.from(config.digitalFulfillmentEncryptionKeyBase64, "base64");
  }

  private keyFor(version: string): Buffer {
    if (version === config.digitalFulfillmentKeyVersion)
      return this.currentKey();
    const encoded = config.digitalFulfillmentPreviousKeys[version];
    if (!encoded)
      throw new AppError({
        code: "CONFLICT",
        message: "Cet accès doit être restauré par le support sécurisé.",
      });
    return Buffer.from(encoded, "base64");
  }
}

export const digitalProductsService = new DigitalProductsService();
