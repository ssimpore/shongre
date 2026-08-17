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
      const { data, error } = await this.admin.from('markets').select('code').limit(1);
      if (error) {
        logger.warn('Database health check warning', { error: error.message });
        return false;
      }
      return Boolean(data);
    } catch (err: any) {
      logger.error('Database connection failed', { error: err.message });
      return false;
    }
  }
}

export const db = new DatabaseClient();
