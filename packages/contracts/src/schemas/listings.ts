import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";
import { publicUserSchema } from "./users";
import {
  discoveryPresentationSchema,
  listingPromotionStateSchema,
} from "./discovery";
import { fulfillmentTypeSchema } from "./digital-products";

export const listingCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  price: moneySchema,
  /**
   * Optional category-aware display text for ranges or periods (for example a
   * salary range or a monthly rent). The structured `price` remains available
   * for sorting, analytics, and machine-readable consumers.
   */
  priceLabel: z.string().min(1).optional(),
  originalPrice: moneySchema.optional(),
  imageUrl: z.string().url().optional(),
  city: z.string(),
  marketCode: marketCodeSchema,
  categoryLabel: z.string().optional(),
  conditionLabel: z.string(),
  /** Taxonomy-configured decision fields, already formatted for display. */
  characteristics: z.array(z.string().min(1)).max(5).default([]),
  publishedAt: z.string(),
  photoCount: z.number().int().nonnegative().optional(),
  deliveryAvailable: z.boolean().optional(),
  fulfillmentTypes: z.array(fulfillmentTypeSchema).min(1).max(5).optional(),
  requiresPhysicalDelivery: z.boolean().optional(),
  productVersion: z.string().min(1).max(120).optional(),
  onlinePaymentAvailable: z.boolean().optional(),
  isNegotiable: z.boolean().optional(),
  isFreeDonation: z.boolean().optional(),
  seller: publicUserSchema.optional(),
  isUrgent: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  promotion: listingPromotionStateSchema.optional(),
  discovery: discoveryPresentationSchema.optional(),
});
export type ListingCardView = z.infer<typeof listingCardSchema>;
