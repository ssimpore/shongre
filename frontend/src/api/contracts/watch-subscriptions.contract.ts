import type {
  CreateWatchSubscriptionInput,
  UpdateWatchSubscriptionInput,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";

export interface WatchSubscriptionsServiceContract {
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
