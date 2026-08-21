import { z } from "zod";

export const searchFiltersSchema = z
  .object({
    query: z.string().trim().max(120).default(""),
    marketCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .default("FR"),
    category: z.string().trim().optional(),
    priceMinMinor: z.number().int().nonnegative().optional(),
    priceMaxMinor: z.number().int().nonnegative().optional(),
    condition: z.array(z.string()).default([]),
    sellerType: z.enum(["individual", "pro"]).optional(),
    city: z.string().trim().optional(),
    radiusKm: z.number().int().positive().max(500).optional(),
    delivery: z.boolean().optional(),
    sort: z
      .enum(["relevance", "newest", "price_asc", "price_desc"])
      .default("relevance"),
  })
  .refine(
    (value) =>
      value.priceMinMinor === undefined ||
      value.priceMaxMinor === undefined ||
      value.priceMinMinor <= value.priceMaxMinor,
    {
      message: "Le prix minimum doit être inférieur au prix maximum.",
      path: ["priceMaxMinor"],
    },
  );

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export const normalizeSearchFilters = (input: unknown): SearchFilters =>
  searchFiltersSchema.parse(input);
