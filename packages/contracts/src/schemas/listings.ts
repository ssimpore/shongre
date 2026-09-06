import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";
import { publicUserSchema } from "./users";
import {
  discoveryPresentationSchema,
  marketResolvedListingPromotionSchema,
  publisherTypeSchema,
} from "./discovery";
import { fulfillmentTypeSchema } from "./digital-products";

/**
 * Semantic icon roles for compact listing decision fields. The role travels
 * with the UI projection so Web and native render the same meaning without
 * inferring it from localized display text.
 */
export const listingCharacteristicIconSchema = z.enum([
  "briefcase",
  "calendar",
  "database",
  "file",
  "fuel",
  "gauge",
  "home",
  "laptop",
  "layers",
  "layout-grid",
  "book-open",
  "ruler",
  "shirt",
  "tag",
]);
export type ListingCharacteristicIcon = z.infer<
  typeof listingCharacteristicIconSchema
>;

export const listingCardSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    /** Present only when `priceKind` is `amount`; absent prices never carry a
     * synthetic zero amount or guessed currency. */
    price: moneySchema.optional(),
    /**
     * Optional category-aware display text for ranges or periods (for example a
     * salary range or a monthly rent). A structured `price` remains available
     * for amount-bearing cards; absent-price states are explicit below.
     */
    priceLabel: z.string().min(1).optional(),
    /** Semantic price state for cards that do not display a regular amount. */
    priceKind: z.enum(["amount", "free", "on_request", "unpriced"]).optional(),
    originalPrice: moneySchema.optional(),
    imageUrl: z.string().url().optional(),
    city: z.string(),
    marketCode: marketCodeSchema,
    categoryLabel: z.string().min(1),
    brandLabel: z.string().min(1).optional(),
    conditionLabel: z.string(),
    /** Taxonomy-configured decision fields, already formatted for display. */
    characteristics: z.array(z.string().min(1)).max(5).default([]),
    /** Icons aligned by index with `characteristics`; legacy data falls back safely. */
    characteristicIcons: z
      .array(listingCharacteristicIconSchema)
      .max(5)
      .optional(),
    /** Market publication timestamp. Absent means the source did not publish a
     * trustworthy date; consumers must not substitute creation or sort dates. */
    publishedAt: z.string().optional(),
    photoCount: z.number().int().nonnegative().optional(),
    deliveryAvailable: z.boolean().optional(),
    fulfillmentTypes: z.array(fulfillmentTypeSchema).min(1).max(5).optional(),
    requiresPhysicalDelivery: z.boolean().optional(),
    productVersion: z.string().min(1).max(120).optional(),
    onlinePaymentAvailable: z.boolean().optional(),
    isNegotiable: z.boolean().optional(),
    /** @deprecated Prefer the explicit `priceKind: "free"` projection. */
    isFreeDonation: z.boolean().optional(),
    seller: publicUserSchema.optional(),
    /** Authoritative publisher plane, independent of optional public seller
     * profile details such as a name, rating or avatar. */
    publisherType: publisherTypeSchema.optional(),
    isUrgent: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    /** Complete, market-resolved proof required before paid prominence may be
     * rendered. Request-scoped ranking flags are not promotion evidence. */
    promotion: marketResolvedListingPromotionSchema.optional(),
    discovery: discoveryPresentationSchema.optional(),
  })
  .superRefine((listing, context) => {
    if (
      listing.promotion &&
      listing.promotion.marketCode !== listing.marketCode
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotion", "marketCode"],
        message: "A listing-card promotion must match the card market.",
      });
    }
    const kind =
      listing.priceKind ?? (listing.isFreeDonation ? "free" : "amount");
    if (
      kind === "amount" &&
      (!listing.price || listing.price.amountMinor <= 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "A priced listing card requires a positive amount.",
      });
    }
    if (kind !== "amount" && listing.price !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "A hidden or free listing-card price must be absent.",
      });
    }
  });
export type ListingCardView = z.infer<typeof listingCardSchema>;

/** Bounded public lookup used to hydrate browser-local guest favorites. */
export const publicListingCardsRequestSchema = z
  .object({
    listingIds: z
      .array(z.string().uuid())
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Listing identifiers must be unique.",
      }),
  })
  .strict();
export type PublicListingCardsRequest = z.infer<
  typeof publicListingCardsRequestSchema
>;
