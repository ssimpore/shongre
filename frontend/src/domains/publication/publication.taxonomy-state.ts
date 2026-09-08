import type {
  TaxonomyV1ListingIntent,
  TaxonomyV1ResolvedSchema,
} from "@shongre/contracts";
import type { ListingIntent } from "./publication.types";
import type { PublicationDraftState } from "./publication.types";
import { reconcileTaxonomyValues } from "@shongre/features";

export const toTaxonomyV1ListingIntent = (
  intent: ListingIntent,
): TaxonomyV1ListingIntent => {
  if (intent === "GIVE") return "DONATE";
  if (intent === "RENT") return "RENT_OUT";
  if (intent === "OFFER_SERVICE") return "SERVICE_OFFER";
  return intent;
};

export const isCurrentTaxonomyV1Schema = (
  schema: TaxonomyV1ResolvedSchema | null,
  taxonomyNodeId: string,
  listingIntent: ListingIntent,
  listingTypeId?: string,
): schema is TaxonomyV1ResolvedSchema =>
  Boolean(
    schema &&
    taxonomyNodeId &&
    schema.category.id === taxonomyNodeId &&
    schema.listingType.intent === toTaxonomyV1ListingIntent(listingIntent) &&
    (!listingTypeId || schema.listingType.id === listingTypeId),
  );

export const retainTaxonomyV1Attributes = <T>(
  attributes: Record<string, T>,
  schema: TaxonomyV1ResolvedSchema,
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
  schema: TaxonomyV1ResolvedSchema;
  sellerType: "individual" | "professional";
  optionsByAttribute?: Readonly<
    Record<string, TaxonomyV1ResolvedSchema["attributes"][number]["options"]>
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
    taxonomyVersion: "v1",
    taxonomyRevision: input.schema.revision,
    attributes: reconciled.values,
  };
}
