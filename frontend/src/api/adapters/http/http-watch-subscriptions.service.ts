import type {
  CreateWatchSubscriptionInput,
  UpdateWatchSubscriptionInput,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import type { WatchSubscriptionsServiceContract } from "../../contracts/watch-subscriptions.contract";
import { httpClient } from "./http-client";

export class HttpWatchSubscriptionsService implements WatchSubscriptionsServiceContract {
  async list(
    _userId: string,
    _marketCode: string,
  ): Promise<WatchSubscription[]> {
    const result = await httpClient.get<{ items: WatchSubscription[] }>(
      "/watch-subscriptions",
    );
    return result.items;
  }

  async createOrReplace(
    _userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    return httpClient.post<WatchSubscription>("/watch-subscriptions", input);
  }

  async update(
    _userId: string,
    _marketCode: string,
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    return httpClient.patch<WatchSubscription>(
      `/watch-subscriptions/${encodeURIComponent(id)}`,
      input,
    );
  }

  async remove(
    _userId: string,
    _marketCode: string,
    id: string,
  ): Promise<void> {
    await httpClient.delete<{ success: true }>(
      `/watch-subscriptions/${encodeURIComponent(id)}`,
    );
  }
}

export const httpWatchSubscriptionsService =
  new HttpWatchSubscriptionsService();
