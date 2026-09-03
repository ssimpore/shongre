import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";

export const watchTargetTypeSchema = z.enum([
  "listing_price",
  "seller",
  "saved_search",
]);
export type WatchTargetType = z.infer<typeof watchTargetTypeSchema>;

export const watchFrequencySchema = z.enum(["immediate", "daily", "weekly"]);
export type WatchFrequency = z.infer<typeof watchFrequencySchema>;

export const watchSubscriptionStatusSchema = z.enum(["active", "paused"]);
export type WatchSubscriptionStatus = z.infer<
  typeof watchSubscriptionStatusSchema
>;

export const watchChannelsSchema = z
  .object({
    inApp: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
  })
  .refine((channels) => Object.values(channels).some(Boolean), {
    message: "At least one alert channel must be enabled.",
  });
export type WatchChannels = z.infer<typeof watchChannelsSchema>;

/**
 * Stable, deliberately bounded search projection used by alert matching.
 * Richer discovery filters can be added compatibly when the worker supports
 * them; unknown ad-hoc query state never becomes authoritative silently.
 */
export const watchSearchFilterSchema = z
  .object({
    query: z.string().trim().min(1).max(255).optional(),
    categoryId: z.string().trim().min(1).max(160).optional(),
    city: z.string().trim().min(1).max(160).optional(),
    minPriceMinor: z.number().int().nonnegative().optional(),
    maxPriceMinor: z.number().int().nonnegative().optional(),
  })
  .refine((filter) => Object.keys(filter).length > 0, {
    message: "A saved-search alert requires at least one filter.",
  });
export type WatchSearchFilter = z.infer<typeof watchSearchFilterSchema>;

const watchSubscriptionCoreSchema = z.object({
  marketCode: marketCodeSchema,
  targetType: watchTargetTypeSchema,
  targetId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(160),
  frequency: watchFrequencySchema,
  channels: watchChannelsSchema,
  searchFilter: watchSearchFilterSchema.optional(),
  baselinePrice: moneySchema.optional(),
});

export const createWatchSubscriptionInputSchema =
  watchSubscriptionCoreSchema.superRefine((value, context) => {
    if (value.targetType === "saved_search" && !value.searchFilter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["searchFilter"],
        message: "A saved-search subscription requires a search filter.",
      });
    }
    if (value.targetType !== "saved_search" && value.searchFilter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["searchFilter"],
        message: "Search filters are reserved for saved-search subscriptions.",
      });
    }
    if (value.targetType !== "listing_price" && value.baselinePrice) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baselinePrice"],
        message: "A baseline price is valid only for a listing-price alert.",
      });
    }
    if (
      value.searchFilter?.minPriceMinor !== undefined &&
      value.searchFilter?.maxPriceMinor !== undefined &&
      value.searchFilter.minPriceMinor > value.searchFilter.maxPriceMinor
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["searchFilter", "maxPriceMinor"],
        message: "The maximum price must be greater than the minimum price.",
      });
    }
  });
export type CreateWatchSubscriptionInput = z.infer<
  typeof createWatchSubscriptionInputSchema
>;

export const updateWatchSubscriptionInputSchema = z
  .object({
    frequency: watchFrequencySchema.optional(),
    channels: watchChannelsSchema.optional(),
    status: watchSubscriptionStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one subscription preference must change.",
  });
export type UpdateWatchSubscriptionInput = z.infer<
  typeof updateWatchSubscriptionInputSchema
>;

export const watchSubscriptionSchema = watchSubscriptionCoreSchema.extend({
  id: z.string().min(1),
  status: watchSubscriptionStatusSchema,
  lastNotifiedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type WatchSubscription = z.infer<typeof watchSubscriptionSchema>;

export const watchSubscriptionListSchema = z.object({
  items: z.array(watchSubscriptionSchema),
});
