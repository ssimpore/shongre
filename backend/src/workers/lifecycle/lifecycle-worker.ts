import { logger } from "../../infrastructure/logging/logger.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { retryDatabaseSerializationFailure } from "../../infrastructure/database/serialization-retry.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";

export class LifecycleWorker {
  async runExpiredListingsCleanup(): Promise<number> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const now = new Date().toISOString();

      const { data, error } = await retryDatabaseSerializationFailure<any>(() =>
        supabase
          .from("listings")
          .update({ status: "archived", updated_at: now })
          .eq("status", "published")
          .lt("expires_at", now)
          .select("id, seller_id, title, market_code"),
      );
      if (error) throw error;

      const count = data?.length || 0;
      if (count > 0) {
        logger.info(`Lifecycle Worker archived ${count} expired listings.`);
      }
      // The seller learns that the listing is gone and where to republish it;
      // an opted-in listing was renewed by the automation pass before this.
      for (const row of (data || []) as Array<{
        id: string;
        seller_id: string;
        title: string;
        market_code: string;
      }>) {
        try {
          await notificationsService.dispatchNotification(
            row.seller_id,
            "listing_expired",
            "Votre annonce a expiré",
            `« ${row.title} » n’est plus en ligne. Republiez-la depuis votre espace vendeur si l’article est toujours disponible.`,
            "/compte/annonces",
            "listings",
            row.market_code,
          );
        } catch (notificationError: any) {
          logger.error(
            `Lifecycle Worker could not notify expiry for ${row.id}: ${notificationError.message}`,
          );
        }
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
        .from("listings")
        .update({ is_urgent: false })
        .eq("is_urgent", true)
        .lt("urgent_expires_at", now);

      await supabase
        .from("listings")
        .update({ is_featured: false })
        .eq("is_featured", true)
        .lt("featured_expires_at", now);
    } catch (err: any) {
      logger.error(`Boosts expiration error: ${err.message}`);
    }
  }
}

export const lifecycleWorker = new LifecycleWorker();
