import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";

/** Stable metadata shared by specialized marketplace verticals. */
export const verticalTypeSchema = z.enum([
  "tutoring",
  "automotive",
  "real_estate",
  "employment",
]);
export type VerticalType = z.infer<typeof verticalTypeSchema>;

export const verticalAudienceSchema = z.enum([
  "individual",
  "professional",
  "organization",
]);

export const verticalEntitlementValueSchema = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  z.array(z.string()),
]);

export const verticalOfferEntitlementsSchema = z.record(
  z.string().min(1),
  verticalEntitlementValueSchema,
);
export type VerticalOfferEntitlements = z.infer<
  typeof verticalOfferEntitlementsSchema
>;

export const verticalActivationSchema = z.object({
  marketCode: marketCodeSchema,
  verticalType: verticalTypeSchema,
  categoryIds: z.array(z.string().min(1)).min(1),
  subcategoryIds: z.array(z.string().min(1)).default([]),
  schemaVersion: z.number().int().positive(),
  isActive: z.boolean(),
  featureFlags: z.record(z.string(), z.boolean()),
});
export type VerticalActivation = z.infer<typeof verticalActivationSchema>;

export const verticalOfferSchema = z.object({
  id: z.string().min(1),
  verticalType: verticalTypeSchema,
  marketCode: marketCodeSchema,
  audience: verticalAudienceSchema,
  kind: z.enum(["free", "pack", "subscription", "custom"]),
  name: z.string().min(1),
  description: z.string(),
  prices: z.array(
    z.object({
      id: z.string().min(1),
      amount: moneySchema,
      billingPeriod: z.enum(["once", "month", "year"]),
      durationDays: z.number().int().positive().optional(),
      trialDays: z.number().int().nonnegative().optional(),
      taxRateBps: z.number().int().min(0).max(10_000),
      isActive: z.boolean(),
    }),
  ),
  entitlements: verticalOfferEntitlementsSchema,
  isActive: z.boolean(),
  isRecommended: z.boolean(),
  sortOrder: z.number().int(),
});
export type VerticalOffer = z.infer<typeof verticalOfferSchema>;

export const verticalAddOnSchema = z.object({
  id: z.string().min(1),
  verticalType: verticalTypeSchema,
  marketCode: marketCodeSchema,
  categoryIds: z.array(z.string().min(1)).default([]),
  geographicAreaIds: z.array(z.string().min(1)).default([]),
  type: z.enum([
    "urgent",
    "search_bump",
    "featured",
    "homepage_spotlight",
    "local_spotlight",
    "qualified_lead",
    "sponsored_professional",
    "additional_listing_credit",
    "additional_team_seat",
    "extended_analytics",
    "distribution_integration",
    "employer_brand_campaign",
  ]),
  name: z.string().min(1),
  description: z.string(),
  price: moneySchema,
  taxRateBps: z.number().int().min(0).max(10_000),
  validityDays: z.number().int().positive().optional(),
  creditQuantity: z.number().int().positive().optional(),
  scheduleModes: z
    .array(z.enum(["immediate", "daily", "scheduled"]))
    .default(["immediate"]),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});
export type VerticalAddOn = z.infer<typeof verticalAddOnSchema>;

export const verticalCheckoutSchema = z.object({
  id: z.string().min(1),
  verticalType: verticalTypeSchema,
  marketCode: marketCodeSchema,
  accountId: z.string().min(1),
  offerId: z.string().optional(),
  addOnIds: z.array(z.string()).default([]),
  total: moneySchema,
  tax: moneySchema,
  status: z.enum([
    "created",
    "pending",
    "requires_action",
    "paid",
    "failed",
    "cancelled",
    "refunded",
  ]),
  provider: z.enum(["demo", "stripe"]),
  providerCheckoutId: z.string().optional(),
  providerCheckoutUrl: z.string().url().optional(),
  providerPaymentId: z.string().optional(),
  invoiceId: z.string().optional(),
  idempotencyKey: z.string().min(8),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VerticalCheckout = z.infer<typeof verticalCheckoutSchema>;
