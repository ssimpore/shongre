import { NotificationItem } from "../../shared/types/index.js";
import { randomUUID } from "node:crypto";
import {
  INotificationRepository,
  NotificationCategory,
  NotificationCategoryPreference,
  NotificationPreferenceSet,
  type PushDevicePlatform,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { config } from "../../app/config/index.js";
import {
  parseWebPushSubscription,
  serializeWebPushSubscription,
} from "../../integrations/providers/notification-delivery.provider.js";
import { realtimeBroadcaster } from "../../infrastructure/realtime/realtime-broadcaster.js";
import { AppError } from "../../shared/errors/app-error.js";
import { getCountryConfig } from "@shongre/contracts";
import {
  BackgroundJobDispatcher,
  backgroundJobDispatcher,
} from "../../infrastructure/queue/background-job-dispatcher.js";

export class NotificationsService {
  constructor(
    private notificationRepo: INotificationRepository = repositories.notifications,
    private jobDispatcher: BackgroundJobDispatcher = backgroundJobDispatcher,
  ) {}

  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    return this.notificationRepo.getUserNotifications(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }

  /**
   * Needed by the HTTP layer to check that a notification belongs to the
   * caller before marking it read or deleting it — those routes take only a
   * notification id, which is otherwise enough to act on anyone's inbox.
   */
  async getNotificationById(
    notificationId: string,
  ): Promise<NotificationItem | null> {
    return this.notificationRepo.findById(notificationId);
  }

  async markAsRead(notificationId: string): Promise<void> {
    return this.notificationRepo.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return this.notificationRepo.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return this.notificationRepo.delete(notificationId);
  }

  async registerDevice(
    userId: string,
    token: string,
    platform: PushDevicePlatform,
    appVersion?: string,
  ): Promise<void> {
    if (platform === "web") {
      // A browser registers its Web Push subscription; the canonical
      // serialization is the device token, so the same browser upserts.
      const subscription = parseWebPushSubscription(String(token || ""));
      if (!subscription) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Abonnement de notification invalide.",
        });
      }
      if (!config.webPush) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          statusCode: 409,
          message: "Les notifications navigateur ne sont pas disponibles.",
        });
      }
      await this.notificationRepo.registerDevice(
        userId,
        serializeWebPushSubscription(subscription),
        "web",
        appVersion?.slice(0, 30),
      );
      return;
    }
    if (!/^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token || "")) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Jeton de notification invalide.",
      });
    }
    if (platform !== "ios" && platform !== "android") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Plateforme de notification invalide.",
      });
    }
    await this.notificationRepo.registerDevice(
      userId,
      token,
      platform,
      appVersion?.slice(0, 30),
    );
  }

  /** What a browser needs to subscribe, or that it cannot. */
  getWebPushConfig(): { enabled: boolean; publicKey?: string } {
    return config.webPush
      ? { enabled: true, publicKey: config.webPush.publicKey }
      : { enabled: false };
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    if (!token) return;
    await this.notificationRepo.unregisterDevice(userId, token);
  }

  async getPreferences(userId: string): Promise<
    NotificationPreferenceSet & {
      userId: string;
      updatedAt: string;
    }
  > {
    const saved = await this.notificationRepo.getPreferences(userId);
    return {
      ...this.defaultPreferences(),
      ...saved,
      userId,
      updatedAt: new Date().toISOString(),
    };
  }

  async updatePreferences(
    userId: string,
    input: Record<string, unknown>,
  ): Promise<
    NotificationPreferenceSet & {
      userId: string;
      updatedAt: string;
    }
  > {
    const current = await this.getPreferences(userId);
    const next = this.defaultPreferences();
    for (const category of Object.keys(next) as NotificationCategory[]) {
      const candidate = input?.[category];
      const previous = current[category];
      next[category] = this.normalizePreference(category, candidate, previous);
    }
    await this.notificationRepo.savePreferences(userId, next);
    return { ...next, userId, updatedAt: new Date().toISOString() };
  }

  async dispatchNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    linkUrl?: string,
    requestedCategory?: NotificationCategory,
    marketCode?: string,
    allowedChannels: Array<"inApp" | "email" | "push"> = [
      "inApp",
      "email",
      "push",
    ],
    notificationId?: string,
  ): Promise<NotificationItem> {
    if (
      !userId ||
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 255 ||
      typeof body !== "string" ||
      !body.trim() ||
      body.trim().length > 5_000
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le contenu de la notification est invalide.",
      });
    }
    if (linkUrl && (!linkUrl.startsWith("/") || linkUrl.startsWith("//"))) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le lien de notification doit rester interne à Shongre.",
      });
    }
    const country = getCountryConfig(marketCode || "");
    if (!country?.enabled) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le marché de notification est invalide.",
      });
    }
    const category = requestedCategory || this.resolveCategory(type);
    const preferences = await this.getPreferences(userId);
    const categoryPreference = preferences[category];
    const notif: NotificationItem = {
      id: notificationId || randomUUID(),
      userId,
      type,
      category,
      title: title.trim(),
      body: body.trim(),
      marketCode: country.code,
      linkUrl,
      isRead: false,
      inAppVisible:
        categoryPreference.inApp && allowedChannels.includes("inApp"),
      createdAt: new Date().toISOString(),
    };

    const channels = [
      ...(categoryPreference.email && allowedChannels.includes("email")
        ? (["email"] as const)
        : []),
      ...(categoryPreference.push && allowedChannels.includes("push")
        ? (["push"] as const)
        : []),
    ];
    const saved = await this.notificationRepo.saveWithDeliveries(
      notif,
      category,
      categoryPreference.inApp && allowedChannels.includes("inApp"),
      channels,
    );
    if (categoryPreference.inApp && allowedChannels.includes("inApp")) {
      await realtimeBroadcaster.broadcastEvent(
        `user:${userId}:notifications`,
        "notification_received",
        saved,
      );
    }
    if (channels.length > 0) {
      await this.jobDispatcher.enqueueDomainWake(
        "notification_delivery",
        saved.id,
      );
    }
    return saved;
  }

  private defaultPreferences(): NotificationPreferenceSet {
    return {
      messages: { inApp: true, email: false, push: true },
      transactions: {
        inApp: true,
        email: true,
        push: true,
        isMandatory: true,
      },
      listings: { inApp: true, email: true, push: false },
      delivery: {
        inApp: true,
        email: true,
        push: true,
        isMandatory: true,
      },
      delivery_opportunities: {
        inApp: false,
        email: false,
        push: false,
      },
      reviews: { inApp: true, email: false, push: true },
      promotions: { inApp: true, email: false, push: false },
      security: {
        inApp: true,
        email: true,
        push: true,
        isMandatory: true,
      },
      marketing: { inApp: false, email: false, push: false },
    };
  }

  private normalizePreference(
    category: NotificationCategory,
    input: unknown,
    fallback: NotificationCategoryPreference,
  ): NotificationCategoryPreference {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return { ...fallback };
    }
    const candidate = input as Record<string, unknown>;
    for (const channel of ["inApp", "email", "push"] as const) {
      if (typeof candidate[channel] !== "boolean") {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `Préférence ${category}.${channel} invalide.`,
        });
      }
    }
    const mandatory = ["transactions", "delivery", "security"].includes(
      category,
    );
    return {
      inApp: mandatory ? true : Boolean(candidate.inApp),
      email: mandatory ? true : Boolean(candidate.email),
      push: Boolean(candidate.push),
      ...(mandatory ? { isMandatory: true } : {}),
    };
  }

  private resolveCategory(type: string): NotificationCategory {
    const normalized = String(type || "").toLowerCase();
    if (/delivery\.request\.matched/.test(normalized))
      return "delivery_opportunities";
    if (/message|offer|conversation/.test(normalized)) return "messages";
    if (/payment|order|escrow|refund|payout|transaction/.test(normalized))
      return "transactions";
    if (/delivery|pickup|shipping|handover/.test(normalized)) return "delivery";
    if (/listing|publication|search/.test(normalized)) return "listings";
    if (/review|rating/.test(normalized)) return "reviews";
    if (/promotion|boost|subscription/.test(normalized)) return "promotions";
    if (/marketing|newsletter|campaign/.test(normalized)) return "marketing";
    return "security";
  }
}

export const notificationsService = new NotificationsService();
