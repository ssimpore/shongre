import {
  repositories,
  type IListingRepository,
  type IOrderRepository,
  type IReviewRepository,
  type IUserRepository,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";

const DAY_MS = 86_400_000;

/**
 * Reminds each participant of a completed exchange, once, to review the
 * other party — after they have had a few days to receive and try the item,
 * and before the exchange is too old to remember.
 *
 * The reminder row (00143) is claimed before the notification is dispatched,
 * so a crash between the two loses at most one reminder rather than sending
 * a second; a participant who already reviewed is never nudged.
 */
export class ReviewReminderWorker {
  constructor(
    private readonly orders: IOrderRepository = repositories.orders,
    private readonly reviews: IReviewRepository = repositories.reviews,
    private readonly users: IUserRepository = repositories.users,
    private readonly listings: IListingRepository = repositories.listings,
    private readonly notBeforeDays = 3,
    private readonly notAfterDays = 14,
    private readonly batchSize = 200,
  ) {}

  async run(now = new Date()): Promise<{ reminded: number; skipped: number }> {
    const candidates = await this.orders.listCompletedBetween(
      new Date(now.getTime() - this.notAfterDays * DAY_MS).toISOString(),
      new Date(now.getTime() - this.notBeforeDays * DAY_MS).toISOString(),
      this.batchSize,
    );
    let reminded = 0;
    let skipped = 0;
    for (const order of candidates) {
      for (const userId of [order.buyerId, order.sellerId]) {
        const counterpartId =
          userId === order.buyerId ? order.sellerId : order.buyerId;
        try {
          if (await this.reviews.getOrderReview(order.id, userId)) {
            skipped += 1;
            continue;
          }
          if (
            !(await this.reviews.claimReminder({ orderId: order.id, userId }))
          ) {
            skipped += 1;
            continue;
          }
          const [counterpart, listing] = await Promise.all([
            this.users.findById(counterpartId),
            this.listings.findById(order.listingId),
          ]);
          if (!listing) {
            skipped += 1;
            continue;
          }
          const role = userId === order.buyerId ? "vendeur" : "acheteur";
          await notificationsService.dispatchNotification(
            userId,
            "review_reminder",
            "Comment s’est passé votre échange ?",
            `Partagez votre expérience avec ${counterpart?.name ?? `votre ${role}`} pour « ${listing.title} ». Votre avis aide la communauté.`,
            `/compte/achats?transactionId=${encodeURIComponent(order.id)}`,
            "reviews",
            listing.marketCode,
          );
          reminded += 1;
        } catch (error) {
          logger.error("review_reminder_failed", {
            orderId: order.id,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    }
    if (reminded > 0) {
      logger.info("review_reminders_sent", { reminded, skipped });
    }
    return { reminded, skipped };
  }
}

export const reviewReminderWorker = new ReviewReminderWorker();
