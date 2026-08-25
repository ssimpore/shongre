import { z } from "zod";
import { marketCodeSchema } from "./primitives";

export const PUBLICATION_CONSTRAINTS = {
  title: { minLength: 3, maxLength: 120 },
  description: { maxLength: 4_000 },
  stockQuantity: { min: 1 },
  imageCount: { max: 12 },
} as const;

export const publicationInputSchema = z.object({
  title: z
    .string()
    .min(PUBLICATION_CONSTRAINTS.title.minLength)
    .max(PUBLICATION_CONSTRAINTS.title.maxLength),
  description: z
    .string()
    .max(PUBLICATION_CONSTRAINTS.description.maxLength)
    .default(""),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3).default("EUR"),
  categoryId: z.string().min(1),
  marketCode: marketCodeSchema,
  city: z.string().min(1),
  postalCode: z.string().min(3),
  condition: z.string().min(1),
  images: z
    .array(z.string())
    .max(PUBLICATION_CONSTRAINTS.imageCount.max)
    .default([]),
});
export type PublicationInput = z.infer<typeof publicationInputSchema>;
