import { toTaxonomyV4ItemCondition } from "@shongre/contracts/publication";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import type { PublicationDraftState } from "../../../domains/publication/publication.types";

const taxonomyV4Bundle = getTaxonomyV4PublicBundle();

/** Publication-only projection, loaded lazily by the publish flow. */
export function publicationPayload(draft: PublicationDraftState) {
  const allowedAttributeIds = new Set(
    taxonomyV4Bundle.bindings
      .filter(
        (binding) =>
          binding.categoryId === draft.taxonomyNodeId &&
          binding.listingTypeId === draft.listingTypeId &&
          binding.publicationVisible,
      )
      .map((binding) => binding.attributeId),
  );
  const acceptsItemCondition = taxonomyV4Bundle.bindings.some(
    (binding) =>
      binding.categoryId === draft.taxonomyNodeId &&
      binding.listingTypeId === draft.listingTypeId &&
      binding.attributeId === "item_condition",
  );
  const itemCondition = acceptsItemCondition
    ? toTaxonomyV4ItemCondition(draft.condition)
    : undefined;

  return {
    title: draft.title,
    description: draft.description,
    price: draft.pricing.isFreeDonation ? 0 : draft.pricing.amount,
    priceModel: draft.pricing.priceModel,
    categoryId: draft.taxonomyNodeId,
    marketCode: draft.marketCode,
    city: draft.location.city,
    postalCode: draft.location.postalCode,
    images: [...draft.photos]
      .sort((left, right) => Number(right.isCover) - Number(left.isCover))
      .map((photo) => photo.url),
    listingTypeId: draft.listingTypeId,
    intent: draft.listingIntent,
    taxonomyVersion: draft.taxonomyVersion,
    attributes: {
      ...Object.fromEntries(
        Object.entries(draft.attributes).filter(([attributeId]) =>
          allowedAttributeIds.has(attributeId),
        ),
      ),
      ...(itemCondition ? { item_condition: itemCondition } : {}),
      title: draft.title,
      description: draft.description,
      images: draft.photos.map((photo) => photo.url),
      price: Math.round(draft.pricing.amount * 100),
      currency: draft.pricing.currency,
      location_country: draft.location.countryCode,
      location_postcode: draft.location.postalCode,
      location_city: draft.location.city,
    },
    allowedDelivery: [
      ...(draft.digitalFulfillment
        ? ["digital"]
        : [
            ...(draft.fulfillment.allowHandDelivery ? ["hand_delivery"] : []),
            ...(draft.fulfillment.allowParcelShipping ? ["home_delivery"] : []),
          ]),
    ],
    fulfillmentTypes: draft.fulfillmentTypes ?? ["PHYSICAL"],
    digitalFulfillment: draft.digitalFulfillment,
    condition: draft.condition,
  };
}
