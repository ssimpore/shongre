import type {
  CredentialKind,
  DigitalAssetProjection,
  DigitalEntitlementProjection,
  DigitalFulfillmentType,
  DigitalFulfillmentVersionInput,
  DigitalMarketPolicy,
  DigitalProvisioningTask,
  DigitalSellerProfile,
} from "@shongre/contracts/digital-products";
import { digitalMarketPolicySchema } from "@shongre/contracts/digital-products";
import type { Database, Json } from "../../generated/database.types.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import {
  storageService,
  type StorageService,
} from "../../infrastructure/storage/storage-service.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { DigitalSecretEnvelope } from "./digital-secret-envelope.js";
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

type PolicyRow = Database["public"]["Tables"]["digital_market_policies"]["Row"];
type AssetRow = Database["public"]["Tables"]["digital_assets"]["Row"];
type EntitlementRow =
  Database["public"]["Tables"]["digital_entitlements"]["Row"];
type SecretRow =
  Database["public"]["Tables"]["digital_access_secret_versions"]["Row"];
type FulfillmentRow =
  Database["public"]["Tables"]["digital_fulfillment_versions"]["Row"];

function bytea(buffer: Buffer): string {
  return `\\x${buffer.toString("hex")}`;
}

function bufferFromBytea(value: string): Buffer {
  return Buffer.from(value.startsWith("\\x") ? value.slice(2) : value, "hex");
}

function jsonObject(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonArray(value: Json): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapPolicy(row: PolicyRow): DigitalMarketPolicy {
  return digitalMarketPolicySchema.parse({
    id: row.id,
    marketCode: row.market_code,
    version: row.version,
    status: row.status,
    enabled: row.enabled,
    allowedAccountTypes: row.allowed_account_types,
    allowedSellerTypes: row.allowed_seller_types,
    allowedCategoryIds: row.allowed_category_ids,
    allowedFulfillmentTypes: row.allowed_fulfillment_types,
    allowedFulfillmentCombinations: jsonArray(
      row.allowed_fulfillment_combinations,
    ),
    requiredVerificationDimensions: row.required_verification_dimensions,
    moderationRequired: row.moderation_required,
    allowedMimeTypes: row.allowed_mime_types,
    allowedFileExtensions: row.allowed_file_extensions,
    maxFileCount: row.max_file_count,
    maxFileSizeBytes: Number(row.max_file_size_bytes),
    maxTotalFileSizeBytes: Number(row.max_total_file_size_bytes),
    credentialInventory: jsonObject(row.credential_inventory_policy),
    externalLinks: jsonObject(row.external_link_policy),
    provisioningDeadlineHours: row.provisioning_deadline_hours,
    defaultEntitlementDurationDays: row.default_entitlement_duration_days,
    defaultDownloadLimit: row.default_download_limit,
    defaultRevealLimit: row.default_reveal_limit,
    currency: row.currency,
    minimumPrice: {
      amountMinor: Number(row.minimum_price_minor),
      currency: row.currency,
    },
    maximumPrice: {
      amountMinor: Number(row.maximum_price_minor),
      currency: row.currency,
    },
    taxPolicyVersion: row.tax_policy_version,
    refundPolicyVersion: row.refund_policy_version,
    withdrawalPresentationVersion: row.withdrawal_presentation_version,
    paymentProviderConfigurationId: row.payment_provider_configuration_id,
    legalApprovalId: row.legal_approval_id,
    capabilities: jsonObject(row.capabilities),
    refundAccessBehavior: row.refund_access_behavior,
    disputeAccessBehavior: row.dispute_access_behavior,
    listingRemovalAccessBehavior: row.listing_removal_access_behavior,
    sellerRestrictionAccessBehavior: row.seller_restriction_access_behavior,
    requirements: jsonArray(row.requirements),
    effectiveAt: row.effective_at,
    approvedAt: row.approved_at,
  });
}

function mapAsset(row: AssetRow): DigitalAssetProjection {
  return {
    id: row.id,
    listingId: row.listing_id,
    version: row.version,
    safeFileName: row.safe_file_name,
    contentType: row.detected_content_type ?? row.declared_content_type,
    sizeBytes: Number(row.actual_size_bytes ?? row.declared_size_bytes),
    status: row.status,
    scanStatus: row.malware_scan_status,
    createdAt: row.created_at,
    readyAt: row.ready_at,
  };
}

function secretEnvelope(
  row: SecretRow | Database["public"]["Tables"]["digital_credentials"]["Row"],
): DigitalSecretEnvelope {
  return {
    encryptedPayload: bufferFromBytea(row.encrypted_payload),
    iv: bufferFromBytea(row.encryption_iv),
    authTag: bufferFromBytea(row.encryption_tag),
    keyVersion: row.key_version,
    credentialHint: row.credential_hint,
    fingerprint: "",
  };
}

function mapFulfillment(
  row: FulfillmentRow,
  assetIds: string[] = [],
  batchIds: string[] = [],
): DigitalFulfillmentVersionRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    sellerId: row.seller_id,
    marketCode: row.market_code,
    policyId: row.policy_id,
    policyVersion: row.policy_version,
    version: row.version,
    productVersion: row.product_version,
    fulfillmentTypes: row.fulfillment_types as DigitalFulfillmentType[],
    primaryFulfillmentType:
      row.primary_fulfillment_type as DigitalFulfillmentType,
    buyerFacingDescription: row.buyer_facing_description,
    compatibility: row.compatibility,
    requirements: row.requirements,
    publicTermsLabel: row.public_terms_label ?? undefined,
    productAccessClass: row.product_access_class ?? undefined,
    privateAssetVersionIds: assetIds,
    accessSecretVersionId: row.access_secret_version_id ?? undefined,
    credentialBatchIds: batchIds,
    credentialAllocationMode:
      row.credential_allocation_mode as DigitalFulfillmentVersionRecord["credentialAllocationMode"],
    credentialKinds: row.credential_kinds as CredentialKind[],
    provisioningTimeHours: row.provisioning_time_hours ?? undefined,
    entitlementDurationDays: row.entitlement_duration_days,
    downloadLimit: row.download_limit ?? undefined,
    revealLimit: row.reveal_limit ?? undefined,
    status: row.status,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

export class DatabaseDigitalProductsStore implements DigitalProductStore {
  constructor(private readonly storage: StorageService = storageService) {}

  async getPolicy(marketCode: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_market_policies")
      .select("*")
      .eq("market_code", marketCode)
      .in("status", ["ACTIVE", "DISABLED"])
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de lire la politique numérique.",
        error,
      );
    return data ? mapPolicy(data) : null;
  }

  async getAdminPolicy(marketCode: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_market_policies")
      .select("*")
      .eq("market_code", marketCode)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de lire la gouvernance numérique.",
        error,
      );
    return data ? mapPolicy(data) : null;
  }

  async getPolicyById(policyId: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_market_policies")
      .select("*")
      .eq("id", policyId)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de lire la version de politique numérique.",
        error,
      );
    return data ? mapPolicy(data) : null;
  }

  async createPolicyDraft(
    staffId: string,
    policy: DigitalMarketPolicy,
    reason: string,
  ) {
    const { data: id, error } = await getSupabaseAdminClient().rpc(
      "create_digital_policy_draft",
      { p_staff_id: staffId, p_policy: policy, p_reason: reason },
    );
    if (error || !id)
      throw this.databaseError(
        "Impossible de créer la politique numérique.",
        error,
      );
    const created = await this.getPolicyById(id);
    if (!created)
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "La politique numérique créée est introuvable.",
      });
    return created;
  }

  async activatePolicy(staffId: string, policyId: string, reason: string) {
    const { data: id, error } = await getSupabaseAdminClient().rpc(
      "activate_digital_policy",
      { p_staff_id: staffId, p_policy_id: policyId, p_reason: reason },
    );
    if (error || !id)
      throw this.databaseError(
        "Impossible d’activer la politique numérique.",
        error,
      );
    const activated = await this.getPolicyById(id);
    if (!activated)
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "La politique numérique activée est introuvable.",
      });
    return activated;
  }

  async getSellerProfile(sellerId: string, marketCode: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_seller_profiles")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("market_code", marketCode)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de lire le profil vendeur numérique.",
        error,
      );
    return data
      ? {
          sellerId: data.seller_id,
          marketCode: data.market_code,
          policyVersion: data.policy_version,
          fulfillmentTypes:
            data.fulfillment_types as DigitalSellerProfile["fulfillmentTypes"],
          acceptedAt: data.accepted_at,
          status: data.status,
        }
      : null;
  }

  async saveSellerProfile(profile: DigitalSellerProfile) {
    const policyId = await this.policyId(
      profile.marketCode,
      profile.policyVersion,
    );
    const { error } = await getSupabaseAdminClient()
      .from("digital_seller_profiles")
      .upsert({
        seller_id: profile.sellerId,
        market_code: profile.marketCode,
        policy_id: policyId,
        policy_version: profile.policyVersion,
        fulfillment_types: profile.fulfillmentTypes,
        status: profile.status,
        accepted_at: profile.acceptedAt,
        updated_at: new Date().toISOString(),
      });
    if (error)
      throw this.databaseError(
        "Impossible d’enregistrer le profil vendeur numérique.",
        error,
      );
    return profile;
  }

  async createAssetUpload(
    ownerUserId: string,
    input: DigitalAssetUploadInput,
    policy: DigitalMarketPolicy,
  ) {
    return this.storage.createDigitalProductUpload(ownerUserId, input, policy);
  }

  async completeAssetUpload(
    ownerUserId: string,
    assetId: string,
    policy: DigitalMarketPolicy,
  ) {
    return this.storage.completeDigitalProductUpload(
      ownerUserId,
      assetId,
      policy,
    );
  }

  async getAsset(ownerUserId: string, marketCode: string, assetId: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_assets")
      .select("*")
      .eq("id", assetId)
      .eq("owner_user_id", ownerUserId)
      .eq("market_code", marketCode)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de lire le fichier numérique.",
        error,
      );
    return data ? mapAsset(data) : null;
  }

  async removeAsset(ownerUserId: string, marketCode: string, assetId: string) {
    const supabase = getSupabaseAdminClient();
    const { data: links, error: linkError } = await supabase
      .from("digital_fulfillment_assets")
      .select("fulfillment_version_id")
      .eq("asset_id", assetId);
    if (linkError)
      throw this.databaseError(
        "Impossible de vérifier l’utilisation du fichier numérique.",
        linkError,
      );
    const fulfillmentIds = (links ?? []).map(
      (link) => link.fulfillment_version_id,
    );
    if (fulfillmentIds.length) {
      const [{ count: publishedCount }, { count: entitlementCount }] =
        await Promise.all([
          supabase
            .from("digital_fulfillment_versions")
            .select("id", { count: "exact", head: true })
            .in("id", fulfillmentIds)
            .eq("status", "PUBLISHED"),
          supabase
            .from("digital_entitlements")
            .select("id", { count: "exact", head: true })
            .in("fulfillment_version_id", fulfillmentIds),
        ]);
      if ((publishedCount ?? 0) > 0 || (entitlementCount ?? 0) > 0) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Un fichier publié ou déjà acheté doit rester disponible dans sa version historique.",
        });
      }
    }
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_assets")
      .update({ status: "REMOVED", removed_at: new Date().toISOString() })
      .eq("id", assetId)
      .eq("owner_user_id", ownerUserId)
      .eq("market_code", marketCode)
      .in("status", [
        "UPLOAD_PENDING",
        "PROCESSING",
        "READY",
        "REJECTED",
        "QUARANTINED",
      ])
      .select("id")
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de retirer le fichier numérique.",
        error,
      );
    if (!data)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Fichier numérique introuvable.",
      });
  }

  async createAccessSecret(
    ownerUserId: string,
    marketCode: string,
    listingId: string | undefined,
    targetDomain: string | undefined,
    envelope: DigitalSecretEnvelope,
  ) {
    const supabase = getSupabaseAdminClient();
    let version = 1;
    if (listingId) {
      const { data } = await supabase
        .from("digital_access_secret_versions")
        .select("version")
        .eq("listing_id", listingId)
        .eq("market_code", marketCode)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      version = (data?.version ?? 0) + 1;
    }
    const { data, error } = await supabase
      .from("digital_access_secret_versions")
      .insert({
        owner_user_id: ownerUserId,
        market_code: marketCode,
        listing_id: listingId ?? null,
        version,
        target_domain: targetDomain ?? null,
        encrypted_payload: bytea(envelope.encryptedPayload),
        encryption_iv: bytea(envelope.iv),
        encryption_tag: bytea(envelope.authTag),
        key_version: envelope.keyVersion,
        credential_hint: envelope.credentialHint,
      })
      .select("id")
      .single();
    if (error || !data)
      throw this.databaseError(
        "Impossible d’enregistrer l’accès protégé.",
        error,
      );
    return data.id;
  }

  async createCredentialBatch(
    ownerUserId: string,
    marketCode: string,
    input: DigitalCredentialBatchInput,
  ) {
    const supabase = getSupabaseAdminClient();
    const { data: prior } = input.listingId
      ? await supabase
          .from("digital_credential_batches")
          .select("version")
          .eq("listing_id", input.listingId)
          .eq("market_code", marketCode)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };
    const version = (prior?.version ?? 0) + 1;
    const { data, error } = await supabase
      .from("digital_credential_batches")
      .insert({
        owner_user_id: ownerUserId,
        market_code: marketCode,
        listing_id: input.listingId ?? null,
        allocation_mode: input.allocationMode,
        credential_kinds: input.credentialKinds,
        version,
        status: "IMPORTING",
      })
      .select("id")
      .single();
    if (error || !data)
      throw this.databaseError("Impossible de créer le lot d’accès.", error);
    return { id: data.id, version };
  }

  async importCredentialInventory(
    ownerUserId: string,
    marketCode: string,
    batchId: string,
    items: Array<{ envelope: DigitalSecretEnvelope; expiresAt?: string }>,
  ) {
    const supabase = getSupabaseAdminClient();
    const { data: batch, error: batchError } = await supabase
      .from("digital_credential_batches")
      .select("id")
      .eq("id", batchId)
      .eq("owner_user_id", ownerUserId)
      .eq("market_code", marketCode)
      .in("status", ["IMPORTING", "ACTIVE", "DEPLETED"])
      .maybeSingle();
    if (batchError)
      throw this.databaseError(
        "Impossible de lire le lot d’accès.",
        batchError,
      );
    if (!batch)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Lot d’accès introuvable.",
      });
    const { error } = await supabase.from("digital_credentials").insert(
      items.map(({ envelope, expiresAt }) => ({
        batch_id: batchId,
        fingerprint: envelope.fingerprint,
        encrypted_payload: bytea(envelope.encryptedPayload),
        encryption_iv: bytea(envelope.iv),
        encryption_tag: bytea(envelope.authTag),
        key_version: envelope.keyVersion,
        credential_hint: envelope.credentialHint,
        expires_at: expiresAt ?? null,
      })),
    );
    if (error) {
      if (error.code === "23505")
        throw new AppError({
          code: "CONFLICT",
          message: "Un accès identique existe déjà dans ce lot.",
        });
      throw this.databaseError(
        "Impossible d’importer l’inventaire d’accès.",
        error,
      );
    }
    const { count } = await supabase
      .from("digital_credentials")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId);
    await supabase
      .from("digital_credential_batches")
      .update({
        status: "ACTIVE",
        imported_count: count ?? items.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchId);
    return (await this.getInventory(ownerUserId, marketCode, batchId))!;
  }

  async getInventory(ownerUserId: string, marketCode: string, batchId: string) {
    const supabase = getSupabaseAdminClient();
    const { data: batch, error } = await supabase
      .from("digital_credential_batches")
      .select("id,listing_id")
      .eq("id", batchId)
      .eq("owner_user_id", ownerUserId)
      .eq("market_code", marketCode)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de lire l’inventaire d’accès.",
        error,
      );
    if (!batch) return null;
    const { data: credentials, error: credentialsError } = await supabase
      .from("digital_credentials")
      .select("status")
      .eq("batch_id", batchId);
    if (credentialsError)
      throw this.databaseError(
        "Impossible de compter l’inventaire d’accès.",
        credentialsError,
      );
    const count = (status: string) =>
      credentials.filter((item) => item.status === status).length;
    const availableCount = count("AVAILABLE");
    return {
      batchId,
      listingId: batch.listing_id,
      availableCount,
      reservedCount: count("RESERVED"),
      consumedCount: count("CONSUMED"),
      canPurchase: availableCount > 0,
    };
  }

  async createFulfillmentVersion(
    ownerUserId: string,
    listingId: string,
    input: DigitalFulfillmentVersionInput,
    policy: DigitalMarketPolicy,
  ) {
    const supabase = getSupabaseAdminClient();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id,seller_id,market_code,status")
      .eq("id", listingId)
      .eq("seller_id", ownerUserId)
      .in("status", ["draft", "published"])
      .maybeSingle();
    if (listingError)
      throw this.databaseError("Impossible de lire l’annonce.", listingError);
    if (!listing || listing.market_code !== policy.marketCode)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      });

    if (input.privateAssetVersionIds.length) {
      const { data: assets, error } = await supabase
        .from("digital_assets")
        .select("id,status,moderation_status")
        .eq("owner_user_id", ownerUserId)
        .eq("listing_id", listingId)
        .eq("market_code", policy.marketCode)
        .in("id", input.privateAssetVersionIds);
      if (
        error ||
        assets.length !== input.privateAssetVersionIds.length ||
        assets.some(
          (asset) =>
            asset.status !== "READY" ||
            (policy.moderationRequired &&
              asset.moderation_status !== "APPROVED"),
        )
      )
        throw new AppError({
          code: "CONFLICT",
          message:
            "Tous les fichiers doivent être contrôlés et approuvés avant publication.",
        });
    }
    if (input.accessSecretVersionId) {
      const { data: secret } = await supabase
        .from("digital_access_secret_versions")
        .select("id")
        .eq("id", input.accessSecretVersionId)
        .eq("owner_user_id", ownerUserId)
        .eq("market_code", policy.marketCode)
        .eq("status", "ACTIVE")
        .maybeSingle();
      if (!secret)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Accès protégé introuvable.",
        });
    }
    for (const batchId of input.credentialBatchIds) {
      const inventory = await this.getInventory(
        ownerUserId,
        policy.marketCode,
        batchId,
      );
      if (
        !inventory ||
        (input.credentialAllocationMode === "UNIQUE_INVENTORY" &&
          inventory.availableCount <
            policy.credentialInventory.minimumAvailableBeforePurchase)
      ) {
        throw new AppError({
          code: "CONFLICT",
          message: "L’inventaire d’accès uniques est insuffisant.",
        });
      }
    }
    const { data: previous } = await supabase
      .from("digital_fulfillment_versions")
      .select("version")
      .eq("listing_id", listingId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (previous?.version ?? 0) + 1;
    const pendingModeration = policy.moderationRequired;
    const { data: created, error } = await supabase
      .from("digital_fulfillment_versions")
      .insert({
        listing_id: listingId,
        seller_id: ownerUserId,
        market_code: policy.marketCode,
        policy_id: await this.policyId(policy.marketCode, policy.version),
        policy_version: policy.version,
        version,
        product_version: input.productVersion,
        fulfillment_types: input.fulfillmentTypes,
        primary_fulfillment_type: input.primaryFulfillmentType,
        buyer_facing_description: input.buyerFacingDescription,
        compatibility: input.compatibility,
        requirements: input.requirements,
        public_terms_label: input.publicTermsLabel ?? null,
        product_access_class: input.productAccessClass ?? null,
        access_secret_version_id: input.accessSecretVersionId ?? null,
        credential_allocation_mode: input.credentialAllocationMode ?? null,
        credential_kinds: input.credentialKinds,
        provisioning_time_hours: input.provisioningTimeHours ?? null,
        entitlement_duration_days:
          input.entitlementDurationDays ??
          policy.defaultEntitlementDurationDays,
        download_limit: input.downloadLimit ?? policy.defaultDownloadLimit,
        reveal_limit: input.revealLimit ?? policy.defaultRevealLimit,
        status: pendingModeration ? "PROCESSING" : "PUBLISHED",
        moderation_status: pendingModeration ? "PENDING" : "NOT_REQUIRED",
        published_at: pendingModeration ? null : new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error || !created)
      throw this.databaseError(
        "Impossible de créer la version de remise.",
        error,
      );
    try {
      if (input.privateAssetVersionIds.length) {
        const { error: assetLinkError } = await supabase
          .from("digital_fulfillment_assets")
          .insert(
            input.privateAssetVersionIds.map((assetId, position) => ({
              fulfillment_version_id: created.id,
              asset_id: assetId,
              position,
            })),
          );
        if (assetLinkError) throw assetLinkError;
      }
      if (input.credentialBatchIds.length) {
        const { error: batchLinkError } = await supabase
          .from("digital_fulfillment_credential_batches")
          .insert(
            input.credentialBatchIds.map((batchId) => ({
              fulfillment_version_id: created.id,
              batch_id: batchId,
            })),
          );
        if (batchLinkError) throw batchLinkError;
      }
      const { error: listingUpdateError } = await supabase
        .from("listings")
        .update({
          fulfillment_model: input.primaryFulfillmentType,
          digital_fulfillment_version_id: created.id,
          product_version: input.productVersion,
          allowed_delivery: ["digital"],
          shipping_cost: 0,
          status: pendingModeration ? "draft" : "published",
        })
        .eq("id", listingId)
        .eq("seller_id", ownerUserId);
      if (listingUpdateError) throw listingUpdateError;
    } catch (linkError) {
      await supabase
        .from("digital_fulfillment_versions")
        .delete()
        .eq("id", created.id)
        .eq("status", pendingModeration ? "PROCESSING" : "PUBLISHED");
      throw this.databaseError(
        "Impossible d’associer la version de remise à l’annonce.",
        linkError,
      );
    }
    return mapFulfillment(
      created,
      input.privateAssetVersionIds,
      input.credentialBatchIds,
    );
  }

  async assertPurchasableListing(listingId: string, marketCode: string) {
    const supabase = getSupabaseAdminClient();
    const { data: listing, error } = await supabase
      .from("listings")
      .select(
        "digital_fulfillment_version_id,fulfillment_model,product_version",
      )
      .eq("id", listingId)
      .eq("market_code", marketCode)
      .eq("status", "published")
      .neq("fulfillment_model", "PHYSICAL")
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de vérifier le produit numérique.",
        error,
      );
    if (!listing?.digital_fulfillment_version_id || !listing.product_version)
      throw new AppError({
        code: "CONFLICT",
        message: "Ce produit numérique n’est pas disponible.",
      });
    const { data: fulfillment } = await supabase
      .from("digital_fulfillment_versions")
      .select("id,credential_allocation_mode")
      .eq("id", listing.digital_fulfillment_version_id)
      .eq("market_code", marketCode)
      .eq("status", "PUBLISHED")
      .maybeSingle();
    if (!fulfillment)
      throw new AppError({
        code: "CONFLICT",
        message: "La version de remise n’est pas disponible.",
      });
    const { data: assetLinks } = await supabase
      .from("digital_fulfillment_assets")
      .select("asset_id")
      .eq("fulfillment_version_id", fulfillment.id);
    if (listing.fulfillment_model === "FILE_DOWNLOAD") {
      if (!assetLinks?.length)
        throw new AppError({
          code: "CONFLICT",
          message: "Le fichier du produit n’est pas disponible.",
        });
      const { count } = await supabase
        .from("digital_assets")
        .select("id", { count: "exact", head: true })
        .in(
          "id",
          assetLinks.map((link) => link.asset_id),
        )
        .eq("status", "READY")
        .eq("malware_scan_status", "CLEAN");
      if ((count ?? 0) !== assetLinks.length)
        throw new AppError({
          code: "CONFLICT",
          message: "Le fichier du produit n’est pas disponible.",
        });
    }
    if (fulfillment.credential_allocation_mode === "UNIQUE_INVENTORY") {
      const { data: batchLinks } = await supabase
        .from("digital_fulfillment_credential_batches")
        .select("batch_id")
        .eq("fulfillment_version_id", fulfillment.id);
      const batchIds = (batchLinks ?? []).map((link) => link.batch_id);
      const { count } = batchIds.length
        ? await supabase
            .from("digital_credentials")
            .select("id", { count: "exact", head: true })
            .in("batch_id", batchIds)
            .eq("status", "AVAILABLE")
        : { count: 0 };
      if ((count ?? 0) < 1)
        throw new AppError({
          code: "CONFLICT",
          message: "L’inventaire d’accès uniques est épuisé.",
        });
    }
    return {
      fulfillmentVersionId: fulfillment.id,
      fulfillmentModel: listing.fulfillment_model as DigitalFulfillmentType,
      productVersion: listing.product_version,
    };
  }

  async confirmPaidOrder(
    orderId: string,
    paymentIntentId: string,
    requestId: string,
  ) {
    const { data, error } = await getSupabaseAdminClient().rpc(
      "grant_paid_digital_entitlement",
      {
        p_order_id: orderId,
        p_payment_intent_id: paymentIntentId,
        p_request_id: requestId,
      },
    );
    if (error || !data?.[0])
      throw this.databaseError(
        "Impossible d’accorder l’accès numérique après paiement.",
        error,
      );
    return data[0].id;
  }

  async applyOrderAccessState(
    orderId: string,
    state: "DISPUTED" | "REFUND_REQUESTED" | "REFUNDED" | "REVERSED",
  ) {
    const { error } = await getSupabaseAdminClient().rpc(
      "apply_digital_order_access_state",
      { p_order_id: orderId, p_state: state },
    );
    if (error)
      throw this.databaseError(
        "Impossible d’appliquer l’état financier à l’accès numérique.",
        error,
      );
  }

  async listBuyerEntitlements(buyerId: string, marketCode: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_entitlements")
      .select("*")
      .eq("buyer_id", buyerId)
      .eq("market_code", marketCode)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error)
      throw this.databaseError(
        "Impossible de lire les achats numériques.",
        error,
      );
    return this.mapEntitlements(data);
  }

  async getBuyerEntitlement(
    buyerId: string,
    marketCode: string,
    entitlementId: string,
  ) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_entitlements")
      .select("*")
      .eq("id", entitlementId)
      .eq("buyer_id", buyerId)
      .eq("market_code", marketCode)
      .maybeSingle();
    if (error)
      throw this.databaseError("Impossible de lire l’achat numérique.", error);
    if (!data) return null;
    return (await this.mapEntitlements([data]))[0] ?? null;
  }

  async listSellerProvisioningTasks(
    sellerId: string,
    marketCode: string,
  ): Promise<DigitalProvisioningTask[]> {
    const supabase = getSupabaseAdminClient();
    const { data: tasks, error } = await supabase
      .from("digital_provisioning_tasks")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("market_code", marketCode)
      .order("deadline_at", { ascending: true })
      .limit(200);
    if (error)
      throw this.databaseError(
        "Impossible de lire les préparations numériques.",
        error,
      );
    if (!tasks?.length) return [];

    const entitlementIds = tasks.map((task) => task.entitlement_id);
    const { data: entitlements, error: entitlementError } = await supabase
      .from("digital_entitlements")
      .select("id,order_id,listing_id,product_version,fulfillment_version_id")
      .eq("seller_id", sellerId)
      .eq("market_code", marketCode)
      .in("id", entitlementIds);
    if (entitlementError)
      throw this.databaseError(
        "Impossible de lire les achats à préparer.",
        entitlementError,
      );
    const listingIds = [
      ...new Set((entitlements ?? []).map((item) => item.listing_id)),
    ];
    const fulfillmentIds = [
      ...new Set(
        (entitlements ?? []).map((item) => item.fulfillment_version_id),
      ),
    ];
    const [
      { data: listings, error: listingError },
      { data: fulfillments, error: fulfillmentError },
    ] = await Promise.all([
      listingIds.length
        ? supabase.from("listings").select("id,title").in("id", listingIds)
        : Promise.resolve({ data: [], error: null }),
      fulfillmentIds.length
        ? supabase
            .from("digital_fulfillment_versions")
            .select("id,product_access_class")
            .in("id", fulfillmentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (listingError)
      throw this.databaseError(
        "Impossible de lire les annonces à préparer.",
        listingError,
      );
    if (fulfillmentError)
      throw this.databaseError(
        "Impossible de lire les règles de remise à préparer.",
        fulfillmentError,
      );

    const entitlementById = new Map(
      (entitlements ?? []).map((item) => [item.id, item]),
    );
    const titleByListingId = new Map(
      (listings ?? []).map((item) => [item.id, item.title]),
    );
    const accessClassByFulfillmentId = new Map(
      (fulfillments ?? []).map((item) => [item.id, item.product_access_class]),
    );
    return tasks.flatMap((task) => {
      const entitlement = entitlementById.get(task.entitlement_id);
      if (!entitlement) return [];
      const productAccessClass = accessClassByFulfillmentId.get(
        entitlement.fulfillment_version_id,
      );
      if (!productAccessClass) return [];
      return [
        {
          id: task.id,
          entitlementId: task.entitlement_id,
          orderId: entitlement.order_id,
          listingId: entitlement.listing_id,
          marketCode: task.market_code,
          title:
            titleByListingId.get(entitlement.listing_id) ?? "Produit numérique",
          productVersion: entitlement.product_version,
          productAccessClass,
          status: task.status as DigitalProvisioningTask["status"],
          deadlineAt: task.deadline_at,
          attemptCount: task.attempt_count,
          nextAttemptAt: task.next_attempt_at,
          completedAt: task.completed_at,
          failureCode: task.failure_code,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
        },
      ];
    });
  }

  async getSellerEntitlementPolicy(
    sellerId: string,
    marketCode: string,
    entitlementId: string,
  ) {
    const { data: entitlement, error } = await getSupabaseAdminClient()
      .from("digital_entitlements")
      .select("fulfillment_version_id")
      .eq("id", entitlementId)
      .eq("seller_id", sellerId)
      .eq("market_code", marketCode)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de lire la politique historique de remise.",
        error,
      );
    if (!entitlement) return null;
    const { data: fulfillment, error: fulfillmentError } =
      await getSupabaseAdminClient()
        .from("digital_fulfillment_versions")
        .select("policy_id")
        .eq("id", entitlement.fulfillment_version_id)
        .eq("seller_id", sellerId)
        .eq("market_code", marketCode)
        .maybeSingle();
    if (fulfillmentError)
      throw this.databaseError(
        "Impossible de lire la politique historique de remise.",
        fulfillmentError,
      );
    return fulfillment ? this.getPolicyById(fulfillment.policy_id) : null;
  }

  async issueAccessGrant(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    assetId?: string;
    action: "DOWNLOAD" | "OPEN_LINK" | "REVEAL_SECRET";
    requestId: string;
  }) {
    const supabase = getSupabaseAdminClient();
    const { data: grantId, error } = await supabase.rpc(
      "issue_digital_access_grant",
      {
        p_entitlement_id: input.entitlementId,
        p_buyer_id: input.buyerId,
        p_market_code: input.marketCode,
        p_action: input.action,
        p_asset_id: input.assetId ?? null,
        p_request_id: input.requestId,
      },
    );
    if (error || !grantId) {
      if (error?.code === "P0002")
        throw new AppError({
          code: "NOT_FOUND",
          message: "Achat numérique introuvable.",
        });
      throw new AppError({
        code: "CONFLICT",
        message: "Cet accès numérique n’est pas disponible.",
        originalError: error,
      });
    }
    const { data: row, error: rowError } = await supabase
      .from("digital_access_grants")
      .select("*")
      .eq("id", grantId)
      .single();
    if (rowError || !row)
      throw this.databaseError(
        "Impossible de lire l’autorisation temporaire.",
        rowError,
      );
    return this.mapGrant(row);
  }

  async consumeAccessGrant(buyerId: string, grantId: string) {
    const { data, error } = await getSupabaseAdminClient().rpc(
      "consume_digital_access_grant",
      {
        p_grant_id: grantId,
        p_buyer_id: buyerId,
      },
    );
    if (error)
      throw this.databaseError(
        "Impossible de consommer l’autorisation temporaire.",
        error,
      );
    return data?.[0] ? this.mapGrant(data[0]) : null;
  }

  async getAssetDownload(assetId: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_assets")
      .select("private_path,safe_file_name")
      .eq("id", assetId)
      .eq("status", "READY")
      .eq("malware_scan_status", "CLEAN")
      .maybeSingle();
    if (error)
      throw this.databaseError("Impossible de lire le fichier privé.", error);
    return data?.private_path
      ? { privatePath: data.private_path, safeFileName: data.safe_file_name }
      : null;
  }

  async revealBuyerSecret(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    requestId: string;
  }): Promise<DigitalEntitlementSecretRecord | null> {
    const supabase = getSupabaseAdminClient();
    const { data: updated, error } = await supabase.rpc(
      "record_digital_secret_reveal",
      {
        p_entitlement_id: input.entitlementId,
        p_buyer_id: input.buyerId,
        p_market_code: input.marketCode,
        p_request_id: input.requestId,
      },
    );
    if (error) {
      if (error.code === "P0002") return null;
      throw new AppError({
        code: "CONFLICT",
        message: "Cet accès protégé n’est pas disponible.",
        originalError: error,
      });
    }
    const entitlement = updated?.[0];
    if (!entitlement) return null;
    const { data: fulfillment } = await supabase
      .from("digital_fulfillment_versions")
      .select("access_secret_version_id")
      .eq("id", entitlement.fulfillment_version_id)
      .single();
    const envelopes: DigitalSecretEnvelope[] = [];
    const secretIds = [
      entitlement.provisioned_secret_version_id,
      fulfillment?.access_secret_version_id,
    ].filter((id): id is string => Boolean(id));
    if (secretIds.length) {
      const { data: secrets, error: secretError } = await supabase
        .from("digital_access_secret_versions")
        .select("*")
        .in("id", secretIds)
        .eq("status", "ACTIVE");
      if (secretError)
        throw this.databaseError(
          "Impossible de lire l’accès protégé.",
          secretError,
        );
      envelopes.push(...secrets.map(secretEnvelope));
    }
    if (entitlement.assigned_credential_id) {
      const { data: credential, error: credentialError } = await supabase
        .from("digital_credentials")
        .select("*")
        .eq("id", entitlement.assigned_credential_id)
        .in("status", ["RESERVED", "CONSUMED"])
        .single();
      if (credentialError || !credential)
        throw this.databaseError(
          "Impossible de lire l’accès attribué.",
          credentialError,
        );
      envelopes.push(secretEnvelope(credential));
      await supabase
        .from("digital_credentials")
        .update({ status: "CONSUMED", consumed_at: new Date().toISOString() })
        .eq("id", credential.id)
        .eq("status", "RESERVED");
    }
    if (!envelopes.length)
      throw new AppError({
        code: "CONFLICT",
        message: "Aucun accès protégé n’est disponible.",
      });
    const projection = (await this.mapEntitlements([entitlement]))[0];
    return projection
      ? { entitlement: projection, secretEnvelopes: envelopes }
      : null;
  }

  async getSecretForConsumedGrant(input: {
    buyerId: string;
    grantId: string;
    entitlementId: string;
  }): Promise<DigitalEntitlementSecretRecord | null> {
    const supabase = getSupabaseAdminClient();
    const { data: grant, error } = await supabase
      .from("digital_access_grants")
      .select("id")
      .eq("id", input.grantId)
      .eq("buyer_id", input.buyerId)
      .eq("entitlement_id", input.entitlementId)
      .in("action", ["OPEN_LINK", "REVEAL_SECRET"])
      .not("consumed_at", "is", null)
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de vérifier l’autorisation consommée.",
        error,
      );
    if (!grant) return null;
    const { data: entitlement, error: entitlementError } = await supabase
      .from("digital_entitlements")
      .select("*")
      .eq("id", input.entitlementId)
      .eq("buyer_id", input.buyerId)
      .eq("payment_status", "CONFIRMED")
      .in("status", ["ACCESS_AVAILABLE", "DELIVERED"])
      .maybeSingle();
    if (entitlementError)
      throw this.databaseError(
        "Impossible de lire l’achat numérique.",
        entitlementError,
      );
    if (!entitlement) return null;
    const envelopes = await this.secretEnvelopesForEntitlement(entitlement);
    const projection = (await this.mapEntitlements([entitlement]))[0];
    return projection && envelopes.length
      ? { entitlement: projection, secretEnvelopes: envelopes }
      : null;
  }

  async submitProvisionedAccess(input: {
    sellerId: string;
    entitlementId: string;
    targetDomain?: string;
    envelope: DigitalSecretEnvelope;
    requestId: string;
  }) {
    const supabase = getSupabaseAdminClient();
    const { data: entitlement, error } = await supabase
      .from("digital_entitlements")
      .select("id,listing_id,status,payment_status,market_code")
      .eq("id", input.entitlementId)
      .eq("seller_id", input.sellerId)
      .maybeSingle();
    if (error)
      throw this.databaseError("Impossible de lire la tâche de remise.", error);
    if (!entitlement)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Tâche de remise introuvable.",
      });
    if (
      entitlement.payment_status !== "CONFIRMED" ||
      entitlement.status !== "PROVISIONING"
    )
      throw new AppError({
        code: "CONFLICT",
        message: "Cette remise ne peut pas être complétée.",
      });
    const secretId = await this.createAccessSecret(
      input.sellerId,
      entitlement.market_code,
      entitlement.listing_id,
      input.targetDomain,
      input.envelope,
    );
    const { data: attached, error: attachError } = await supabase.rpc(
      "attach_provisioned_digital_secret",
      {
        p_entitlement_id: entitlement.id,
        p_seller_id: input.sellerId,
        p_secret_version_id: secretId,
        p_request_id: input.requestId,
      },
    );
    if (attachError || !attached) {
      await supabase
        .from("digital_access_secret_versions")
        .update({ status: "REVOKED", revoked_at: new Date().toISOString() })
        .eq("id", secretId)
        .eq("owner_user_id", input.sellerId);
      throw new AppError({
        code: "CONFLICT",
        message: "La tâche de remise a déjà changé d’état.",
        originalError: attachError,
      });
    }
  }

  async createAccessReport(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    reportType: DigitalAccessReportType;
    safeDescription: string;
  }) {
    const entitlement = await this.getBuyerEntitlement(
      input.buyerId,
      input.marketCode,
      input.entitlementId,
    );
    if (!entitlement)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Achat numérique introuvable.",
      });
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_access_reports")
      .insert({
        entitlement_id: input.entitlementId,
        reporter_id: input.buyerId,
        market_code: input.marketCode,
        report_type: input.reportType,
        safe_description: input.safeDescription,
      })
      .select("id,status")
      .single();
    if (error || !data)
      throw this.databaseError(
        "Impossible d’enregistrer le signalement.",
        error,
      );
    return { id: data.id, status: "OPEN" as const };
  }

  async resolveAccessReport(input: {
    staffId: string;
    marketCode: string;
    reportId: string;
    resolutionCode: string;
    entitlementStatus?: "ACCESS_AVAILABLE" | "REVOKED" | "UNAVAILABLE";
  }) {
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("digital_access_reports")
      .update({
        status: "RESOLVED",
        resolution_code: input.resolutionCode,
        resolved_by: input.staffId,
        resolved_at: now,
      })
      .eq("id", input.reportId)
      .eq("market_code", input.marketCode)
      .in("status", ["OPEN", "IN_REVIEW"])
      .select("entitlement_id")
      .maybeSingle();
    if (error)
      throw this.databaseError("Impossible de résoudre le signalement.", error);
    if (!data)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Signalement introuvable.",
      });
    if (input.entitlementStatus) {
      await supabase
        .from("digital_entitlements")
        .update({
          status: input.entitlementStatus,
          revoked_at: input.entitlementStatus === "REVOKED" ? now : null,
          updated_at: now,
        })
        .eq("id", data.entitlement_id);
      if (["REVOKED", "UNAVAILABLE"].includes(input.entitlementStatus)) {
        await supabase
          .from("digital_access_grants")
          .update({ revoked_at: now })
          .eq("entitlement_id", data.entitlement_id)
          .is("consumed_at", null)
          .is("revoked_at", null);
      }
    }
  }

  async moderateAsset(input: {
    staffId: string;
    marketCode: string;
    assetId: string;
    decision: "APPROVED" | "REJECTED";
  }) {
    const supabase = getSupabaseAdminClient();
    const approved = input.decision === "APPROVED";
    let query = supabase
      .from("digital_assets")
      .update({
        moderation_status: input.decision,
        status: approved ? "READY" : "REJECTED",
        ready_at: approved ? new Date().toISOString() : null,
      })
      .eq("id", input.assetId)
      .eq("market_code", input.marketCode)
      .in("status", ["PROCESSING", "QUARANTINED"]);
    query = approved
      ? query.eq("malware_scan_status", "CLEAN")
      : query.in("malware_scan_status", ["CLEAN", "MALICIOUS", "FAILED"]);
    const { data, error } = await query.select("*").maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de modérer le fichier numérique.",
        error,
      );
    if (!data)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Fichier à modérer introuvable.",
      });
    await supabase.from("digital_access_audit_events").insert({
      market_code: data.market_code,
      actor_id: input.staffId,
      action: `ASSET_${input.decision}`,
      result: "ALLOWED",
      safe_metadata: { assetId: data.id },
    });
    return mapAsset(data);
  }

  async moderateFulfillmentVersion(input: {
    staffId: string;
    marketCode: string;
    fulfillmentVersionId: string;
    decision: "APPROVED" | "REJECTED";
  }) {
    const supabase = getSupabaseAdminClient();
    const approved = input.decision === "APPROVED";
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("digital_fulfillment_versions")
      .update({
        moderation_status: input.decision,
        status: approved ? "PUBLISHED" : "SUSPENDED",
        published_at: approved ? now : null,
      })
      .eq("id", input.fulfillmentVersionId)
      .eq("market_code", input.marketCode)
      .eq("status", "PROCESSING")
      .select("*")
      .maybeSingle();
    if (error)
      throw this.databaseError(
        "Impossible de modérer la remise numérique.",
        error,
      );
    if (!data)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Version de remise à modérer introuvable.",
      });
    if (approved) {
      await supabase
        .from("listings")
        .update({
          status: "published",
          published_at: now,
          digital_fulfillment_version_id: data.id,
        })
        .eq("id", data.listing_id)
        .eq("status", "draft");
    }
    await supabase.from("digital_access_audit_events").insert({
      market_code: data.market_code,
      actor_id: input.staffId,
      action: `FULFILLMENT_${input.decision}`,
      result: "ALLOWED",
      safe_metadata: { fulfillmentVersionId: data.id },
    });
    return mapFulfillment(data);
  }

  async getAdminOverview(marketCode: string) {
    const supabase = getSupabaseAdminClient();
    const [
      { data: assets },
      { data: batches },
      { data: entitlements },
      { count: openReportCount },
    ] = await Promise.all([
      supabase
        .from("digital_assets")
        .select("*")
        .eq("market_code", marketCode)
        .limit(500),
      supabase
        .from("digital_credential_batches")
        .select("id,owner_user_id,market_code")
        .eq("market_code", marketCode)
        .limit(500),
      supabase
        .from("digital_entitlements")
        .select("*")
        .eq("market_code", marketCode)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("digital_access_reports")
        .select("id", { count: "exact", head: true })
        .eq("market_code", marketCode)
        .in("status", ["OPEN", "IN_REVIEW"]),
    ]);
    const inventory = (
      await Promise.all(
        (batches ?? []).map((batch) =>
          this.getInventory(batch.owner_user_id, batch.market_code, batch.id),
        ),
      )
    ).filter((counts): counts is DigitalInventoryCounts => counts !== null);
    return {
      assets: (assets ?? []).map(mapAsset),
      inventory,
      entitlements: await this.mapEntitlements(entitlements ?? []),
      openReportCount: openReportCount ?? 0,
    };
  }

  private async mapEntitlements(
    rows: EntitlementRow[],
  ): Promise<DigitalEntitlementProjection[]> {
    if (!rows.length) return [];
    const supabase = getSupabaseAdminClient();
    const listingIds = [...new Set(rows.map((row) => row.listing_id))];
    const fulfillmentIds = [
      ...new Set(rows.map((row) => row.fulfillment_version_id)),
    ];
    const entitlementIds = rows.map((row) => row.id);
    const [
      { data: listings },
      { data: fulfillments },
      { data: tasks },
      { data: assetLinks },
    ] = await Promise.all([
      supabase.from("listings").select("id,title").in("id", listingIds),
      supabase
        .from("digital_fulfillment_versions")
        .select("id,version,credential_kinds,access_secret_version_id")
        .in("id", fulfillmentIds),
      supabase
        .from("digital_provisioning_tasks")
        .select("entitlement_id,deadline_at")
        .in("entitlement_id", entitlementIds),
      supabase
        .from("digital_fulfillment_assets")
        .select("fulfillment_version_id,asset_id")
        .in("fulfillment_version_id", fulfillmentIds),
    ]);
    const linkedAssetIds = [
      ...new Set((assetLinks ?? []).map((link) => link.asset_id)),
    ];
    const { data: assets } = linkedAssetIds.length
      ? await supabase
          .from("digital_assets")
          .select("*")
          .in("id", linkedAssetIds)
      : { data: [] as AssetRow[] };
    const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));
    const assetsByFulfillment = new Map<string, DigitalAssetProjection[]>();
    for (const link of assetLinks ?? []) {
      const asset = assetById.get(link.asset_id);
      if (!asset) continue;
      const current =
        assetsByFulfillment.get(link.fulfillment_version_id) ?? [];
      current.push(mapAsset(asset));
      assetsByFulfillment.set(link.fulfillment_version_id, current);
    }
    const titleById = new Map(
      (listings ?? []).map((item) => [item.id, item.title]),
    );
    const fulfillmentById = new Map(
      (fulfillments ?? []).map((item) => [item.id, item]),
    );
    const taskById = new Map(
      (tasks ?? []).map((item) => [item.entitlement_id, item]),
    );
    return rows.map((row) => {
      const fulfillment = fulfillmentById.get(row.fulfillment_version_id);
      const credentialKinds = (fulfillment?.credential_kinds ??
        []) as CredentialKind[];
      return {
        id: row.id,
        orderId: row.order_id,
        orderItemId: row.order_item_id,
        listingId: row.listing_id,
        sellerId: row.seller_id,
        marketCode: row.market_code,
        title: titleById.get(row.listing_id) ?? "Produit numérique",
        fulfillmentTypes: row.fulfillment_types as DigitalFulfillmentType[],
        primaryFulfillmentType:
          row.primary_fulfillment_type as DigitalFulfillmentType,
        productVersion: row.product_version,
        fulfillmentVersion: fulfillment?.version ?? 1,
        status: row.status as DigitalEntitlementProjection["status"],
        paymentStatus:
          row.payment_status as DigitalEntitlementProjection["paymentStatus"],
        price: { amountMinor: Number(row.price_minor), currency: row.currency },
        commercialEvidenceId: row.commercial_evidence_id,
        availableAt: row.available_at,
        expiresAt: row.expires_at,
        downloadLimit: row.download_limit,
        downloadsUsed: row.download_count,
        revealLimit: row.reveal_limit,
        revealsUsed: row.reveal_count,
        destinationDomain: null,
        files: assetsByFulfillment.get(row.fulfillment_version_id) ?? [],
        maskedSecrets: credentialKinds.map((kind) => ({
          kind,
          label: this.credentialLabel(kind),
          maskedValue: "••••••••",
          revealed: false,
        })),
        provisioningDeadlineAt: taskById.get(row.id)?.deadline_at ?? null,
        supportAvailable: true,
        replacementAvailable: ["UNAVAILABLE", "REVOKED"].includes(row.status),
        simulated: false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }

  private async secretEnvelopesForEntitlement(
    entitlement: EntitlementRow,
  ): Promise<DigitalSecretEnvelope[]> {
    const supabase = getSupabaseAdminClient();
    const { data: fulfillment } = await supabase
      .from("digital_fulfillment_versions")
      .select("access_secret_version_id")
      .eq("id", entitlement.fulfillment_version_id)
      .single();
    const envelopes: DigitalSecretEnvelope[] = [];
    const secretIds = [
      entitlement.provisioned_secret_version_id,
      fulfillment?.access_secret_version_id,
    ].filter((id): id is string => Boolean(id));
    if (secretIds.length) {
      const { data: secrets, error } = await supabase
        .from("digital_access_secret_versions")
        .select("*")
        .in("id", secretIds)
        .eq("status", "ACTIVE");
      if (error)
        throw this.databaseError("Impossible de lire l’accès protégé.", error);
      envelopes.push(...secrets.map(secretEnvelope));
    }
    if (entitlement.assigned_credential_id) {
      const { data: credential, error } = await supabase
        .from("digital_credentials")
        .select("*")
        .eq("id", entitlement.assigned_credential_id)
        .in("status", ["RESERVED", "CONSUMED"])
        .maybeSingle();
      if (error)
        throw this.databaseError("Impossible de lire l’accès attribué.", error);
      if (credential) envelopes.push(secretEnvelope(credential));
    }
    return envelopes;
  }

  private credentialLabel(kind: CredentialKind): string {
    return {
      LICENSE_KEY: "Clé de licence",
      ACTIVATION_CODE: "Code d’activation",
      USERNAME: "Identifiant",
      PASSWORD: "Mot de passe",
      PIN: "PIN",
      TOKEN: "Jeton",
      STRUCTURED_INSTRUCTIONS: "Instructions",
    }[kind];
  }

  private mapGrant(
    row: Database["public"]["Tables"]["digital_access_grants"]["Row"],
  ): DigitalAccessGrantRecord {
    return {
      id: row.id,
      entitlementId: row.entitlement_id,
      buyerId: row.buyer_id,
      assetId: row.asset_id,
      action: row.action,
      expiresAt: row.expires_at,
      consumedAt: row.consumed_at,
    };
  }

  private async policyId(marketCode: string, version: number): Promise<string> {
    const { data, error } = await getSupabaseAdminClient()
      .from("digital_market_policies")
      .select("id")
      .eq("market_code", marketCode)
      .eq("version", version)
      .single();
    if (error || !data)
      throw this.databaseError("Politique numérique introuvable.", error);
    return data.id;
  }

  private databaseError(message: string, originalError: unknown): AppError {
    return new AppError({ code: "INTERNAL_ERROR", message, originalError });
  }
}
