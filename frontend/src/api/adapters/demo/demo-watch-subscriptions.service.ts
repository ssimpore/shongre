import type {
  CreateWatchSubscriptionInput,
  UpdateWatchSubscriptionInput,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import type { WatchSubscriptionsServiceContract } from "../../contracts/watch-subscriptions.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { storageService } from "../../../services/storage.service";
import { requireDemoCapability } from "./demo-authorization";

const DEMO_NOW = "2026-09-03T08:00:00.000Z";

const keyFor = (userId: string, marketCode: string) =>
  `shongre_watch_subscriptions_v1:${userId}:${marketCode.toUpperCase()}`;

const initialFor = (userId: string, marketCode: string): WatchSubscription[] =>
  userId === "user_thomas" && marketCode === "FR"
    ? [
        {
          id: "watch-demo-price-list-1",
          marketCode: "FR",
          targetType: "listing_price",
          targetId: "list-101",
          title: "Vélo gravel Specialized",
          frequency: "immediate",
          channels: { inApp: true, email: false, push: true },
          status: "active",
          baselinePrice: { amountMinor: 125_000, currency: "EUR" },
          createdAt: DEMO_NOW,
          updatedAt: DEMO_NOW,
        },
        {
          id: "watch-demo-search-iphone",
          marketCode: "FR",
          targetType: "saved_search",
          targetId: "ss-1",
          title: "iPhone 15 Pro à Paris",
          frequency: "daily",
          channels: { inApp: true, email: true, push: false },
          status: "active",
          searchFilter: { query: "iPhone 15 Pro", city: "Paris" },
          createdAt: DEMO_NOW,
          updatedAt: DEMO_NOW,
        },
        {
          id: "watch-demo-search-scandinavian",
          marketCode: "FR",
          targetType: "saved_search",
          targetId: "ss-2",
          title: "Mobilier scandinave chêne Bordeaux",
          frequency: "daily",
          channels: { inApp: true, email: true, push: false },
          status: "active",
          searchFilter: { query: "scandinave", city: "Bordeaux" },
          createdAt: DEMO_NOW,
          updatedAt: DEMO_NOW,
        },
      ]
    : [];

export class DemoWatchSubscriptionsService implements WatchSubscriptionsServiceContract {
  async list(userId: string, marketCode: string): Promise<WatchSubscription[]> {
    await simulateNetworkDelay();
    requireDemoCapability("saved_search.manage.own");
    const normalizedMarket = marketCode.toUpperCase();
    return storageService.getByKey(
      keyFor(userId, normalizedMarket),
      initialFor(userId, normalizedMarket),
    );
  }

  async createOrReplace(
    userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    await simulateNetworkDelay();
    requireDemoCapability("saved_search.manage.own");
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
    storageService.setByKey(keyFor(userId, input.marketCode), [
      next,
      ...items.filter((item) => item.id !== next.id),
    ]);
    return next;
  }

  async update(
    userId: string,
    marketCode: string,
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    await simulateNetworkDelay();
    requireDemoCapability("saved_search.manage.own");
    const items = await this.list(userId, marketCode);
    const current = items.find((item) => item.id === id);
    if (!current) throw new Error("Alerte introuvable.");
    const next = { ...current, ...input, updatedAt: DEMO_NOW };
    storageService.setByKey(
      keyFor(userId, marketCode),
      items.map((item) => (item.id === id ? next : item)),
    );
    return next;
  }

  async remove(userId: string, marketCode: string, id: string): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("saved_search.manage.own");
    const items = await this.list(userId, marketCode);
    storageService.setByKey(
      keyFor(userId, marketCode),
      items.filter((item) => item.id !== id),
    );
  }
}

export const demoWatchSubscriptionsService =
  new DemoWatchSubscriptionsService();
