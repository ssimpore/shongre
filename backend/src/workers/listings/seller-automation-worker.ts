import {
  repositories,
  type IListingRepository,
  type IUserRepository,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";

/** Renewals a listing may receive before it expires for good. */
export const LISTING_AUTO_RENEW_MAX_CYCLES = 3;

/**
 * The seller's calendar, kept by the database rather than by the seller:
 * listings that opted in are renewed as they expire, drafts scheduled for
 * later are published on time, and absences end when their date passes.
 *
 * Every step is a database function that claims and changes rows in one
 * statement, so a run cut short renews, publishes or resumes at most once
 * per row. Runs before the expiry cleanup, so an opted-in listing is renewed
 * rather than archived.
 */
export class SellerAutomationWorker {
  constructor(
    private readonly listings: IListingRepository = repositories.listings,
    private readonly users: IUserRepository = repositories.users,
    private readonly batchSize = 500,
  ) {}

  async run(): Promise<{
    renewed: number;
    published: number;
    returnedSellers: number;
  }> {
    const renewed = await this.listings.renewExpiringListings({
      maxCycles: LISTING_AUTO_RENEW_MAX_CYCLES,
      limit: this.batchSize,
    });
    for (const listing of renewed) {
      await this.notify(
        listing.sellerId,
        "listing_renewed",
        "Annonce renouvelée automatiquement",
        `« ${listing.title} » reste en ligne jusqu’au ${new Date(listing.expiresAt).toLocaleDateString("fr-FR")}.`,
        listing.id,
        listing.marketCode,
      );
    }

    const published = await this.listings.publishScheduledListings(
      this.batchSize,
    );
    for (const listing of published) {
      await this.notify(
        listing.sellerId,
        listing.status === "published"
          ? "listing_scheduled_published"
          : "listing_scheduled_review",
        listing.status === "published"
          ? "Votre annonce programmée est en ligne"
          : "Votre annonce programmée est en cours de vérification",
        listing.status === "published"
          ? `« ${listing.title} » est maintenant visible par les acheteurs.`
          : `« ${listing.title} » sera publiée après vérification par notre équipe.`,
        listing.id,
        listing.marketCode,
      );
    }

    const returned = await this.users.resumeReturnedSellers(this.batchSize);
    if (renewed.length || published.length || returned.length) {
      logger.info("seller_automation_completed", {
        renewed: renewed.length,
        published: published.length,
        returnedSellers: returned.length,
      });
    }
    return {
      renewed: renewed.length,
      published: published.length,
      returnedSellers: returned.length,
    };
  }

  private async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    listingId: string,
    marketCode: string,
  ): Promise<void> {
    try {
      await notificationsService.dispatchNotification(
        userId,
        type,
        title,
        body,
        `/annonce/${encodeURIComponent(listingId)}`,
        "listings",
        marketCode,
      );
    } catch (error) {
      // The state change already happened; a lost notification is not a
      // reason to fail the run or to change the listing back.
      logger.error("seller_automation_notification_failed", {
        listingId,
        type,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}

export const sellerAutomationWorker = new SellerAutomationWorker();
