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

export interface RealEstateServiceContract {
  getCatalog(marketCode: string): Promise<RealEstateCatalog>;
  getAdminOverview(marketCode: string): Promise<RealEstateAdminOverview>;
  searchProperties(query: PropertySearchQuery): Promise<PropertySearchResult>;
  getProperty(idOrSlug: string): Promise<PropertyPublic>;
  getComparableProperties(propertyId: string): Promise<PropertyPublic[]>;
  getRecentlyViewed(accountId: string): Promise<PropertyPublic[]>;
  markRecentlyViewed(accountId: string, propertyId: string): Promise<void>;
  getDraft(draftId: string): Promise<PropertyDraft | null>;
  saveDraft(draft: PropertyDraft): Promise<PropertyDraft>;
  submitDraft(
    draftId: string,
  ): Promise<{ propertyId: string; lifecycle: "pending_review" }>;
  uploadDraftMedia(
    draftId: string,
    file: { name: string; type: string; size: number },
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
    scenario?: "success" | "pending" | "failed" | "requires_action";
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
