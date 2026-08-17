import { logger } from '../../infrastructure/logging/logger.js';
import { getSupabaseAdminClient } from '../../infrastructure/supabase/supabase-client.js';

export class LifecycleWorker {
  async runExpiredListingsCleanup(): Promise<number> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const now = new Date().toISOString();

      const { data } = await supabase
        .from('listings')
        .update({ status: 'archived', updated_at: now })
        .eq('status', 'published')
        .lt('expires_at', now)
        .select('id');

      const count = data?.length || 0;
      if (count > 0) {
        logger.info(`Lifecycle Worker archived ${count} expired listings.`);
      }
      return count;
    } catch (err: any) {
      logger.error(`Lifecycle Worker error: ${err.message}`);
      return 0;
    }
  }

  async runBoostsExpiration(): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const now = new Date().toISOString();

      await supabase
        .from('listings')
        .update({ is_urgent: false })
        .eq('is_urgent', true)
        .lt('urgent_expires_at', now);

      await supabase
        .from('listings')
        .update({ is_featured: false })
        .eq('is_featured', true)
        .lt('featured_expires_at', now);
    } catch (err: any) {
      logger.error(`Boosts expiration error: ${err.message}`);
    }
  }
}

export const lifecycleWorker = new LifecycleWorker();
