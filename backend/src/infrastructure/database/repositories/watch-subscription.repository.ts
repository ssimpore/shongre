import type {
  CreateWatchSubscriptionInput,
  UpdateWatchSubscriptionInput,
  WatchSubscription,
  WatchSearchFilter,
} from "@shongre/contracts/watch-subscriptions";
import type { Database } from "../../../generated/database.types.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

type SubscriptionRow =
  Database["public"]["Tables"]["watch_subscriptions"]["Row"];
export type WatchEventRow = Database["public"]["Tables"]["watch_events"]["Row"];
export type WatchMatchRow =
  Database["public"]["Tables"]["watch_matches"]["Row"];

export interface OwnedWatchSubscription extends WatchSubscription {
  userId: string;
}

export interface WatchMatchContext {
  match: WatchMatchRow;
  subscription: OwnedWatchSubscription;
  event: WatchEventRow;
}

export interface IWatchSubscriptionRepository {
  list(userId: string, marketCode: string): Promise<WatchSubscription[]>;
  findOwned(
    id: string,
    userId: string,
    marketCode: string,
  ): Promise<WatchSubscription | null>;
  upsert(
    userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription>;
  updateOwned(
    id: string,
    userId: string,
    marketCode: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription | null>;
  deleteOwned(id: string, userId: string, marketCode: string): Promise<boolean>;
  claimEvents(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<WatchEventRow[]>;
  evaluateEvent(eventId: string): Promise<number>;
  completeEvent(input: {
    eventId: string;
    workerId: string;
    success: boolean;
    errorCode?: string;
    retryAt?: string;
  }): Promise<void>;
  claimMatches(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<WatchMatchRow[]>;
  getMatchContext(match: WatchMatchRow): Promise<WatchMatchContext | null>;
  completeMatch(input: {
    matchId: string;
    workerId: string;
    success: boolean;
    errorCode?: string;
    retryAt?: string;
  }): Promise<void>;
  markNotified(subscriptionId: string, occurredAt: string): Promise<void>;
}

const mapSubscription = (row: SubscriptionRow): OwnedWatchSubscription => ({
  id: row.id,
  userId: row.user_id,
  marketCode: row.market_code,
  targetType: row.target_type,
  targetId: row.target_key,
  title: row.title,
  frequency: row.frequency,
  channels: {
    inApp: row.in_app_enabled,
    email: row.email_enabled,
    push: row.push_enabled,
  },
  status: row.status,
  ...(Object.keys((row.search_filter || {}) as object).length
    ? { searchFilter: row.search_filter as WatchSearchFilter }
    : {}),
  ...(row.baseline_price_minor !== null && row.currency
    ? {
        baselinePrice: {
          amountMinor: row.baseline_price_minor,
          currency: row.currency,
        },
      }
    : {}),
  ...(row.last_notified_at ? { lastNotifiedAt: row.last_notified_at } : {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const withoutOwner = ({
  userId: _userId,
  ...subscription
}: OwnedWatchSubscription) => subscription;

const DEMO_NOW = "2026-09-03T08:00:00.000Z";

export class DemoWatchSubscriptionRepository implements IWatchSubscriptionRepository {
  private subscriptions = new Map<string, OwnedWatchSubscription>();

  constructor() {
    const initial: OwnedWatchSubscription = {
      id: "watch-demo-price-list-1",
      userId: "user_thomas",
      marketCode: "FR",
      targetType: "listing_price",
      targetId: "list_1",
      title: "Baisse de prix · Vélo Gravel Specialized Diverge E5",
      frequency: "immediate",
      channels: { inApp: true, email: false, push: true },
      status: "active",
      baselinePrice: { amountMinor: 25_000, currency: "EUR" },
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.subscriptions.set(initial.id, initial);
  }

  async list(userId: string, marketCode: string): Promise<WatchSubscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(
        (subscription) =>
          subscription.userId === userId &&
          subscription.marketCode === marketCode,
      )
      .map(withoutOwner);
  }

  async findOwned(
    id: string,
    userId: string,
    marketCode: string,
  ): Promise<WatchSubscription | null> {
    const item = this.subscriptions.get(id);
    return item?.userId === userId && item.marketCode === marketCode
      ? withoutOwner(item)
      : null;
  }

  async upsert(
    userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    const existing = Array.from(this.subscriptions.values()).find(
      (item) =>
        item.userId === userId &&
        item.marketCode === input.marketCode &&
        item.targetType === input.targetType &&
        item.targetId === input.targetId,
    );
    const item: OwnedWatchSubscription = {
      ...input,
      id:
        existing?.id ||
        `watch-${userId}-${input.marketCode}-${input.targetType}-${input.targetId}`,
      userId,
      status: "active",
      createdAt: existing?.createdAt || DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.subscriptions.set(item.id, item);
    return withoutOwner(item);
  }

  async updateOwned(
    id: string,
    userId: string,
    marketCode: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription | null> {
    const current = this.subscriptions.get(id);
    if (current?.userId !== userId || current.marketCode !== marketCode)
      return null;
    const next = {
      ...current,
      ...input,
      updatedAt: DEMO_NOW,
    };
    this.subscriptions.set(id, next);
    return withoutOwner(next);
  }

  async deleteOwned(
    id: string,
    userId: string,
    marketCode: string,
  ): Promise<boolean> {
    const current = this.subscriptions.get(id);
    if (current?.userId !== userId || current.marketCode !== marketCode)
      return false;
    return this.subscriptions.delete(id);
  }

  async claimEvents(): Promise<WatchEventRow[]> {
    return [];
  }
  async evaluateEvent(): Promise<number> {
    return 0;
  }
  async completeEvent(): Promise<void> {}
  async claimMatches(): Promise<WatchMatchRow[]> {
    return [];
  }
  async getMatchContext(
    _match: WatchMatchRow,
  ): Promise<WatchMatchContext | null> {
    return null;
  }
  async completeMatch(): Promise<void> {}
  async markNotified(
    subscriptionId: string,
    occurredAt: string,
  ): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription)
      this.subscriptions.set(subscriptionId, {
        ...subscription,
        lastNotifiedAt: occurredAt,
        updatedAt: occurredAt,
      });
  }
}

export class PostgresWatchSubscriptionRepository implements IWatchSubscriptionRepository {
  private readonly client = getSupabaseAdminClient();

  async list(userId: string, marketCode: string): Promise<WatchSubscription[]> {
    const { data, error } = await this.client
      .from("watch_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("market_code", marketCode)
      .order("created_at", { ascending: false });
    if (error || !data) databaseFailure("watchSubscriptions.list", error);
    return data.map(mapSubscription).map(withoutOwner);
  }

  async findOwned(
    id: string,
    userId: string,
    marketCode: string,
  ): Promise<WatchSubscription | null> {
    const { data, error } = await this.client
      .from("watch_subscriptions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .eq("market_code", marketCode)
      .maybeSingle();
    if (error) databaseFailure("watchSubscriptions.findOwned", error);
    return data ? withoutOwner(mapSubscription(data)) : null;
  }

  async upsert(
    userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    const { data, error } = await this.client
      .from("watch_subscriptions")
      .upsert(
        {
          user_id: userId,
          market_code: input.marketCode,
          target_type: input.targetType,
          target_key: input.targetId,
          title: input.title,
          search_filter: input.searchFilter || {},
          baseline_price_minor: input.baselinePrice?.amountMinor ?? null,
          currency: input.baselinePrice?.currency ?? null,
          frequency: input.frequency,
          in_app_enabled: input.channels.inApp,
          email_enabled: input.channels.email,
          push_enabled: input.channels.push,
          status: "active",
        },
        { onConflict: "user_id,market_code,target_type,target_key" },
      )
      .select("*")
      .single();
    if (error || !data) databaseFailure("watchSubscriptions.upsert", error);
    return withoutOwner(mapSubscription(data));
  }

  async updateOwned(
    id: string,
    userId: string,
    marketCode: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription | null> {
    const update = {
      ...(input.frequency ? { frequency: input.frequency } : {}),
      ...(input.channels
        ? {
            in_app_enabled: input.channels.inApp,
            email_enabled: input.channels.email,
            push_enabled: input.channels.push,
          }
        : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const { data, error } = await this.client
      .from("watch_subscriptions")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId)
      .eq("market_code", marketCode)
      .select("*")
      .maybeSingle();
    if (error) databaseFailure("watchSubscriptions.updateOwned", error);
    return data ? withoutOwner(mapSubscription(data)) : null;
  }

  async deleteOwned(
    id: string,
    userId: string,
    marketCode: string,
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from("watch_subscriptions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("market_code", marketCode)
      .select("id")
      .maybeSingle();
    if (error) databaseFailure("watchSubscriptions.deleteOwned", error);
    return Boolean(data);
  }

  async claimEvents(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<WatchEventRow[]> {
    const { data, error } = await this.client.rpc("claim_watch_events", {
      p_worker_id: workerId,
      p_limit: limit,
      p_lease_seconds: leaseSeconds,
    });
    if (error || !data)
      databaseFailure("watchSubscriptions.claimEvents", error);
    return data;
  }

  async evaluateEvent(eventId: string): Promise<number> {
    const { data, error } = await this.client.rpc("evaluate_watch_event", {
      p_event_id: eventId,
    });
    if (error || data === null)
      databaseFailure("watchSubscriptions.evaluateEvent", error);
    return Number(data);
  }

  async completeEvent(input: {
    eventId: string;
    workerId: string;
    success: boolean;
    errorCode?: string;
    retryAt?: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("complete_watch_event", {
      p_event_id: input.eventId,
      p_worker_id: input.workerId,
      p_success: input.success,
      p_error_code: input.errorCode || null,
      p_retry_at: input.retryAt || null,
    });
    if (error) databaseFailure("watchSubscriptions.completeEvent", error);
  }

  async claimMatches(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<WatchMatchRow[]> {
    const { data, error } = await this.client.rpc("claim_watch_matches", {
      p_worker_id: workerId,
      p_limit: limit,
      p_lease_seconds: leaseSeconds,
    });
    if (error || !data)
      databaseFailure("watchSubscriptions.claimMatches", error);
    return data;
  }

  async getMatchContext(
    match: WatchMatchRow,
  ): Promise<WatchMatchContext | null> {
    const [subscriptionResult, eventResult] = await Promise.all([
      this.client
        .from("watch_subscriptions")
        .select("*")
        .eq("id", match.subscription_id)
        .maybeSingle(),
      this.client
        .from("watch_events")
        .select("*")
        .eq("id", match.event_id)
        .maybeSingle(),
    ]);
    if (subscriptionResult.error || eventResult.error)
      databaseFailure(
        "watchSubscriptions.getMatchContext",
        subscriptionResult.error || eventResult.error,
      );
    if (!subscriptionResult.data || !eventResult.data) return null;
    return {
      match,
      subscription: mapSubscription(subscriptionResult.data),
      event: eventResult.data,
    };
  }

  async completeMatch(input: {
    matchId: string;
    workerId: string;
    success: boolean;
    errorCode?: string;
    retryAt?: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("complete_watch_match", {
      p_match_id: input.matchId,
      p_worker_id: input.workerId,
      p_success: input.success,
      p_error_code: input.errorCode || null,
      p_retry_at: input.retryAt || null,
    });
    if (error) databaseFailure("watchSubscriptions.completeMatch", error);
  }

  async markNotified(
    subscriptionId: string,
    occurredAt: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("watch_subscriptions")
      .update({ last_notified_at: occurredAt })
      .eq("id", subscriptionId);
    if (error) databaseFailure("watchSubscriptions.markNotified", error);
  }
}
