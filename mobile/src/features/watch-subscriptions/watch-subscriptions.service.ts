import type {
  CreateWatchSubscriptionInput,
  UpdateWatchSubscriptionInput,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export interface WatchSubscriptionsService {
  list(userId: string, marketCode: string): Promise<WatchSubscription[]>;
  createOrReplace(
    userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription>;
  update(
    userId: string,
    marketCode: string,
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription>;
  remove(userId: string, marketCode: string, id: string): Promise<void>;
}

const DEMO_NOW = "2026-09-03T08:00:00.000Z";

export class DemoWatchSubscriptionsService implements WatchSubscriptionsService {
  private readonly byAccountAndMarket = new Map<string, WatchSubscription[]>();

  async list(userId: string, marketCode: string): Promise<WatchSubscription[]> {
    return (
      this.byAccountAndMarket.get(this.key(userId, marketCode)) || []
    ).map((item) => ({ ...item, channels: { ...item.channels } }));
  }

  async createOrReplace(
    userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    const key = this.key(userId, input.marketCode);
    const items = await this.list(userId, input.marketCode);
    const existing = items.find(
      (item) =>
        item.targetType === input.targetType &&
        item.targetId === input.targetId,
    );
    const next: WatchSubscription = {
      ...input,
      id:
        existing?.id ||
        `watch-${userId}-${input.marketCode}-${input.targetType}-${input.targetId}`,
      status: "active",
      createdAt: existing?.createdAt || DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.byAccountAndMarket.set(key, [
      next,
      ...items.filter((item) => item.id !== next.id),
    ]);
    return { ...next };
  }

  async update(
    userId: string,
    marketCode: string,
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    const key = this.key(userId, marketCode);
    const items = await this.list(userId, marketCode);
    const current = items.find((item) => item.id === id);
    if (!current) throw new Error("Alerte introuvable.");
    const next = { ...current, ...input, updatedAt: DEMO_NOW };
    this.byAccountAndMarket.set(
      key,
      items.map((item) => (item.id === id ? next : item)),
    );
    return next;
  }

  async remove(userId: string, marketCode: string, id: string): Promise<void> {
    const key = this.key(userId, marketCode);
    this.byAccountAndMarket.set(
      key,
      (await this.list(userId, marketCode)).filter((item) => item.id !== id),
    );
  }

  private key(userId: string, marketCode: string): string {
    return `${userId}::${marketCode.toUpperCase()}`;
  }
}

export class HttpWatchSubscriptionsService implements WatchSubscriptionsService {
  async list(
    _userId: string,
    marketCode: string,
  ): Promise<WatchSubscription[]> {
    const result = await apiRequest<{ items: WatchSubscription[] }>(
      "/watch-subscriptions",
      {},
      marketCode,
    );
    return result.items;
  }
  async createOrReplace(
    _userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    return apiRequest(
      "/watch-subscriptions",
      { method: "POST", body: JSON.stringify(input) },
      input.marketCode,
    );
  }
  async update(
    _userId: string,
    marketCode: string,
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    return apiRequest(
      `/watch-subscriptions/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
      marketCode,
    );
  }
  async remove(_userId: string, marketCode: string, id: string): Promise<void> {
    await apiRequest(
      `/watch-subscriptions/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      marketCode,
    );
  }
}

export const watchSubscriptionsService: WatchSubscriptionsService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoWatchSubscriptionsService()
    : new HttpWatchSubscriptionsService();
