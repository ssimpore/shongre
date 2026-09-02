import type {
  TaxonomyV4ListingIntent,
  TaxonomyV4ResolvedSchema,
} from "@shongre/contracts";
import type { ListingIntent } from "./publication.types";
import type { PublicationDraftState } from "./publication.types";
import { reconcileTaxonomyValues } from "@shongre/features";

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
  listingTypeId?: string,
): schema is TaxonomyV4ResolvedSchema =>
  Boolean(
    schema &&
    taxonomyNodeId &&
    schema.category.id === taxonomyNodeId &&
    schema.listingType.intent === toTaxonomyV4ListingIntent(listingIntent) &&
    (!listingTypeId || schema.listingType.id === listingTypeId),
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

const SENSITIVE_DRAFT_ATTRIBUTE =
  /(password|secret|credential|access[_-]?token|refresh[_-]?token|kyc|identity[_-]?document|payment[_-]?card|bank[_-]?account|iban|license[_-]?key|download[_-]?url|access[_-]?code)/i;

export function sanitizePublicationDraftForPersistence(
  draft: PublicationDraftState,
): PublicationDraftState {
  return {
    ...draft,
    attributes: Object.fromEntries(
      Object.entries(draft.attributes ?? {}).filter(
        ([attributeId]) => !SENSITIVE_DRAFT_ATTRIBUTE.test(attributeId),
      ),
    ),
    // Fulfilment credentials and private delivery payloads are recreated only
    // at the confirmed publish boundary; they never enter browser draft storage.
    digitalFulfillment: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizePublicationDraftForSubmission(input: {
  draft: PublicationDraftState;
  schema: TaxonomyV4ResolvedSchema;
  sellerType: "individual" | "professional";
  optionsByAttribute?: Readonly<
    Record<string, TaxonomyV4ResolvedSchema["attributes"][number]["options"]>
  >;
}): PublicationDraftState {
  const reconciled = reconcileTaxonomyValues({
    schema: input.schema,
    values: input.draft.attributes,
    sellerType: input.sellerType,
    fulfillmentTypes: input.draft.fulfillmentTypes,
    optionsByAttribute: input.optionsByAttribute,
  });
  return {
    ...input.draft,
    taxonomyNodeId: input.schema.category.id,
    taxonomyPath: input.draft.taxonomyPath,
    listingTypeId: input.schema.listingType.id,
    taxonomyVersion: "4.0.0",
    attributes: reconciled.values,
  };
}
