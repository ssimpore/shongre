import type {
  CreateWatchSubscriptionInput,
  UpdateWatchSubscriptionInput,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";

export interface WatchSubscriptionsServiceContract {
  list(): Promise<WatchSubscription[]>;
  createOrReplace(
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription>;
  update(
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription>;
  remove(id: string): Promise<void>;
}
