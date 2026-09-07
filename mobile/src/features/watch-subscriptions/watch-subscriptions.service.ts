import {
  createWatchSubscriptionInputSchema,
  updateWatchSubscriptionInputSchema,
  watchSubscriptionListSchema,
  watchSubscriptionSchema,
  type CreateWatchSubscriptionInput,
  type UpdateWatchSubscriptionInput,
  type WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";

type ListResponse =
  operations["getWatchSubscriptions"]["responses"][200]["content"]["application/json"];
type CreateRequest =
  operations["postWatchSubscription"]["requestBody"]["content"]["application/json"];
type CreateResponse =
  operations["postWatchSubscription"]["responses"][201]["content"]["application/json"];
type UpdateRequest =
  operations["patchWatchSubscription"]["requestBody"]["content"]["application/json"];
type UpdateResponse =
  operations["patchWatchSubscription"]["responses"][200]["content"]["application/json"];
type DeleteResponse =
  operations["deleteWatchSubscription"]["responses"][200]["content"]["application/json"];

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

export class HttpWatchSubscriptionsService implements WatchSubscriptionsService {
  async list(
    _userId: string,
    marketCode: string,
  ): Promise<WatchSubscription[]> {
    const result = await apiRequest<ListResponse>(
      "/watch-subscriptions",
      {},
      marketCode,
    );
    return watchSubscriptionListSchema.parse(result).items;
  }
  async createOrReplace(
    _userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    const parsed = createWatchSubscriptionInputSchema.parse(input);
    const payload: CreateRequest = parsed;
    return watchSubscriptionSchema.parse(
      await apiRequest<CreateResponse>(
        "/watch-subscriptions",
        { method: "POST", body: JSON.stringify(payload) },
        parsed.marketCode,
      ),
    );
  }
  async update(
    _userId: string,
    marketCode: string,
    id: string,
    input: UpdateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    const parsed = updateWatchSubscriptionInputSchema.parse(input);
    const payload: UpdateRequest = parsed;
    return watchSubscriptionSchema.parse(
      await apiRequest<UpdateResponse>(
        `/watch-subscriptions/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        marketCode,
      ),
    );
  }
  async remove(_userId: string, marketCode: string, id: string): Promise<void> {
    await apiRequest<DeleteResponse>(
      `/watch-subscriptions/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      marketCode,
    );
  }
}

export const watchSubscriptionsService: WatchSubscriptionsService =
  new HttpWatchSubscriptionsService();
