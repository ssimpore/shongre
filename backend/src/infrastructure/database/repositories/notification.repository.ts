import { NotificationItem } from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import { buildPublicUrl, getCountryConfig } from "@shongre/contracts";
import { requireMarketCode } from "../../../shared/market/market-code.js";

export type NotificationCategory =
  | "messages"
  | "transactions"
  | "listings"
  | "delivery"
  | "reviews"
  | "promotions"
  | "security"
  | "marketing";
export type NotificationDeliveryChannel = "email" | "push";

export interface NotificationCategoryPreference {
  inApp: boolean;
  email: boolean;
  push: boolean;
  isMandatory?: boolean;
}

export type NotificationPreferenceSet = Record<
  NotificationCategory,
  NotificationCategoryPreference
>;

export interface ClaimedNotificationDelivery {
  id: string;
  notificationId: string;
  userId: string;
  channel: NotificationDeliveryChannel;
  idempotencyKey: string;
  attemptNumber: number;
  title: string;
  body: string;
  marketCode: string;
  linkUrl?: string;
  category: NotificationCategory;
  type: string;
}

export interface CompleteNotificationDeliveryInput {
  deliveryId: string;
  workerId: string;
  success: boolean;
  permanentFailure?: boolean;
  providerId?: string;
  providerMessageId?: string;
  receipt?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  retryAt?: string;
}

export interface INotificationRepository {
  getUserNotifications(userId: string): Promise<NotificationItem[]>;
  findById(notificationId: string): Promise<NotificationItem | null>;
  getUnreadCount(userId: string): Promise<number>;
  save(notification: NotificationItem): Promise<NotificationItem>;
  saveWithDeliveries(
    notification: NotificationItem,
    category: NotificationCategory,
    inAppVisible: boolean,
    channels: NotificationDeliveryChannel[],
  ): Promise<NotificationItem>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  delete(notificationId: string): Promise<void>;
  registerDevice(
    userId: string,
    token: string,
    platform: "ios" | "android",
    appVersion?: string,
  ): Promise<void>;
  unregisterDevice(userId: string, token: string): Promise<void>;
  getPreferences(userId: string): Promise<Partial<NotificationPreferenceSet>>;
  savePreferences(
    userId: string,
    preferences: NotificationPreferenceSet,
  ): Promise<void>;
  claimDeliveries(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<ClaimedNotificationDelivery[]>;
  resolveDeliveryDestinations(
    delivery: ClaimedNotificationDelivery,
  ): Promise<string[]>;
  completeDelivery(input: CompleteNotificationDeliveryInput): Promise<void>;
  recordDeliveryReceipt(input: {
    providerId: string;
    providerMessageId: string;
    status:
      "accepted" | "delivered" | "bounced" | "complained" | "failed" | "opened";
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<string>;
}

export const CANONICAL_DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif_1",
    userId: "user_camille",
    type: "escrow",
    title: "Paiement confirmé",
    body: "Le prestataire de paiement a confirmé le paiement de 250 € pour votre annonce.",
    isRead: false,
    createdAt: new Date().toISOString(),
  },
];

export class DemoNotificationRepository implements INotificationRepository {
  private notifications: Map<string, NotificationItem> = new Map();
  private devices = new Map<
    string,
    { userId: string; platform: "ios" | "android"; appVersion?: string }
  >();
  private preferences = new Map<string, NotificationPreferenceSet>();
  private deliveries = new Map<
    string,
    ClaimedNotificationDelivery & {
      status: "pending" | "leased" | "retry" | "delivered" | "dead_letter";
      attempts: number;
      maxAttempts: number;
      availableAt: string;
      leaseOwner?: string;
      leaseExpiresAt?: string;
    }
  >();
  private receiptIds = new Map<string, string>();

  constructor(
    initialNotifs: NotificationItem[] = CANONICAL_DEMO_NOTIFICATIONS,
  ) {
    this.reset(initialNotifs);
  }

  reset(initialNotifs: NotificationItem[] = CANONICAL_DEMO_NOTIFICATIONS) {
    this.notifications.clear();
    this.preferences.clear();
    this.deliveries.clear();
    this.receiptIds.clear();
    initialNotifs.forEach((n) => this.notifications.set(n.id, { ...n }));
  }

  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    const list = Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId,
    );
    if (list.length === 0) {
      return [
        {
          id: `notif_${userId}`,
          userId,
          type: "system",
          title: "Bienvenue sur Shongre",
          body: "Votre espace membre est configuré et sécurisé.",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return list.map((n) => ({ ...n }));
  }

  async findById(notificationId: string): Promise<NotificationItem | null> {
    const found = this.notifications.get(notificationId);
    return found ? { ...found } : null;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getUserNotifications(userId);
    return list.filter((n) => !n.isRead).length;
  }

  async save(notification: NotificationItem): Promise<NotificationItem> {
    this.notifications.set(notification.id, { ...notification });
    return { ...notification };
  }

  async saveWithDeliveries(
    notification: NotificationItem,
    category: NotificationCategory,
    inAppVisible: boolean,
    channels: NotificationDeliveryChannel[],
  ): Promise<NotificationItem> {
    const saved = await this.save({
      ...notification,
      category,
      inAppVisible,
    });
    for (const channel of Array.from(new Set(channels))) {
      const id = `${notification.id}:${channel}`;
      this.deliveries.set(id, {
        id,
        notificationId: notification.id,
        userId: notification.userId,
        channel,
        idempotencyKey: id,
        attemptNumber: 0,
        title: notification.title,
        body: notification.body,
        marketCode: requireMarketCode(notification.marketCode),
        linkUrl: notification.linkUrl,
        category,
        type: notification.type,
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        availableAt: notification.createdAt,
      });
    }
    return saved;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notif = this.notifications.get(notificationId);
    if (notif) notif.isRead = true;
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.notifications.forEach((n) => {
      if (n.userId === userId) n.isRead = true;
    });
  }

  async delete(notificationId: string): Promise<void> {
    this.notifications.delete(notificationId);
  }

  async registerDevice(
    userId: string,
    token: string,
    platform: "ios" | "android",
    appVersion?: string,
  ): Promise<void> {
    this.devices.set(token, { userId, platform, appVersion });
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    const device = this.devices.get(token);
    if (device?.userId === userId) this.devices.delete(token);
  }

  async getPreferences(
    userId: string,
  ): Promise<Partial<NotificationPreferenceSet>> {
    return { ...(this.preferences.get(userId) || {}) };
  }

  async savePreferences(
    userId: string,
    preferences: NotificationPreferenceSet,
  ): Promise<void> {
    this.preferences.set(userId, structuredClone(preferences));
  }

  async claimDeliveries(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<ClaimedNotificationDelivery[]> {
    const now = Date.now();
    const claimed: ClaimedNotificationDelivery[] = [];
    for (const delivery of this.deliveries.values()) {
      if (claimed.length >= limit) break;
      const claimable =
        ((delivery.status === "pending" || delivery.status === "retry") &&
          Date.parse(delivery.availableAt) <= now) ||
        (delivery.status === "leased" &&
          Date.parse(delivery.leaseExpiresAt || "") <= now);
      if (!claimable) continue;
      delivery.status = "leased";
      delivery.attempts += 1;
      delivery.attemptNumber = delivery.attempts;
      delivery.leaseOwner = workerId;
      delivery.leaseExpiresAt = new Date(
        now + leaseSeconds * 1_000,
      ).toISOString();
      claimed.push({ ...delivery });
    }
    return claimed;
  }

  async completeDelivery(
    input: CompleteNotificationDeliveryInput,
  ): Promise<void> {
    const delivery = this.deliveries.get(input.deliveryId);
    if (!delivery || delivery.leaseOwner !== input.workerId) {
      throw new Error("Delivery lease ownership mismatch.");
    }
    delivery.leaseOwner = undefined;
    delivery.leaseExpiresAt = undefined;
    if (input.success) delivery.status = "delivered";
    else if (
      input.permanentFailure ||
      delivery.attempts >= delivery.maxAttempts
    )
      delivery.status = "dead_letter";
    else {
      delivery.status = "retry";
      delivery.availableAt = input.retryAt || new Date().toISOString();
    }
  }

  async resolveDeliveryDestinations(
    delivery: ClaimedNotificationDelivery,
  ): Promise<string[]> {
    return delivery.channel === "email"
      ? [`${delivery.userId}@demo.shongre.invalid`]
      : [
          `ExpoPushToken[demo_${delivery.userId.replace(/[^A-Za-z0-9_-]/g, "")}]`,
        ];
  }

  async recordDeliveryReceipt(input: {
    providerId: string;
    providerMessageId: string;
    status:
      "accepted" | "delivered" | "bounced" | "complained" | "failed" | "opened";
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<string> {
    const key = `${input.providerId}:${input.providerMessageId}:${input.status}:${input.occurredAt}`;
    const existing = this.receiptIds.get(key);
    if (existing) return existing;
    const id = `receipt_${this.receiptIds.size + 1}`;
    this.receiptIds.set(key, id);
    return id;
  }
}

export class PostgresNotificationRepository implements INotificationRepository {
  private mapRowToNotification(row: any): NotificationItem {
    const marketCode = requireMarketCode(row.market_code);
    const linkRoute = row.link_route || row.link_url;
    const country = getCountryConfig(marketCode);
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      category: row.category || undefined,
      title: row.title,
      body: row.body,
      marketCode,
      linkUrl:
        linkRoute && country
          ? buildPublicUrl({ country: country.code, route: linkRoute })
          : undefined,
      isRead: Boolean(row.is_read),
      inAppVisible: row.in_app_visible !== false,
      createdAt: row.created_at,
    };
  }

  async findById(notificationId: string): Promise<NotificationItem | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notificationId)
        .maybeSingle();
      if (error) databaseFailure("notifications.findById", error);
      if (!data) return null;
      return this.mapRowToNotification(data);
    } catch (error) {
      databaseFailure("notifications.findById", error);
    }
  }

  async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("in_app_visible", true)
        .order("created_at", { ascending: false });

      if (error || !data)
        databaseFailure("notifications.getUserNotifications", error);
      return data.map((r: any) => this.mapRowToNotification(r));
    } catch (error) {
      databaseFailure("notifications.getUserNotifications", error);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseAdminClient();
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) databaseFailure("notifications.getUnreadCount", error);
      return count || 0;
    } catch (error) {
      databaseFailure("notifications.getUnreadCount", error);
    }
  }

  async save(notification: NotificationItem): Promise<NotificationItem> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: notification.id.includes("-") ? notification.id : undefined,
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      market_code: requireMarketCode(notification.marketCode),
      link_route: notification.linkUrl || null,
      link_url: notification.linkUrl || null,
      is_read: notification.isRead,
      created_at: notification.createdAt,
    };

    const { data, error } = await (supabase
      .from("notifications")
      .insert(payload as any)
      .select()
      .single() as any);
    if (error || !data) {
      throw new Error(`Failed to save notification: ${error?.message}`);
    }
    return this.mapRowToNotification(data);
  }

  async saveWithDeliveries(
    notification: NotificationItem,
    category: NotificationCategory,
    inAppVisible: boolean,
    channels: NotificationDeliveryChannel[],
  ): Promise<NotificationItem> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "create_notification_with_deliveries",
      {
        p_id: notification.id,
        p_user_id: notification.userId,
        p_type: notification.type,
        p_category: category,
        p_title: notification.title,
        p_body: notification.body,
        p_link_url: "",
        p_market_code: requireMarketCode(notification.marketCode),
        p_link_route: notification.linkUrl || "",
        p_in_app_visible: inAppVisible,
        p_channels: Array.from(new Set(channels)),
        p_created_at: notification.createdAt,
      },
    );
    if (error || !Array.isArray(data) || !data[0]) {
      databaseFailure("notifications.saveWithDeliveries", error);
    }
    return this.mapRowToNotification(data[0]);
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await (supabase.from("notifications" as any) as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) databaseFailure("notifications.markAsRead", error);
    } catch (error) {
      databaseFailure("notifications.markAsRead", error);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await (supabase.from("notifications" as any) as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) databaseFailure("notifications.markAllAsRead", error);
    } catch (error) {
      databaseFailure("notifications.markAllAsRead", error);
    }
  }

  async delete(notificationId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await (supabase.from("notifications" as any) as any)
        .delete()
        .eq("id", notificationId);
      if (error) databaseFailure("notifications.delete", error);
    } catch (error) {
      databaseFailure("notifications.delete", error);
    }
  }

  async registerDevice(
    userId: string,
    token: string,
    platform: "ios" | "android",
    appVersion?: string,
  ): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("push_device_tokens").upsert(
      {
        user_id: userId,
        token,
        platform,
        app_version: appVersion || null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error)
      throw new Error(`Failed to register push device: ${error.message}`);
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("push_device_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("token", token);
    if (error)
      throw new Error(`Failed to unregister push device: ${error.message}`);
  }

  async getPreferences(
    userId: string,
  ): Promise<Partial<NotificationPreferenceSet>> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notification_preferences" as any)
      .select("category, in_app_enabled, email_enabled, push_enabled")
      .eq("user_id", userId);
    if (error || !data) databaseFailure("notifications.getPreferences", error);
    return Object.fromEntries(
      data.map((row: any) => [
        row.category,
        {
          inApp: Boolean(row.in_app_enabled),
          email: Boolean(row.email_enabled),
          push: Boolean(row.push_enabled),
          isMandatory: ["transactions", "delivery", "security"].includes(
            row.category,
          ),
        },
      ]),
    );
  }

  async savePreferences(
    userId: string,
    preferences: NotificationPreferenceSet,
  ): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const rows = Object.entries(preferences).map(([category, preference]) => ({
      user_id: userId,
      category,
      in_app_enabled: preference.inApp,
      email_enabled: preference.email,
      push_enabled: preference.push,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase
      .from("notification_preferences" as any)
      .upsert(rows as any, { onConflict: "user_id,category" }) as any);
    if (error) databaseFailure("notifications.savePreferences", error);
  }

  async claimDeliveries(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<ClaimedNotificationDelivery[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "claim_notification_deliveries",
      {
        p_worker_id: workerId,
        p_limit: limit,
        p_lease_seconds: leaseSeconds,
      },
    );
    if (error || !data) databaseFailure("notifications.claimDeliveries", error);
    return data.map((row: any) => ({
      id: row.id,
      notificationId: row.notification_id,
      userId: row.user_id,
      channel: row.channel,
      idempotencyKey: row.idempotency_key,
      attemptNumber: Number(row.attempt_number),
      title: row.title,
      body: row.body,
      marketCode: requireMarketCode(row.market_code),
      linkUrl: (() => {
        const route = row.link_route || row.link_url;
        const country = getCountryConfig(requireMarketCode(row.market_code));
        return route && country
          ? buildPublicUrl({ country: country.code, route })
          : undefined;
      })(),
      category: row.category,
      type: row.type,
    }));
  }

  async completeDelivery(
    input: CompleteNotificationDeliveryInput,
  ): Promise<void> {
    const supabase = getSupabaseAdminClient();
    const { error } = await (supabase as any).rpc(
      "complete_notification_delivery",
      {
        p_delivery_id: input.deliveryId,
        p_worker_id: input.workerId,
        p_success: input.success,
        p_permanent_failure: input.permanentFailure || false,
        p_provider_id: input.providerId || "",
        p_provider_message_id: input.providerMessageId || "",
        p_receipt: input.receipt || {},
        p_error_code: input.errorCode || "",
        p_error_message: input.errorMessage || "",
        p_retry_at: input.retryAt || null,
      },
    );
    if (error) databaseFailure("notifications.completeDelivery", error);
  }

  async resolveDeliveryDestinations(
    delivery: ClaimedNotificationDelivery,
  ): Promise<string[]> {
    const supabase = getSupabaseAdminClient();
    if (delivery.channel === "email") {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", delivery.userId)
        .maybeSingle();
      if (error)
        databaseFailure("notifications.resolveEmailDestination", error);
      return data?.email ? [String(data.email)] : [];
    }
    const { data, error } = await supabase
      .from("push_device_tokens")
      .select("token")
      .eq("user_id", delivery.userId)
      .order("last_seen_at", { ascending: false });
    if (error || !data)
      databaseFailure("notifications.resolvePushDestinations", error);
    return data.map((row: any) => String(row.token)).filter(Boolean);
  }

  async recordDeliveryReceipt(input: {
    providerId: string;
    providerMessageId: string;
    status:
      "accepted" | "delivered" | "bounced" | "complained" | "failed" | "opened";
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<string> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "record_notification_delivery_receipt",
      {
        p_provider_id: input.providerId,
        p_provider_message_id: input.providerMessageId,
        p_status: input.status,
        p_payload: input.payload,
        p_occurred_at: input.occurredAt,
      },
    );
    if (error || !data)
      databaseFailure("notifications.recordDeliveryReceipt", error);
    return String(data);
  }
}
