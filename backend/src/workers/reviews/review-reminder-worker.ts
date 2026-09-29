import {
  repositories,
  type IListingRepository,
  type IReviewRepository,
  type IUserRepository,
} from "../../infrastructure/database/repositories/index.js";
import {
  errorDiagnostics,
  logger,
} from "../../infrastructure/logging/logger.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";

const DAY_MS = 86_400_000;

/**
 * Reminds each participant of a completed exchange, once, to review the
 * other party — after they have had a few days to receive and try the item,
 * and before the exchange is too old to remember.
 *
 * It reads only participants still owed a reminder, and claims each one
 * (00143) before the notification is dispatched: a claimed participant leaves
 * the next read, so a run always reaches new exchanges, and a crash between
 * claim and dispatch loses at most one reminder rather than sending a second.
 * A participant who already reviewed is never nudged.
 */
export class ReviewReminderWorker {
  constructor(
    private readonly reviews: IReviewRepository = repositories.reviews,
    private readonly users: IUserRepository = repositories.users,
    private readonly listings: IListingRepository = repositories.listings,
    private readonly notBeforeDays = 3,
    private readonly notAfterDays = 14,
    private readonly batchSize = 200,
    private readonly maxBatchesPerRun = 10,
  ) {}

  async run(now = new Date()): Promise<{ reminded: number; skipped: number }> {
    const window = {
      notBeforeIso: new Date(
        now.getTime() - this.notAfterDays * DAY_MS,
      ).toISOString(),
      notAfterIso: new Date(
        now.getTime() - this.notBeforeDays * DAY_MS,
      ).toISOString(),
    };
    let reminded = 0;
    let skipped = 0;
    for (let batch = 0; batch < this.maxBatchesPerRun; batch += 1) {
      const due = await this.reviews.listDueReminders({
        ...window,
        limit: this.batchSize,
      });
      let failed = false;
      for (const {
        orderId,
        listingId,
        recipientId,
        counterpartId,
        recipientRole,
      } of due) {
        try {
          if (
            (await this.reviews.getOrderReview(orderId, recipientId)) ||
            !(await this.reviews.claimReminder({
              orderId,
              userId: recipientId,
            }))
          ) {
            skipped += 1;
            continue;
          }
          const [counterpart, listing] = await Promise.all([
            this.users.findById(counterpartId),
            this.listings.findById(listingId),
          ]);
          if (!listing) {
            skipped += 1;
            continue;
          }
          const role = recipientRole === "buyer" ? "vendeur" : "acheteur";
          await notificationsService.dispatchNotification(
            recipientId,
            "review_reminder",
            "Comment s’est passé votre échange ?",
            `Partagez votre expérience avec ${counterpart?.name ?? `votre ${role}`} pour « ${listing.title} ». Votre avis aide la communauté.`,
            `/compte/achats?transactionId=${encodeURIComponent(orderId)}`,
            "reviews",
            listing.marketCode,
          );
          reminded += 1;
        } catch (error) {
          failed = true;
          logger.error("review_reminder_failed", {
            orderId,
            ...errorDiagnostics(error),
          });
        }
      }
      // A short read means the window is drained. A failure ends the run: an
      // unclaimed pair stays due for the next one, and a dependency outage is
      // not retried batch after batch.
      if (due.length < this.batchSize || failed) break;
    }
    if (reminded > 0) {
      logger.info("review_reminders_sent", { reminded, skipped });
    }
    return { reminded, skipped };
  }
}

export const reviewReminderWorker = new ReviewReminderWorker();
