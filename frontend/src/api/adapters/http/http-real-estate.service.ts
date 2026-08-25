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
import type {
  PropertyLeadDraft,
  RealEstateServiceContract,
} from "../../contracts/real-estate.contract";
import { httpClient } from "./http-client";
import { uploadPrivateDocument, uploadPublicImage } from "./http-upload";

export class HttpRealEstateService implements RealEstateServiceContract {
  getCatalog(marketCode: string) {
    return httpClient.get<RealEstateCatalog>("/real-estate/catalog", {
      params: { market: marketCode },
    });
  }
  getAdminOverview(marketCode: string) {
    return httpClient.get<RealEstateAdminOverview>(
      "/real-estate/admin/overview",
      { params: { market: marketCode } },
    );
  }
  searchProperties(query: PropertySearchQuery) {
    return httpClient.post<PropertySearchResult>("/real-estate/search", query);
  }
  getProperty(idOrSlug: string) {
    return httpClient.get<PropertyPublic>(
      `/real-estate/properties/${encodeURIComponent(idOrSlug)}`,
    );
  }
  getComparableProperties(propertyId: string) {
    return httpClient.get<PropertyPublic[]>(
      `/real-estate/properties/${encodeURIComponent(propertyId)}/comparables`,
    );
  }
  getRecentlyViewed(_accountId: string) {
    return httpClient.get<PropertyPublic[]>("/real-estate/recently-viewed");
  }
  markRecentlyViewed(_accountId: string, propertyId: string) {
    return httpClient.post<void>("/real-estate/recently-viewed", {
      propertyId,
    });
  }
  getOrCreateDraft(
    _ownerUserId: string,
    marketCode: string,
    _sellerDisplayName?: string,
  ): Promise<PropertyDraft> {
    return httpClient.post<PropertyDraft>("/real-estate/drafts", {
      marketCode,
    });
  }
  async getDraft(draftId: string) {
    try {
      return await httpClient.get<PropertyDraft>(
        `/real-estate/drafts/${encodeURIComponent(draftId)}`,
      );
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "NOT_FOUND"
      )
        return null;
      throw error;
    }
  }
  saveDraft(draft: PropertyDraft) {
    return httpClient.put<PropertyDraft>(
      `/real-estate/drafts/${encodeURIComponent(draft.id)}`,
      draft,
    );
  }
  submitDraft(draftId: string) {
    return httpClient.post<{
      propertyId: string;
      lifecycle: "pending_review";
    }>(`/real-estate/drafts/${encodeURIComponent(draftId)}/submit`);
  }
  async uploadDraftMedia(
    _draftId: string,
    file: { name: string; type: string; size: number; body?: Blob },
    visibility: "public" | "private",
  ) {
    return visibility === "private"
      ? uploadPrivateDocument(file)
      : uploadPublicImage(file);
  }
  submitLead(input: PropertyLeadDraft) {
    return httpClient.post<PropertyLead>("/real-estate/leads", input);
  }
  requestAppointment(leadId: string, startsAt: string) {
    return httpClient.post<PropertyAppointment>(
      `/real-estate/leads/${encodeURIComponent(leadId)}/appointments`,
      { startsAt },
    );
  }
  getAgencyWorkspace(organizationId: string) {
    return httpClient.get<AgencyWorkspace>(
      `/real-estate/agencies/${encodeURIComponent(organizationId)}/workspace`,
    );
  }
  updateLead(
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<PropertyLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    return httpClient.request<PropertyLead>(
      `/real-estate/agencies/${encodeURIComponent(organizationId)}/leads/${encodeURIComponent(leadId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
  addLeadNote(organizationId: string, leadId: string, body: string) {
    return httpClient.post<PropertyLeadNote>(
      `/real-estate/agencies/${encodeURIComponent(organizationId)}/leads/${encodeURIComponent(leadId)}/notes`,
      { body },
    );
  }
  exportAgencyLeads(organizationId: string) {
    return httpClient.get<PropertyLeadExport>(
      `/real-estate/agencies/${encodeURIComponent(organizationId)}/leads/export`,
    );
  }
  requestPropertyImport(
    organizationId: string,
    type: PropertyImport["type"],
    fileName?: string,
    idempotencyKey?: string,
  ) {
    return httpClient.post<PropertyImport>(
      `/real-estate/agencies/${encodeURIComponent(organizationId)}/imports`,
      { type, fileName, idempotencyKey },
    );
  }
  createCheckout(input: {
    accountId: string;
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
    scenario?: "success" | "pending" | "failed" | "requires_action";
  }) {
    return httpClient.post<VerticalCheckout>("/real-estate/checkouts", input);
  }
  refundCheckout(
    checkoutId: string,
    input: { amountMinor?: number; idempotencyKey: string },
  ) {
    return httpClient.post<VerticalCheckout>(
      `/real-estate/checkouts/${encodeURIComponent(checkoutId)}/refunds`,
      input,
    );
  }
  updateMarketConfig(
    marketCode: string,
    patch: Partial<RealEstateMarketConfig>,
  ) {
    return httpClient.put<RealEstateMarketConfig>(
      `/real-estate/admin/markets/${encodeURIComponent(marketCode)}`,
      patch,
    );
  }
  updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<VerticalOffer>,
  ) {
    return httpClient.request<VerticalOffer>(
      `/real-estate/admin/markets/${encodeURIComponent(marketCode)}/offers/${encodeURIComponent(offerId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
  updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<VerticalAddOn>,
  ) {
    return httpClient.request<VerticalAddOn>(
      `/real-estate/admin/markets/${encodeURIComponent(marketCode)}/add-ons/${encodeURIComponent(addOnId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
  updatePropertyType(
    marketCode: string,
    type: string,
    patch: Partial<PropertyTypeConfig>,
  ) {
    return httpClient.request<PropertyTypeConfig>(
      `/real-estate/admin/markets/${encodeURIComponent(marketCode)}/types/${encodeURIComponent(type)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
  updateFieldRule(
    marketCode: string,
    ruleId: string,
    patch: Partial<PropertyFieldRule>,
  ) {
    return httpClient.request<PropertyFieldRule>(
      `/real-estate/admin/markets/${encodeURIComponent(marketCode)}/field-rules/${encodeURIComponent(ruleId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
}

export const httpRealEstateService = new HttpRealEstateService();
