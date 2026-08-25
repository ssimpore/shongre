import type {
  AgencyWorkspace,
  PropertyAppointment,
  PropertyDraft,
  PropertyImport,
  PropertyFieldRule,
  PropertyLead,
  PropertyLeadExport,
  PropertyLeadNote,
  PropertyPublic,
  PropertySearchQuery,
  PropertySearchResult,
  PropertyTypeConfig,
  RealEstateAdminOverview,
  RealEstateCatalog,
  RealEstateMarketConfig,
} from "@shongre/contracts/real-estate";
import type {
  VerticalAddOn,
  VerticalCheckout,
  VerticalOffer,
} from "@shongre/contracts/vertical";

export type PropertyLeadDraft = Pick<
  PropertyLead,
  | "propertyId"
  | "type"
  | "requesterName"
  | "requesterEmail"
  | "requesterPhone"
  | "message"
  | "desiredMoveDate"
  | "preferredContactChannel"
  | "consentGiven"
  | "qualificationAnswers"
>;

export interface PropertyPublicationDraftData {
  [key: string]: unknown;
  transactionType: string;
  propertyType: string;
  marketCodes: string[];
  city: string;
  postalCode: string;
  publicLabel: string;
  exactAddress: string;
  latitude: number;
  longitude: number;
  locationPrecision: "street" | "district" | "city";
  livingAreaSquareMeters: number;
  landAreaSquareMeters: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  condition: string;
  isFurnished: boolean;
  priceMinor: number;
  chargesMinor: number;
  period: string;
  feesPaidBy: string;
  dpeClass: string;
  gesClass: string;
  coOwnershipApplicable: boolean;
  coOwnershipLots: number;
  ownershipDeclared: boolean;
  title: string;
  description: string;
  mediaUrls: string[];
  privateDocumentKeys: string[];
  sellerType: string;
  sellerDisplayName: string;
  offerId: string;
  addOnIds: string[];
  paymentStatus?: string;
}

/** Neutral view state until the active adapter resolves a draft. */
export const EMPTY_PROPERTY_PUBLICATION_DRAFT: PropertyPublicationDraftData = {
  transactionType: "",
  propertyType: "",
  marketCodes: [],
  city: "",
  postalCode: "",
  publicLabel: "",
  exactAddress: "",
  latitude: 0,
  longitude: 0,
  locationPrecision: "city",
  livingAreaSquareMeters: 0,
  landAreaSquareMeters: 0,
  rooms: 0,
  bedrooms: 0,
  bathrooms: 0,
  amenities: [],
  condition: "",
  isFurnished: false,
  priceMinor: 0,
  chargesMinor: 0,
  period: "",
  feesPaidBy: "",
  dpeClass: "",
  gesClass: "",
  coOwnershipApplicable: false,
  coOwnershipLots: 0,
  ownershipDeclared: false,
  title: "",
  description: "",
  mediaUrls: [],
  privateDocumentKeys: [],
  sellerType: "",
  sellerDisplayName: "",
  offerId: "",
  addOnIds: [],
};

export interface RealEstateServiceContract {
  getCatalog(marketCode: string): Promise<RealEstateCatalog>;
  getAdminOverview(marketCode: string): Promise<RealEstateAdminOverview>;
  searchProperties(query: PropertySearchQuery): Promise<PropertySearchResult>;
  getProperty(idOrSlug: string): Promise<PropertyPublic>;
  getComparableProperties(propertyId: string): Promise<PropertyPublic[]>;
  getRecentlyViewed(accountId: string): Promise<PropertyPublic[]>;
  markRecentlyViewed(accountId: string, propertyId: string): Promise<void>;
  getOrCreateDraft(
    ownerUserId: string,
    marketCode: string,
    sellerDisplayName?: string,
  ): Promise<PropertyDraft>;
  getDraft(draftId: string): Promise<PropertyDraft | null>;
  saveDraft(draft: PropertyDraft): Promise<PropertyDraft>;
  submitDraft(
    draftId: string,
  ): Promise<{ propertyId: string; lifecycle: "pending_review" }>;
  uploadDraftMedia(
    draftId: string,
    file: { name: string; type: string; size: number; body?: Blob },
    visibility: "public" | "private",
  ): Promise<{ url?: string; privateStorageKey?: string }>;
  submitLead(input: PropertyLeadDraft): Promise<PropertyLead>;
  requestAppointment(
    leadId: string,
    startsAt: string,
  ): Promise<PropertyAppointment>;
  getAgencyWorkspace(organizationId: string): Promise<AgencyWorkspace>;
  updateLead(
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<PropertyLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ): Promise<PropertyLead>;
  addLeadNote(
    organizationId: string,
    leadId: string,
    body: string,
  ): Promise<PropertyLeadNote>;
  exportAgencyLeads(organizationId: string): Promise<PropertyLeadExport>;
  requestPropertyImport(
    organizationId: string,
    type: PropertyImport["type"],
    fileName?: string,
    idempotencyKey?: string,
  ): Promise<PropertyImport>;
  createCheckout(input: {
    accountId: string;
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
  }): Promise<VerticalCheckout>;
  refundCheckout(
    checkoutId: string,
    input: { amountMinor?: number; idempotencyKey: string },
  ): Promise<VerticalCheckout>;
  updateMarketConfig(
    marketCode: string,
    patch: Partial<RealEstateMarketConfig>,
  ): Promise<RealEstateMarketConfig>;
  updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<VerticalOffer>,
  ): Promise<VerticalOffer>;
  updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<VerticalAddOn>,
  ): Promise<VerticalAddOn>;
  updatePropertyType(
    marketCode: string,
    type: string,
    patch: Partial<PropertyTypeConfig>,
  ): Promise<PropertyTypeConfig>;
  updateFieldRule(
    marketCode: string,
    ruleId: string,
    patch: Partial<PropertyFieldRule>,
  ): Promise<PropertyFieldRule>;
}
