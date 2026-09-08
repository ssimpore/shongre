import {
  createWatchSubscriptionInputSchema,
  updateWatchSubscriptionInputSchema,
  watchSubscriptionListSchema,
  watchSubscriptionSchema,
  type CreateWatchSubscriptionInput,
  type UpdateWatchSubscriptionInput,
  type WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import { apiOperation } from "@/api/generated-api-operation";
import type { operations } from "@shongre/contracts/openapi";

type CreateRequest =
  operations["postWatchSubscription"]["requestBody"]["content"]["application/json"];
type UpdateRequest =
  operations["patchWatchSubscription"]["requestBody"]["content"]["application/json"];

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
    const result = await apiOperation("getWatchSubscriptions", {}, marketCode);
    return watchSubscriptionListSchema.parse(result).items;
  }
  async createOrReplace(
    _userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<WatchSubscription> {
    const parsed = createWatchSubscriptionInputSchema.parse(input);
    const payload: CreateRequest = parsed;
    return watchSubscriptionSchema.parse(
      await apiOperation(
        "postWatchSubscription",
        { body: payload },
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
      await apiOperation(
        "patchWatchSubscription",
        { path: { id: id }, body: payload },
        marketCode,
      ),
    );
  }
  async remove(_userId: string, marketCode: string, id: string): Promise<void> {
    await apiOperation(
      "deleteWatchSubscription",
      { path: { id: id } },
      marketCode,
    );
  }
}

export const watchSubscriptionsService: WatchSubscriptionsService =
  new HttpWatchSubscriptionsService();
