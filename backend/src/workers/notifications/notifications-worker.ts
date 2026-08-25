import { logger } from "../../infrastructure/logging/logger.js";
import { notificationsService } from "../../modules/notifications/notifications.service.js";
import {
  INotificationRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import {
  NotificationDeliveryProviderError,
  NotificationDeliveryProviders,
  notificationDeliveryProviders,
} from "../../integrations/providers/notification-delivery.provider.js";
import { randomUUID } from "node:crypto";

export class NotificationsWorker {
  private readonly workerId: string;

  constructor(
    private readonly notificationRepo: INotificationRepository = repositories.notifications,
    private readonly providers: NotificationDeliveryProviders = notificationDeliveryProviders,
    workerId = `notification-worker-${process.pid}-${randomUUID()}`,
  ) {
    this.workerId = workerId;
  }

  async processBatch(
    notifications: Array<{
      userId: string;
      type: string;
      title: string;
      body: string;
    }>,
  ) {
    logger.info(`Processing ${notifications.length} notifications in batch`);
    for (const notif of notifications) {
      await notificationsService.dispatchNotification(
        notif.userId,
        notif.type,
        notif.title,
        notif.body,
      );
    }
  }

  async run(limit = 50): Promise<{
    claimed: number;
    delivered: number;
    retried: number;
    deadLettered: number;
  }> {
    const deliveries = await this.notificationRepo.claimDeliveries(
      this.workerId,
      Math.max(1, Math.min(200, Math.trunc(limit))),
      120,
    );
    const result = {
      claimed: deliveries.length,
      delivered: 0,
      retried: 0,
      deadLettered: 0,
    };
    for (const delivery of deliveries) {
      try {
        const destinations =
          await this.notificationRepo.resolveDeliveryDestinations(delivery);
        if (destinations.length === 0) {
          throw new NotificationDeliveryProviderError(
            "No active destination is registered for this channel.",
            "NO_DESTINATION",
            true,
          );
        }
        const provider = this.providers[delivery.channel];
        const providerResult = await provider.send({
          delivery,
          destinations,
        });
        await this.notificationRepo.completeDelivery({
          deliveryId: delivery.id,
          workerId: this.workerId,
          success: true,
          providerId: providerResult.providerId,
          providerMessageId: providerResult.providerMessageId,
          receipt: providerResult.receipt,
        });
        result.delivered += 1;
      } catch (error) {
        const providerError =
          error instanceof NotificationDeliveryProviderError
            ? error
            : new NotificationDeliveryProviderError(
                String((error as Error)?.message || error),
                "DELIVERY_FAILED",
              );
        const retryAt = new Date(
          Date.now() +
            Math.min(6 * 60 * 60 * 1_000, 30_000 * 2 ** delivery.attemptNumber),
        ).toISOString();
        await this.notificationRepo.completeDelivery({
          deliveryId: delivery.id,
          workerId: this.workerId,
          success: false,
          permanentFailure: providerError.permanent,
          providerId: this.providers[delivery.channel].id,
          errorCode: providerError.code,
          errorMessage: providerError.message,
          retryAt,
        });
        if (providerError.permanent) result.deadLettered += 1;
        else result.retried += 1;
      }
    }
    if (deliveries.length > 0) {
      logger.info("notification_delivery_batch_completed", result);
    }
    return result;
  }
}

export const notificationsWorker = new NotificationsWorker();
