import type {
  TaxonomyV4ListingIntent,
  TaxonomyV4ResolvedSchema,
} from "@shongre/contracts";
import type { ListingIntent } from "./publication.types";

export const toTaxonomyV4ListingIntent = (
  intent: ListingIntent,
): TaxonomyV4ListingIntent => {
  if (intent === "GIVE") return "DONATE";
  if (intent === "RENT") return "RENT_OUT";
  if (intent === "OFFER_SERVICE") return "SERVICE_OFFER";
  return intent;
};

export const isCurrentTaxonomyV4Schema = (
  schema: TaxonomyV4ResolvedSchema | null,
  taxonomyNodeId: string,
  listingIntent: ListingIntent,
): schema is TaxonomyV4ResolvedSchema =>
  Boolean(
    schema &&
    taxonomyNodeId &&
    schema.category.id === taxonomyNodeId &&
    schema.listingType.intent === toTaxonomyV4ListingIntent(listingIntent),
  );

export const retainTaxonomyV4Attributes = <T>(
  attributes: Record<string, T>,
  schema: TaxonomyV4ResolvedSchema,
): Record<string, T> => {
  const allowedAttributeIds = new Set(
    schema.attributes.map(({ definition }) => definition.id),
  );
  return Object.fromEntries(
    Object.entries(attributes).filter(([attributeId]) =>
      allowedAttributeIds.has(attributeId),
    ),
  );
};
