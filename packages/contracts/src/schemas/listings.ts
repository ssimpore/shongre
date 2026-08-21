import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";
import { publicUserSchema } from "./users";

export const listingCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  price: moneySchema,
  originalPrice: moneySchema.optional(),
  imageUrl: z.string().url().optional(),
  city: z.string(),
  marketCode: marketCodeSchema,
  categoryLabel: z.string().optional(),
  conditionLabel: z.string(),
  publishedAt: z.string(),
  photoCount: z.number().int().nonnegative().optional(),
  deliveryAvailable: z.boolean().optional(),
  onlinePaymentAvailable: z.boolean().optional(),
  isNegotiable: z.boolean().optional(),
  isFreeDonation: z.boolean().optional(),
  seller: publicUserSchema.optional(),
  isUrgent: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});
export type ListingCardView = z.infer<typeof listingCardSchema>;
