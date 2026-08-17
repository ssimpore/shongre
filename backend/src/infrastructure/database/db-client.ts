import { getSupabaseAdminClient, getSupabaseAnonClient } from '../supabase/supabase-client.js';
import { logger } from '../logging/logger.js';

export class DatabaseClient {
  public get admin() {
    return getSupabaseAdminClient();
  }

  public get client() {
    return getSupabaseAnonClient();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const isPlaceholder = !process.env.DATABASE_URL && (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project') || process.env.SUPABASE_URL.includes('127.0.0.1'));
      if (isPlaceholder && process.env.NODE_ENV !== 'production') {
        // Fast-path in local development when database is optional
        return true;
      }
      const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500));
      const queryPromise = (async () => {
        const { data, error } = await this.admin.from('markets').select('code').limit(1);
        return !error && Boolean(data);
      })();
      return await Promise.race([queryPromise, timeoutPromise]);
    } catch {
      return false;
    }
  }
}

export const db = new DatabaseClient();
