import { logger } from '../../infrastructure/logging/logger.js';
import { notificationsService } from '../../modules/notifications/notifications.service.js';

export class NotificationsWorker {
  async processBatch(notifications: Array<{ userId: string; type: string; title: string; body: string }>) {
    logger.info(`Processing ${notifications.length} notifications in batch`);
    for (const notif of notifications) {
      await notificationsService.dispatchNotification(notif.userId, notif.type, notif.title, notif.body);
    }
  }
}

export const notificationsWorker = new NotificationsWorker();
