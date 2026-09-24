import {
  errorDiagnostics,
  logger,
} from "../../infrastructure/logging/logger.js";
import { databaseFailure } from "../../infrastructure/database/repositories/repository-error.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { retryDatabaseSerializationFailure } from "../../infrastructure/database/serialization-retry.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";

/**
 * Expiry passes throw on a database failure rather than reporting "nothing to
 * do": the scheduled runtime records the failed attempt, retries it with
 * backoff and alerts, where a swallowed error left expired listings online
 * with a healthy-looking job.
 */
export class LifecycleWorker {
  async runExpiredListingsCleanup(): Promise<number> {
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
    if (error) databaseFailure("lifecycle.archiveExpiredListings", error);

    const count = data?.length || 0;
    if (count > 0) {
      logger.info("lifecycle_expired_listings_archived", { count });
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
      } catch (notificationError) {
        // The listing is already archived; one undelivered notice must not
        // fail the pass and re-archive nothing on retry.
        logger.error("lifecycle_expiry_notification_failed", {
          listingId: row.id,
          ...errorDiagnostics(notificationError),
        });
      }
    }
    return count;
  }

  async runBoostsExpiration(): Promise<void> {
    const supabase = getSupabaseAdminClient() as any;
    const now = new Date().toISOString();

    const urgent = await supabase
      .from("listings")
      .update({ is_urgent: false })
      .eq("is_urgent", true)
      .lt("urgent_expires_at", now);
    if (urgent.error)
      databaseFailure("lifecycle.expireUrgentFlags", urgent.error);

    const featured = await supabase
      .from("listings")
      .update({ is_featured: false })
      .eq("is_featured", true)
      .lt("featured_expires_at", now);
    if (featured.error)
      databaseFailure("lifecycle.expireFeaturedFlags", featured.error);
  }
}

export const lifecycleWorker = new LifecycleWorker();
