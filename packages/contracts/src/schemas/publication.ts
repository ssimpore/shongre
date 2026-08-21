import { z } from "zod";
import { marketCodeSchema } from "./primitives";

export const publicationInputSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(4000).default(""),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3).default("EUR"),
  categoryId: z.string().min(1),
  marketCode: marketCodeSchema,
  city: z.string().min(1),
  postalCode: z.string().min(3),
  condition: z.string().min(1),
  images: z.array(z.string()).max(12).default([]),
});
export type PublicationInput = z.infer<typeof publicationInputSchema>;
