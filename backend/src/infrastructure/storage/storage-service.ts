import { getSupabaseAdminClient } from '../supabase/supabase-client.js';
import { AppError } from '../../shared/errors/app-error.js';

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
}

export const storageService = new StorageService();
