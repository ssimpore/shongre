import { z } from "zod";
import { marketCodeSchema } from "./primitives";
import { taxonomyV4ListingIntentSchema } from "./taxonomy";

export const PUBLICATION_CONSTRAINTS = {
  title: { minLength: 3, maxLength: 120 },
  description: { maxLength: 4_000 },
  stockQuantity: { min: 1 },
  imageCount: { max: 12 },
} as const;

const TAXONOMY_V4_ITEM_CONDITION_BY_APPLICATION_VALUE = {
  neuf_avec_etiquette: "new",
  "neuf-avec-etiquette": "new",
  neuf_sans_etiquette: "new",
  "neuf-sans-etiquette": "new",
  comme_neuf: "like_new",
  "comme-neuf": "like_new",
  tres_bon_etat: "very_good",
  "tres-bon-etat": "very_good",
  bon_etat: "good",
  "bon-etat": "good",
  etat_correct: "fair",
  "etat-correct": "fair",
  pour_pieces: "for_parts",
  "pour-pieces": "for_parts",
  new_with_tag: "new",
  new_without_tag: "new",
  like_new: "like_new",
  very_good: "very_good",
  good: "good",
  fair: "fair",
  damaged: "damaged",
  for_parts: "for_parts",
  vehicle_new: "new",
  vehicle_excellent: "like_new",
  vehicle_very_good: "very_good",
  vehicle_good: "good",
  vehicle_to_repair: "damaged",
  vehicle_vintage: "good",
  mint: "new",
  near_mint: "like_new",
  good_vintage: "good",
  restoration_needed: "damaged",
  pro_new_warranty: "new",
  pro_refurbished: "like_new",
  pro_good_working: "very_good",
  pro_overhaul_needed: "damaged",
} as const;

export type TaxonomyV4ItemCondition =
  (typeof TAXONOMY_V4_ITEM_CONDITION_BY_APPLICATION_VALUE)[keyof typeof TAXONOMY_V4_ITEM_CONDITION_BY_APPLICATION_VALUE];

/**
 * Maps the existing cross-client condition control to the canonical taxonomy
 * v4 option key. Categories without a `condition` binding must omit the result
 * rather than submitting an attribute that is not in their schema.
 */
export function toTaxonomyV4ItemCondition(
  value: string | undefined,
): TaxonomyV4ItemCondition | undefined {
  if (!value) return undefined;
  return TAXONOMY_V4_ITEM_CONDITION_BY_APPLICATION_VALUE[
    value as keyof typeof TAXONOMY_V4_ITEM_CONDITION_BY_APPLICATION_VALUE
  ];
}

const APPLICATION_CONDITION_BY_TAXONOMY_V4_VALUE: Record<string, string> = {
  new: "new_with_tag",
  like_new: "like_new",
  very_good: "very_good",
  good: "good",
  fair: "fair",
  damaged: "fair",
  for_parts: "for_parts",
  neuf_avec_etiquette: "new_with_tag",
  neuf_sans_etiquette: "new_without_tag",
  comme_neuf: "like_new",
  tres_bon_etat: "very_good",
  bon_etat: "good",
  etat_correct: "fair",
  pour_pieces: "for_parts",
  neuf: "pro_new_warranty",
  occasion: "pro_good_working",
  reconditionne: "pro_refurbished",
  pour_pieces_equip: "pro_overhaul_needed",
  refait_a_neuf: "re_renovated",
  a_rafraichir: "re_to_refresh",
  a_renover: "re_to_renovate",
  a_restaurer_entierement: "re_to_renovate",
  en_construction_vefa: "re_new",
};

/** Keeps the legacy listing projection aligned with an explicitly selected v4 condition. */
export function toApplicationListingCondition(
  attributes: Record<string, unknown>,
  fallback: string,
): string {
  for (const attributeId of [
    "condition",
    "property_condition",
    "equipment_condition",
    "item_condition",
  ]) {
    const value = attributes[attributeId];
    if (typeof value !== "string") continue;
    if (attributeId === "property_condition" && value === "neuf") {
      return "re_new";
    }
    return APPLICATION_CONDITION_BY_TAXONOMY_V4_VALUE[value] ?? fallback;
  }
  return fallback;
}

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
  currency: z.string().length(3),
  categoryId: z.string().min(1),
  listingTypeId: z.string().min(1).optional(),
  listingIntent: taxonomyV4ListingIntentSchema.optional(),
  taxonomyVersion: z.literal("4.0.0").optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  marketCode: marketCodeSchema,
  selectedMarkets: z.array(marketCodeSchema).min(1).optional(),
  marketPublications: z
    .record(
      z.object({
        priceMinor: z.number().int().nonnegative().optional(),
        currency: z.string().length(3).optional(),
        localizedContent: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
  city: z.string().min(1),
  postalCode: z.string().min(3),
  condition: z.string().min(1),
  images: z
    .array(z.string())
    .max(PUBLICATION_CONSTRAINTS.imageCount.max)
    .default([]),
});
export type PublicationInput = z.infer<typeof publicationInputSchema>;
