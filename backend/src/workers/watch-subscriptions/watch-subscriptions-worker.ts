import { randomUUID } from "node:crypto";
import { formatMoney } from "@shongre/shared/money";
import {
  type IWatchSubscriptionRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";

const retryAt = (attemptCount: number) =>
  new Date(
    Date.now() + Math.min(6 * 60 * 60 * 1_000, 30_000 * 2 ** attemptCount),
  ).toISOString();

export class WatchSubscriptionsWorker {
  private readonly workerId: string;

  constructor(
    private readonly repository: IWatchSubscriptionRepository = repositories.watchSubscriptions,
    workerId = `watch-worker-${process.pid}-${randomUUID()}`,
  ) {
    this.workerId = workerId;
  }

  async run(limit = 50): Promise<{
    events: number;
    matchesCreated: number;
    notifications: number;
    retried: number;
  }> {
    const boundedLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
    const result = {
      events: 0,
      matchesCreated: 0,
      notifications: 0,
      retried: 0,
    };

    const events = await this.repository.claimEvents(
      this.workerId,
      boundedLimit,
      120,
    );
    for (const event of events) {
      try {
        result.matchesCreated += await this.repository.evaluateEvent(event.id);
        await this.repository.completeEvent({
          eventId: event.id,
          workerId: this.workerId,
          success: true,
        });
        result.events += 1;
      } catch (error) {
        await this.repository.completeEvent({
          eventId: event.id,
          workerId: this.workerId,
          success: false,
          errorCode: "WATCH_EVALUATION_FAILED",
          retryAt: retryAt(event.attempt_count),
        });
        result.retried += 1;
        logger.error("watch_event_evaluation_failed", {
          eventId: event.id,
          marketCode: event.market_code,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const matches = await this.repository.claimMatches(
      this.workerId,
      boundedLimit,
      120,
    );
    for (const match of matches) {
      try {
        const context = await this.repository.getMatchContext(match);
        if (!context) {
          await this.repository.completeMatch({
            matchId: match.id,
            workerId: this.workerId,
            success: true,
          });
          continue;
        }
        const { subscription, event } = context;
        const copy = this.notificationCopy(subscription.targetType, {
          title: subscription.title,
          amountMinor: event.current_price_minor,
          currency: event.currency,
        });
        const channels = (
          [
            subscription.channels.inApp ? "inApp" : null,
            subscription.channels.email ? "email" : null,
            subscription.channels.push ? "push" : null,
          ] as const
        ).filter((channel): channel is "inApp" | "email" | "push" =>
          Boolean(channel),
        );
        await notificationsService.dispatchNotification(
          subscription.userId,
          copy.type,
          copy.title,
          copy.body,
          `/annonce/${encodeURIComponent(event.listing_id)}`,
          "listings",
          event.market_code,
          channels,
          match.id,
        );
        const occurredAt = new Date().toISOString();
        await this.repository.markNotified(subscription.id, occurredAt);
        await this.repository.completeMatch({
          matchId: match.id,
          workerId: this.workerId,
          success: true,
        });
        result.notifications += 1;
      } catch (error) {
        await this.repository.completeMatch({
          matchId: match.id,
          workerId: this.workerId,
          success: false,
          errorCode: "WATCH_NOTIFICATION_FAILED",
          retryAt: retryAt(match.attempt_count),
        });
        result.retried += 1;
        logger.error("watch_notification_failed", {
          matchId: match.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  private notificationCopy(
    targetType: "listing_price" | "seller" | "saved_search",
    input: { title: string; amountMinor: number; currency: string },
  ): { type: string; title: string; body: string } {
    if (targetType === "listing_price") {
      return {
        type: "listing_price_drop",
        title: "Baisse de prix détectée",
        body: `${input.title} est maintenant à ${formatMoney(
          { amountMinor: input.amountMinor, currency: input.currency },
          "fr-FR",
        )}.`,
      };
    }
    if (targetType === "seller") {
      return {
        type: "seller_new_listing",
        title: "Nouvelle annonce d’un vendeur suivi",
        body: `${input.title} vient de publier une nouvelle annonce.`,
      };
    }
    return {
      type: "saved_search_match",
      title: "Nouvelle annonce pour votre recherche",
      body: `Une nouvelle annonce correspond à « ${input.title} ».`,
    };
  }
}

export const watchSubscriptionsWorker = new WatchSubscriptionsWorker();
