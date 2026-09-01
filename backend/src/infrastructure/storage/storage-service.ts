import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import type {
  DigitalAssetProjection,
  DigitalMarketPolicy,
} from "@shongre/contracts/digital-products";
import { getSupabaseAdminClient } from "../supabase/supabase-client.js";
import { AppError } from "../../shared/errors/app-error.js";
import { config } from "../../app/config/index.js";
import { malwareScanner } from "../security/malware-scanner.js";
import { logger } from "../logging/logger.js";

const LISTING_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
const LISTING_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PRIVATE_DOCUMENT_TYPES = new Set([
  ...LISTING_MEDIA_TYPES,
  "application/pdf",
]);

const extensionFor = (contentType: string) =>
  contentType === "image/jpeg"
    ? "jpg"
    : contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "pdf";

const detectedImageType = (buffer: Buffer): string | null => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
};

const detectedDigitalType = (buffer: Buffer): string | null => {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-")
    return "application/pdf";
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    [0x03, 0x05, 0x07].includes(buffer[2]) &&
    [0x04, 0x06, 0x08].includes(buffer[3])
  )
    return "application/zip";
  return detectedImageType(buffer);
};

function safeDownloadName(fileName: string): string {
  const leaf = fileName.replace(/\\/g, "/").split("/").pop() || "download";
  const normalized = leaf
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 160);
  return normalized || "download";
}

export class StorageService {
  private readonly publicListingBucket = "listing-media";
  private readonly stagingListingBucket = "listing-media-staging";
  private readonly privateDocumentBucket = "private-documents";
  private readonly stagingPrivateDocumentBucket = "private-documents-staging";
  private readonly privateDigitalProductBucket = "digital-products";
  private readonly stagingDigitalProductBucket = "digital-products-staging";

  async createDigitalProductUpload(
    ownerUserId: string,
    input: {
      fileName: string;
      contentType: string;
      sizeBytes: number;
      listingId?: string;
      replacesAssetId?: string;
    },
    policy: DigitalMarketPolicy,
  ) {
    const fileName = safeDownloadName(String(input.fileName || ""));
    const extension = extname(fileName).toLowerCase();
    const contentType = String(input.contentType || "").toLowerCase();
    const sizeBytes = Number(input.sizeBytes);
    if (
      !ownerUserId ||
      !fileName ||
      !policy.allowedFileExtensions.includes(extension) ||
      !policy.allowedMimeTypes.includes(contentType) ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > policy.maxFileSizeBytes
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Ce fichier ne respecte pas la politique des produits numériques.",
      });
    }
    if (config.dataMode === "demo") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Utilisez le scénario de téléversement simulé en mode démonstration.",
      });
    }
    const supabase = getSupabaseAdminClient();
    const assetId = randomUUID();
    const stagingPath = `${ownerUserId}/${assetId}${extension}`;
    const { data: upload, error: uploadError } = await supabase.storage
      .from(this.stagingDigitalProductBucket)
      .createSignedUploadUrl(stagingPath, { upsert: false });
    if (uploadError || !upload?.signedUrl) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de préparer le téléversement privé.",
        originalError: uploadError,
      });
    }
    const { error: recordError } = await supabase.rpc(
      "create_digital_asset_upload_record",
      {
        p_asset_id: assetId,
        p_owner_user_id: ownerUserId,
        p_market_code: policy.marketCode,
        p_listing_id: input.listingId ?? null,
        p_replaces_asset_id: input.replacesAssetId ?? null,
        p_staging_path: stagingPath,
        p_file_name: fileName,
        p_extension: extension,
        p_content_type: contentType,
        p_size_bytes: sizeBytes,
      },
    );
    if (recordError) {
      await supabase.storage
        .from(this.stagingDigitalProductBucket)
        .remove([stagingPath]);
      const policyRejection =
        /DIGITAL_UPLOAD_(?:LIMIT_REACHED|POLICY_REJECTED)/.test(
          recordError.message ?? "",
        );
      throw new AppError({
        code: policyRejection ? "CONFLICT" : "INTERNAL_ERROR",
        message: policyRejection
          ? "La limite ou la politique de fichiers empêche ce téléversement."
          : "Impossible d’enregistrer le fichier privé.",
        originalError: recordError,
      });
    }
    const { data: row, error } = await supabase
      .from("digital_assets")
      .select("*")
      .eq("id", assetId)
      .eq("owner_user_id", ownerUserId)
      .single();
    if (error || !row)
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de relire le fichier privé.",
        originalError: error,
      });
    return {
      asset: this.digitalAssetProjection(row),
      signedUploadUrl: upload.signedUrl,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
  }

  async completeDigitalProductUpload(
    ownerUserId: string,
    assetId: string,
    policy: DigitalMarketPolicy,
  ): Promise<DigitalAssetProjection> {
    if (config.dataMode === "demo") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Utilisez le scénario de contrôle simulé en mode démonstration.",
      });
    }
    const { data, error } = await getSupabaseAdminClient().rpc(
      "enqueue_digital_asset_scan",
      {
        p_owner_user_id: ownerUserId,
        p_market_code: policy.marketCode,
        p_asset_id: assetId,
      },
    );
    const asset = data?.[0];
    if (error || !asset)
      throw new AppError({
        code: error?.code === "P0002" ? "NOT_FOUND" : "CONFLICT",
        message:
          error?.code === "P0002"
            ? "Téléversement numérique introuvable."
            : "Ce fichier ne peut pas être traité dans son état actuel.",
        originalError: error,
      });
    return this.digitalAssetProjection(asset);
  }

  async processDigitalProductAsset(
    assetId: string,
    marketCode: string,
  ): Promise<DigitalAssetProjection> {
    if (config.dataMode === "demo") {
      throw new Error("DIGITAL_ASSET_SCAN_DEMO_UNSUPPORTED");
    }
    const supabase = getSupabaseAdminClient();
    const { data: asset, error: assetError } = await supabase
      .from("digital_assets")
      .select("*")
      .eq("id", assetId)
      .eq("market_code", marketCode)
      .single();
    if (assetError || !asset) throw new Error("DIGITAL_ASSET_SCAN_NOT_FOUND");
    if (asset.status === "READY") return this.digitalAssetProjection(asset);
    if (
      !new Set(["PROCESSING", "SCANNING", "QUARANTINED"]).has(asset.status) ||
      !new Set(["PENDING", "SCANNING", "FAILED"]).has(asset.malware_scan_status)
    ) {
      throw new Error("DIGITAL_ASSET_SCAN_STATE_INVALID");
    }
    const { data: blob, error: downloadError } = await supabase.storage
      .from(this.stagingDigitalProductBucket)
      .download(asset.staging_path);
    if (downloadError || !blob) throw new Error("DIGITAL_ASSET_BLOB_NOT_FOUND");
    const buffer = Buffer.from(await blob.arrayBuffer());
    const detectedType = detectedDigitalType(buffer);
    if (
      !detectedType ||
      detectedType !== asset.declared_content_type ||
      buffer.byteLength !== Number(asset.declared_size_bytes)
    ) {
      await supabase.storage
        .from(this.stagingDigitalProductBucket)
        .remove([asset.staging_path]);
      const { data: rejected, error: rejectedError } = await supabase
        .from("digital_assets")
        .update({ status: "REJECTED", malware_scan_status: "FAILED" })
        .eq("id", asset.id)
        .select("*")
        .single();
      if (rejectedError || !rejected)
        throw new Error("DIGITAL_ASSET_REJECTION_FAILED");
      return this.digitalAssetProjection(rejected);
    }
    await supabase
      .from("digital_assets")
      .update({ status: "SCANNING", malware_scan_status: "SCANNING" })
      .eq("id", asset.id);
    let scan;
    try {
      scan = await malwareScanner.scan({
        buffer,
        contentType: detectedType,
        fileName: asset.safe_file_name,
      });
    } catch (error) {
      await supabase
        .from("digital_assets")
        .update({ status: "QUARANTINED", malware_scan_status: "FAILED" })
        .eq("id", asset.id);
      throw new Error("DIGITAL_ASSET_SCAN_RETRYABLE", { cause: error });
    }
    const digest = createHash("sha256").update(buffer).digest("hex");
    if (scan.verdict === "malicious") {
      await supabase.storage
        .from(this.stagingDigitalProductBucket)
        .remove([asset.staging_path]);
      const { data: quarantined, error: quarantineError } = await supabase
        .from("digital_assets")
        .update({
          status: "QUARANTINED",
          malware_scan_status: "MALICIOUS",
          malware_scan_provider: scan.provider,
          malware_scan_signature: scan.signature ?? null,
          malware_scanned_at: new Date().toISOString(),
          sha256_digest: digest,
        })
        .eq("id", asset.id)
        .select("*")
        .single();
      if (quarantineError || !quarantined)
        throw new Error("DIGITAL_ASSET_QUARANTINE_FAILED");
      return this.digitalAssetProjection(quarantined);
    }
    const privatePath = `${asset.owner_user_id}/${asset.id}${asset.declared_extension}`;
    const { error: privateUploadError } = await supabase.storage
      .from(this.privateDigitalProductBucket)
      .upload(privatePath, buffer, {
        contentType: "application/octet-stream",
        cacheControl: "private, no-store",
        upsert: true,
      });
    if (privateUploadError)
      throw new Error("DIGITAL_ASSET_PRIVATE_COPY_FAILED");
    const ready = asset.moderation_status === "NOT_REQUIRED";
    const { data: updated, error: updateError } = await supabase
      .from("digital_assets")
      .update({
        private_path: privatePath,
        detected_content_type: detectedType,
        actual_size_bytes: buffer.byteLength,
        sha256_digest: digest,
        malware_scan_status: "CLEAN",
        malware_scan_provider: scan.provider,
        malware_scan_signature: scan.signature ?? null,
        malware_scanned_at: new Date().toISOString(),
        status: ready ? "READY" : "PROCESSING",
        ready_at: ready ? new Date().toISOString() : null,
      })
      .eq("id", asset.id)
      .eq("owner_user_id", asset.owner_user_id)
      .select("*")
      .single();
    if (updateError || !updated) {
      await supabase.storage
        .from(this.privateDigitalProductBucket)
        .remove([privatePath]);
      throw new Error("DIGITAL_ASSET_SCAN_PERSIST_FAILED", {
        cause: updateError,
      });
    }
    await supabase.storage
      .from(this.stagingDigitalProductBucket)
      .remove([asset.staging_path]);
    return this.digitalAssetProjection(updated);
  }

  async createDigitalProductSignedUrl(
    path: string,
    safeFileName: string,
    expiresInSeconds = 300,
  ) {
    const boundedExpiry = Math.min(300, Math.max(30, expiresInSeconds));
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(this.privateDigitalProductBucket)
      .createSignedUrl(path, boundedExpiry, {
        download: safeDownloadName(safeFileName),
      });
    if (error || !data?.signedUrl)
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de créer le téléchargement temporaire.",
        originalError: error,
      });
    return {
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + boundedExpiry * 1000).toISOString(),
    };
  }

  private digitalAssetProjection(asset: {
    id: string;
    listing_id: string | null;
    version: number;
    safe_file_name: string;
    declared_content_type: string;
    declared_size_bytes: number;
    actual_size_bytes: number | null;
    status: DigitalAssetProjection["status"];
    malware_scan_status: string;
    created_at: string;
    ready_at: string | null;
  }): DigitalAssetProjection {
    const scanStatus =
      asset.malware_scan_status as DigitalAssetProjection["scanStatus"];
    return {
      id: asset.id,
      listingId: asset.listing_id,
      version: asset.version,
      safeFileName: asset.safe_file_name,
      contentType: asset.declared_content_type,
      sizeBytes: Number(asset.actual_size_bytes ?? asset.declared_size_bytes),
      status: asset.status,
      scanStatus,
      createdAt: asset.created_at,
      readyAt: asset.ready_at,
    };
  }

  async assertOwnedPrivateDocumentKeys(
    ownerUserId: string,
    privateStorageKeys: string[],
  ) {
    const keys = [...new Set(privateStorageKeys.filter(Boolean))];
    if (!keys.length || config.dataMode === "demo") return;
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (
      supabase.from("private_document_assets" as any) as any
    )
      .select("private_path")
      .eq("owner_user_id", ownerUserId)
      .eq("malware_scan_status", "clean")
      .in("private_path", keys)
      .in("status", ["ready", "attached"]);
    const ownedKeys = new Set(
      (data || []).map((asset: { private_path: string }) => asset.private_path),
    );
    if (error || keys.some((key) => !ownedKeys.has(key))) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Un document privé n’appartient pas à ce compte.",
        originalError: error,
      });
    }
  }

  async createPrivateDocumentUpload(
    ownerUserId: string,
    input: { fileName: string; contentType: string; sizeBytes: number },
  ) {
    const contentType = String(input.contentType || "").toLowerCase();
    const sizeBytes = Number(input.sizeBytes);
    if (
      !ownerUserId ||
      !input.fileName?.trim() ||
      input.fileName.length > 255 ||
      !PRIVATE_DOCUMENT_TYPES.has(contentType) ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > LISTING_MEDIA_MAX_BYTES
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le document doit être une image ou un PDF de 10 Mo maximum.",
      });
    }
    if (config.dataMode === "demo") {
      throw new AppError({
        code: "CONFLICT",
        message: "Le stockage distant n’est pas actif en mode démonstration.",
      });
    }
    const assetId = randomUUID();
    const stagingPath = `${ownerUserId}/${assetId}.${extensionFor(contentType)}`;
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(this.stagingPrivateDocumentBucket)
      .createSignedUploadUrl(stagingPath, { upsert: false });
    if (error || !data?.signedUrl) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de préparer le téléversement du document.",
        originalError: error,
      });
    }
    const { error: recordError } = await (
      supabase.from("private_document_assets" as any) as any
    ).insert({
      id: assetId,
      owner_user_id: ownerUserId,
      staging_path: stagingPath,
      original_file_name: input.fileName.trim(),
      declared_content_type: contentType,
      declared_size_bytes: sizeBytes,
      status: "upload_pending",
    });
    if (recordError) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible d’enregistrer le téléversement du document.",
        originalError: recordError,
      });
    }
    return { assetId, signedUrl: data.signedUrl, contentType };
  }

  async completePrivateDocumentUpload(ownerUserId: string, assetId: string) {
    const supabase = getSupabaseAdminClient();
    const { data: asset, error: assetError } = await (
      supabase.from("private_document_assets" as any) as any
    )
      .select("*")
      .eq("id", assetId)
      .eq("owner_user_id", ownerUserId)
      .single();
    if (assetError || !asset) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Téléversement privé introuvable.",
      });
    }
    if (
      (asset.status === "ready" || asset.status === "attached") &&
      asset.malware_scan_status === "clean"
    ) {
      return { assetId: asset.id, privateStorageKey: asset.private_path };
    }
    if (asset.status === "ready" || asset.status === "attached") {
      const scan = await this.rescanStoredAsset({
        table: "private_document_assets",
        bucket: this.privateDocumentBucket,
        objectPath: asset.private_path,
        asset,
        allowPdf: true,
      });
      const { error: updateError } = await (
        supabase.from("private_document_assets" as any) as any
      )
        .update({
          malware_scan_status: scan.verdict,
          malware_scan_provider: scan.provider,
          malware_scan_digest: scan.digest,
          malware_scan_signature: scan.signature,
          malware_scanned_at: new Date().toISOString(),
        })
        .eq("id", asset.id)
        .eq("owner_user_id", ownerUserId);
      if (updateError) {
        throw new AppError({
          code: "INTERNAL_ERROR",
          message: "Impossible d’enregistrer le contrôle du document privé.",
          originalError: updateError,
        });
      }
      return { assetId: asset.id, privateStorageKey: asset.private_path };
    }
    const { data: blob, error: downloadError } = await supabase.storage
      .from(this.stagingPrivateDocumentBucket)
      .download(asset.staging_path);
    if (downloadError || !blob) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le document téléversé est introuvable ou incomplet.",
      });
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const detectedType =
      buffer.subarray(0, 5).toString("ascii") === "%PDF-"
        ? "application/pdf"
        : detectedImageType(buffer);
    if (
      !detectedType ||
      detectedType !== asset.declared_content_type ||
      buffer.byteLength !== Number(asset.declared_size_bytes) ||
      buffer.byteLength > LISTING_MEDIA_MAX_BYTES
    ) {
      await supabase.storage
        .from(this.stagingPrivateDocumentBucket)
        .remove([asset.staging_path]);
      await (supabase.from("private_document_assets" as any) as any)
        .update({ status: "rejected" })
        .eq("id", asset.id);
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le contenu du document ne correspond pas au fichier annoncé.",
      });
    }
    const scan = await this.scanOrQuarantine({
      table: "private_document_assets",
      bucket: this.stagingPrivateDocumentBucket,
      asset,
      buffer,
      detectedType,
    });
    const privatePath = `${ownerUserId}/${asset.id}.${extensionFor(detectedType)}`;
    const { error: uploadError } = await supabase.storage
      .from(this.privateDocumentBucket)
      .upload(privatePath, buffer, {
        contentType: detectedType,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de finaliser le document privé.",
        originalError: uploadError,
      });
    }
    const { error: updateError } = await (
      supabase.from("private_document_assets" as any) as any
    )
      .update({
        private_path: privatePath,
        detected_content_type: detectedType,
        actual_size_bytes: buffer.byteLength,
        malware_scan_status: scan.verdict,
        malware_scan_provider: scan.provider,
        malware_scan_digest: scan.digest,
        malware_scan_signature: scan.signature,
        malware_scanned_at: new Date().toISOString(),
        status: "ready",
        completed_at: new Date().toISOString(),
      })
      .eq("id", asset.id)
      .eq("owner_user_id", ownerUserId);
    if (updateError) {
      await supabase.storage
        .from(this.privateDocumentBucket)
        .remove([privatePath]);
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible d’enregistrer le document privé.",
        originalError: updateError,
      });
    }
    await supabase.storage
      .from(this.stagingPrivateDocumentBucket)
      .remove([asset.staging_path]);
    return { assetId: asset.id, privateStorageKey: privatePath };
  }

  async createListingMediaUpload(
    ownerUserId: string,
    input: { fileName: string; contentType: string; sizeBytes: number },
  ) {
    const contentType = String(input.contentType || "").toLowerCase();
    const sizeBytes = Number(input.sizeBytes);
    if (
      !ownerUserId ||
      !input.fileName?.trim() ||
      input.fileName.length > 255 ||
      !LISTING_MEDIA_TYPES.has(contentType) ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > LISTING_MEDIA_MAX_BYTES
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La photo doit être un fichier JPEG, PNG ou WebP de 10 Mo maximum.",
      });
    }
    if (config.dataMode === "demo") {
      throw new AppError({
        code: "CONFLICT",
        message: "Le stockage distant n’est pas actif en mode démonstration.",
      });
    }

    const assetId = randomUUID();
    const stagingPath = `${ownerUserId}/${assetId}.${extensionFor(contentType)}`;
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(this.stagingListingBucket)
      .createSignedUploadUrl(stagingPath, { upsert: false });
    if (error || !data?.signedUrl) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de préparer le téléversement de la photo.",
        originalError: error,
      });
    }
    const { error: recordError } = await (
      supabase.from("listing_media_assets" as any) as any
    ).insert({
      id: assetId,
      owner_user_id: ownerUserId,
      staging_path: stagingPath,
      original_file_name: input.fileName.trim(),
      declared_content_type: contentType,
      declared_size_bytes: sizeBytes,
      status: "upload_pending",
    });
    if (recordError) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible d’enregistrer le téléversement de la photo.",
        originalError: recordError,
      });
    }
    return {
      assetId,
      signedUrl: data.signedUrl,
      path: stagingPath,
      contentType,
      maxBytes: LISTING_MEDIA_MAX_BYTES,
    };
  }

  async completeListingMediaUpload(ownerUserId: string, assetId: string) {
    const supabase = getSupabaseAdminClient();
    const { data: asset, error: assetError } = await (
      supabase.from("listing_media_assets" as any) as any
    )
      .select("*")
      .eq("id", assetId)
      .eq("owner_user_id", ownerUserId)
      .single();
    if (assetError || !asset) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Téléversement introuvable.",
      });
    }
    if (
      (asset.status === "ready" || asset.status === "attached") &&
      asset.malware_scan_status === "clean"
    ) {
      return { assetId: asset.id, url: asset.public_url };
    }
    if (asset.status === "ready" || asset.status === "attached") {
      const scan = await this.rescanStoredAsset({
        table: "listing_media_assets",
        bucket: this.publicListingBucket,
        objectPath: asset.public_path,
        asset,
        allowPdf: false,
      });
      const { error: updateError } = await (
        supabase.from("listing_media_assets" as any) as any
      )
        .update({
          malware_scan_status: scan.verdict,
          malware_scan_provider: scan.provider,
          malware_scan_digest: scan.digest,
          malware_scan_signature: scan.signature,
          malware_scanned_at: new Date().toISOString(),
        })
        .eq("id", asset.id)
        .eq("owner_user_id", ownerUserId);
      if (updateError) {
        throw new AppError({
          code: "INTERNAL_ERROR",
          message: "Impossible d’enregistrer le contrôle de la photo.",
          originalError: updateError,
        });
      }
      return { assetId: asset.id, url: asset.public_url };
    }
    const { data: blob, error: downloadError } = await supabase.storage
      .from(this.stagingListingBucket)
      .download(asset.staging_path);
    if (downloadError || !blob) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le fichier téléversé est introuvable ou incomplet.",
      });
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const detectedType = detectedImageType(buffer);
    if (
      !detectedType ||
      detectedType !== asset.declared_content_type ||
      buffer.byteLength !== Number(asset.declared_size_bytes) ||
      buffer.byteLength > LISTING_MEDIA_MAX_BYTES
    ) {
      await supabase.storage
        .from(this.stagingListingBucket)
        .remove([asset.staging_path]);
      await (supabase.from("listing_media_assets" as any) as any)
        .update({ status: "rejected" })
        .eq("id", asset.id);
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le contenu de la photo ne correspond pas au fichier annoncé.",
      });
    }

    const scan = await this.scanOrQuarantine({
      table: "listing_media_assets",
      bucket: this.stagingListingBucket,
      asset,
      buffer,
      detectedType,
    });

    const publicPath = `${ownerUserId}/${asset.id}.${extensionFor(detectedType)}`;
    const { error: uploadError } = await supabase.storage
      .from(this.publicListingBucket)
      .upload(publicPath, buffer, {
        contentType: detectedType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de finaliser la photo.",
        originalError: uploadError,
      });
    }
    const publicUrl = supabase.storage
      .from(this.publicListingBucket)
      .getPublicUrl(publicPath).data.publicUrl;
    const { error: updateError } = await (
      supabase.from("listing_media_assets" as any) as any
    )
      .update({
        public_path: publicPath,
        public_url: publicUrl,
        detected_content_type: detectedType,
        actual_size_bytes: buffer.byteLength,
        malware_scan_status: scan.verdict,
        malware_scan_provider: scan.provider,
        malware_scan_digest: scan.digest,
        malware_scan_signature: scan.signature,
        malware_scanned_at: new Date().toISOString(),
        status: "ready",
        completed_at: new Date().toISOString(),
      })
      .eq("id", asset.id)
      .eq("owner_user_id", ownerUserId);
    if (updateError) {
      await supabase.storage
        .from(this.publicListingBucket)
        .remove([publicPath]);
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de finaliser la photo.",
        originalError: updateError,
      });
    }
    await supabase.storage
      .from(this.stagingListingBucket)
      .remove([asset.staging_path]);
    return { assetId: asset.id, url: publicUrl };
  }

  async assertOwnedListingMedia(ownerUserId: string, urls: string[]) {
    if (config.dataMode === "demo" || urls.length === 0) return;
    if (urls.length > 20 || new Set(urls).size !== urls.length) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La galerie de l’annonce est invalide.",
      });
    }
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (
      supabase.from("listing_media_assets" as any) as any
    )
      .select("public_url")
      .eq("owner_user_id", ownerUserId)
      .eq("status", "ready")
      .eq("malware_scan_status", "clean")
      .in("public_url", urls);
    if (error || data?.length !== urls.length) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Une ou plusieurs photos ne vous appartiennent pas.",
      });
    }
  }

  private async scanOrQuarantine(input: {
    table: "listing_media_assets" | "private_document_assets";
    bucket: string;
    asset: {
      id: string;
      staging_path: string;
      original_file_name: string;
    };
    buffer: Buffer;
    detectedType: string;
  }) {
    const supabase = getSupabaseAdminClient();
    await (supabase.from(input.table as any) as any)
      .update({ malware_scan_status: "scanning" })
      .eq("id", input.asset.id);
    try {
      const result = await malwareScanner.scan({
        buffer: input.buffer,
        contentType: input.detectedType,
        fileName: input.asset.original_file_name,
      });
      if (result.verdict === "malicious") {
        await supabase.storage
          .from(input.bucket)
          .remove([input.asset.staging_path]);
        await (supabase.from(input.table as any) as any)
          .update({
            status: "rejected",
            malware_scan_status: "malicious",
            malware_scan_provider: result.provider,
            malware_scan_digest: result.digest,
            malware_scan_signature: result.signature,
            malware_scanned_at: new Date().toISOString(),
          })
          .eq("id", input.asset.id);
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Le fichier a été refusé par le contrôle de sécurité.",
        });
      }
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      await (supabase.from(input.table as any) as any)
        .update({ malware_scan_status: "failed" })
        .eq("id", input.asset.id);
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message:
          "Le contrôle de sécurité du fichier est temporairement indisponible.",
        originalError: error,
      });
    }
  }

  private async rescanStoredAsset(input: {
    table: "listing_media_assets" | "private_document_assets";
    bucket: string;
    objectPath: string | null;
    asset: {
      id: string;
      original_file_name: string;
      declared_content_type: string;
      declared_size_bytes: number;
    };
    allowPdf: boolean;
  }) {
    if (!input.objectPath) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le fichier historique ne peut pas être contrôlé.",
      });
    }
    const supabase = getSupabaseAdminClient();
    const { data: blob, error } = await supabase.storage
      .from(input.bucket)
      .download(input.objectPath);
    if (error || !blob) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le fichier historique est introuvable.",
        originalError: error,
      });
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const detectedType =
      input.allowPdf && buffer.subarray(0, 5).toString("ascii") === "%PDF-"
        ? "application/pdf"
        : detectedImageType(buffer);
    if (
      !detectedType ||
      detectedType !== input.asset.declared_content_type ||
      buffer.byteLength !== Number(input.asset.declared_size_bytes) ||
      buffer.byteLength > LISTING_MEDIA_MAX_BYTES
    ) {
      await supabase.storage.from(input.bucket).remove([input.objectPath]);
      await (supabase.from(input.table as any) as any)
        .update({ status: "rejected", malware_scan_status: "failed" })
        .eq("id", input.asset.id);
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le fichier historique ne correspond pas à ses métadonnées.",
      });
    }
    return this.scanOrQuarantine({
      table: input.table,
      bucket: input.bucket,
      asset: {
        id: input.asset.id,
        staging_path: input.objectPath,
        original_file_name: input.asset.original_file_name,
      },
      buffer,
      detectedType,
    });
  }

  async attachListingMedia(
    ownerUserId: string,
    listingId: string,
    urls: string[],
  ) {
    if (config.dataMode === "demo" || urls.length === 0) return;
    const supabase = getSupabaseAdminClient();
    const { error } = await (supabase as any).rpc(
      "attach_owned_listing_media",
      {
        p_owner_user_id: ownerUserId,
        p_listing_id: listingId,
        p_urls: urls,
      },
    );
    if (error) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible d’associer les photos à l’annonce.",
        originalError: error,
      });
    }
  }

  async cleanupExpiredListingMedia(): Promise<{ deleted: number }> {
    if (config.dataMode === "demo") return { deleted: 0 };
    const supabase = getSupabaseAdminClient();
    const pendingCutoff = new Date(
      Date.now() - 24 * 60 * 60 * 1_000,
    ).toISOString();
    const readyCutoff = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1_000,
    ).toISOString();
    const [pending, ready] = await Promise.all([
      (supabase.from("listing_media_assets" as any) as any)
        .select("id,staging_path,public_path,status")
        .eq("status", "upload_pending")
        .lt("created_at", pendingCutoff)
        .limit(200),
      (supabase.from("listing_media_assets" as any) as any)
        .select("id,staging_path,public_path,status")
        .eq("status", "ready")
        .lt("created_at", readyCutoff)
        .limit(200),
    ]);
    if (pending.error) throw pending.error;
    if (ready.error) throw ready.error;

    let deleted = 0;
    for (const asset of [...(pending.data || []), ...(ready.data || [])]) {
      const stagingResult = await supabase.storage
        .from(this.stagingListingBucket)
        .remove([asset.staging_path]);
      if (stagingResult.error) throw stagingResult.error;
      if (asset.public_path) {
        const publicResult = await supabase.storage
          .from(this.publicListingBucket)
          .remove([asset.public_path]);
        if (publicResult.error) throw publicResult.error;
      }
      const { error } = await (
        supabase.from("listing_media_assets" as any) as any
      )
        .delete()
        .eq("id", asset.id)
        .in("status", ["upload_pending", "ready"]);
      if (error) throw error;
      deleted += 1;
    }
    return { deleted };
  }

  async rescanLegacyReadyAssets(
    limitPerType = 10,
  ): Promise<{ scanned: number; failed: number }> {
    if (config.dataMode === "demo") return { scanned: 0, failed: 0 };
    const limit = Math.max(1, Math.min(50, limitPerType));
    const supabase = getSupabaseAdminClient();
    const [listingAssets, privateAssets] = await Promise.all([
      (supabase.from("listing_media_assets" as any) as any)
        .select("id,owner_user_id")
        .in("status", ["ready", "attached"])
        .in("malware_scan_status", ["pending", "failed"])
        .order("created_at", { ascending: true })
        .limit(limit),
      (supabase.from("private_document_assets" as any) as any)
        .select("id,owner_user_id")
        .in("status", ["ready", "attached"])
        .in("malware_scan_status", ["pending", "failed"])
        .order("created_at", { ascending: true })
        .limit(limit),
    ]);
    if (listingAssets.error) throw listingAssets.error;
    if (privateAssets.error) throw privateAssets.error;
    let scanned = 0;
    let failed = 0;
    const tasks = [
      ...(listingAssets.data || []).map((asset: any) => ({
        ...asset,
        kind: "listing" as const,
      })),
      ...(privateAssets.data || []).map((asset: any) => ({
        ...asset,
        kind: "private" as const,
      })),
    ];
    for (const asset of tasks) {
      try {
        if (asset.kind === "listing") {
          await this.completeListingMediaUpload(asset.owner_user_id, asset.id);
        } else {
          await this.completePrivateDocumentUpload(
            asset.owner_user_id,
            asset.id,
          );
        }
        scanned += 1;
      } catch (error) {
        failed += 1;
        logger.error("legacy_upload_malware_rescan_failed", {
          assetId: asset.id,
          assetKind: asset.kind,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { scanned, failed };
  }

  async createPrivateSignedUrl(path: string, expiresInSeconds = 300) {
    const boundedExpiry = Math.min(900, Math.max(60, expiresInSeconds));
    const expiresAt = new Date(Date.now() + boundedExpiry * 1000).toISOString();
    if (config.dataMode === "demo") {
      return {
        signedUrl: `https://demo.shongre.test/private-document/${encodeURIComponent(path)}?expires=${encodeURIComponent(expiresAt)}`,
        expiresAt,
      };
    }
    const supabase = getSupabaseAdminClient();
    const { data: asset, error: assetError } = await (
      supabase.from("private_document_assets" as any) as any
    )
      .select("id")
      .eq("private_path", path)
      .eq("malware_scan_status", "clean")
      .in("status", ["ready", "attached"])
      .maybeSingle();
    if (assetError || !asset) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Document privé introuvable ou non contrôlé.",
        originalError: assetError,
      });
    }
    const { data, error } = await supabase.storage
      .from(this.privateDocumentBucket)
      .createSignedUrl(path, boundedExpiry);
    if (error || !data?.signedUrl) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: "Impossible de créer un accès temporaire au document.",
        originalError: error,
      });
    }
    return { signedUrl: data.signedUrl, expiresAt };
  }
}

export const storageService = new StorageService();
