import { getSupabaseAdminClient } from '../supabase/supabase-client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { config } from '../../app/config/index.js';

export class StorageService {
  private bucketName = 'listing-media';

  async uploadFile(path: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(path, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new AppError({
        code: 'INTERNAL_ERROR',
        message: `Failed to upload file to storage: ${error.message}`,
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  async deleteFile(path: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from(this.bucketName).remove([path]);
    if (error) {
      throw new AppError({
        code: 'INTERNAL_ERROR',
        message: `Failed to delete file from storage: ${error.message}`,
      });
    }
  }

  async createPrivateSignedUrl(
    path: string,
    expiresInSeconds = 300,
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const boundedExpiry = Math.min(900, Math.max(60, expiresInSeconds));
    const expiresAt = new Date(Date.now() + boundedExpiry * 1000).toISOString();
    if (config.dataMode === 'demo') {
      return {
        signedUrl: `https://demo.shongre.test/private-document/${encodeURIComponent(path)}?expires=${encodeURIComponent(expiresAt)}`,
        expiresAt,
      };
    }
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from('documents-private')
      .createSignedUrl(path, boundedExpiry);
    if (error || !data?.signedUrl) {
      throw new AppError({
        code: 'INTERNAL_ERROR',
        message: 'Impossible de créer un accès temporaire au document.',
        originalError: error,
      });
    }
    return { signedUrl: data.signedUrl, expiresAt };
  }
}

export const storageService = new StorageService();
