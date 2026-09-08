import type { PropertyDraft } from "@shongre/contracts/real-estate";
import {
  EMPTY_PROPERTY_PUBLICATION_DRAFT,
  type PropertyPublicationDraftData,
} from "../../contracts/real-estate.contract";

// The form is flat; the published domain contract owns the nested stored shape.
const fields = {
  city: "address.city",
  postalCode: "address.postalCode",
  publicLabel: "address.publicLabel",
  exactAddress: "address.exactAddress",
  latitude: "address.latitude",
  longitude: "address.longitude",
  locationPrecision: "address.precision",
  livingAreaSquareMeters: "characteristics.livingAreaSquareMeters",
  landAreaSquareMeters: "characteristics.landAreaSquareMeters",
  rooms: "characteristics.rooms",
  bedrooms: "characteristics.bedrooms",
  bathrooms: "characteristics.bathrooms",
  amenities: "characteristics.amenities",
  condition: "characteristics.condition",
  isFurnished: "characteristics.isFurnished",
  priceMinor: "financials.price.amountMinor",
  currency: "financials.price.currency",
  chargesMinor: "financials.charges.amountMinor",
  period: "financials.period",
  feesPaidBy: "financials.feesPaidBy",
  dpeClass: "energy.dpeClass",
  gesClass: "energy.gesClass",
  coOwnershipApplicable: "regulatory.coOwnershipApplicable",
  coOwnershipLots: "regulatory.coOwnershipLots",
  ownershipDeclared: "regulatory.ownershipDeclared",
  mediaUrls: "media.photos",
  sellerType: "seller.type",
  sellerDisplayName: "seller.displayName",
} as const;
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const read = (value: unknown, path: string) =>
  path.split(".").reduce<unknown>((item, key) => object(item)[key], value);
function write(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop()!;
  let node = target;
  for (const key of keys) {
    node[key] = { ...object(node[key]) };
    node = node[key] as Record<string, unknown>;
  }
  if (value === "" || value === undefined) delete node[last];
  else node[last] = value;
}

export function propertyDraftToForm(draft: PropertyDraft): PropertyDraft {
  const data = { ...EMPTY_PROPERTY_PUBLICATION_DRAFT, ...draft.data };
  for (const [key, path] of Object.entries(fields)) {
    const value = read(draft.data, path);
    if (value !== undefined) data[key] = value;
  }
  return { ...draft, data };
}

export function propertyDraftToTransport(draft: PropertyDraft): PropertyDraft {
  const form = draft.data as PropertyPublicationDraftData;
  const data: Record<string, unknown> = { ...draft.data };
  for (const [key, path] of Object.entries(fields)) {
    write(data, path, form[key]);
    delete data[key];
  }
  write(data, "address.countryCode", draft.marketCode);
  if (form.chargesMinor)
    write(data, "financials.charges.currency", form.currency);
  else delete object(data.financials).charges;
  if (!form.coOwnershipApplicable || !form.coOwnershipLots)
    delete object(data.regulatory).coOwnershipLots;
  data.characteristics = {
    accessibilityFeatures: [],
    ...object(data.characteristics),
  };
  data.financials = { isNegotiable: false, ...object(data.financials) };
  data.regulatory = {
    coOwnershipProcedureStatus: "unknown",
    riskInformationStatus: "pending",
    legalNotices: [],
    ...object(data.regulatory),
  };
  data.media = { floorPlans: [], ...object(data.media) };
  data.seller = {
    id: draft.organizationId ?? draft.ownerUserId,
    verificationLabels: [],
    ...object(data.seller),
  };
  return { ...draft, data };
}
