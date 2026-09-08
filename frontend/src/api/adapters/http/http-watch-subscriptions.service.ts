import type {
  CreateWatchSubscriptionInput,
  UpdateWatchSubscriptionInput,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import { apiOperation } from "./generated-api-operation";
import type { WatchSubscriptionsServiceContract } from "../../contracts/watch-subscriptions.contract";

export class HttpWatchSubscriptionsService implements WatchSubscriptionsServiceContract {
  async list(
    _userId: string,
    _marketCode: string,
  ): Promise<WatchSubscription[]> {
    const result = await apiOperation<
      { items: WatchSubscription[] },
      "getWatchSubscriptions"
    >("getWatchSubscriptions", {});
    return result.items;
  }

  async createOrReplace(
    _userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    return apiOperation<WatchSubscription, "postWatchSubscription">(
      "postWatchSubscription",
      { body: input },
    );
  }

  async update(
    _userId: string,
    _marketCode: string,
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    return apiOperation<WatchSubscription, "patchWatchSubscription">(
      "patchWatchSubscription",
      { path: { id: id }, body: input },
    );
  }

  async remove(
    _userId: string,
    _marketCode: string,
    id: string,
  ): Promise<void> {
    await apiOperation<{ success: true }, "deleteWatchSubscription">(
      "deleteWatchSubscription",
      { path: { id: id } },
    );
  }
}

export const httpWatchSubscriptionsService =
  new HttpWatchSubscriptionsService();
