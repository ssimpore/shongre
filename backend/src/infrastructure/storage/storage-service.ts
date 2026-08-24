import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "../supabase/supabase-client.js";
import { AppError } from "../../shared/errors/app-error.js";
import { config } from "../../app/config/index.js";

const LISTING_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
const LISTING_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const extensionFor = (contentType: string) =>
  contentType === "image/jpeg"
    ? "jpg"
    : contentType === "image/png"
      ? "png"
      : "webp";

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

export class StorageService {
  private readonly publicListingBucket = "listing-media";
  private readonly stagingListingBucket = "listing-media-staging";

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
    if (asset.status === "ready" || asset.status === "attached") {
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
      .in("public_url", urls);
    if (error || data?.length !== urls.length) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Une ou plusieurs photos ne vous appartiennent pas.",
      });
    }
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

  async uploadFile(path: string, fileBuffer: Buffer, contentType: string) {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(this.publicListingBucket)
      .upload(path, fileBuffer, { contentType, upsert: false });
    if (error) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: `Failed to upload file to storage: ${error.message}`,
      });
    }
    return supabase.storage
      .from(this.publicListingBucket)
      .getPublicUrl(data.path).data.publicUrl;
  }

  async deleteFile(path: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(this.publicListingBucket)
      .remove([path]);
    if (error) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: `Failed to delete file from storage: ${error.message}`,
      });
    }
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
    const { data, error } = await supabase.storage
      .from("documents-private")
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
