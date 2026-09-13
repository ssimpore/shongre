import {
  propertyDraftToForm,
  propertyDraftToTransport,
} from "./property-draft.mapping";
import type {
  AgencyWorkspace,
  PropertyAppointment,
  PropertyDraft,
  PropertyImport,
  PropertyLead,
  PropertyLeadExport,
  PropertyLeadNote,
  PropertyPublic,
  PropertySearchQuery,
  PropertySearchResult,
  RealEstateAdminOverview,
  RealEstateCatalog,
  RealEstateMarketConfig,
} from "@shongre/contracts/real-estate";
import { apiOperation } from "./generated-api-operation";
import type {
  VerticalAddOn,
  VerticalCheckout,
  VerticalOffer,
} from "@shongre/contracts/vertical";
import type {
  PropertyLeadDraft,
  RealEstateServiceContract,
} from "../../contracts/real-estate.contract";
import { uploadPrivateDocument, uploadPublicImage } from "./http-upload";

export class HttpRealEstateService implements RealEstateServiceContract {
  getCatalog(marketCode: string) {
    return apiOperation<RealEstateCatalog, "getRealEstateCatalog">(
      "getRealEstateCatalog",
      { query: { market: marketCode } },
    );
  }
  getAdminOverview(marketCode: string) {
    return apiOperation<RealEstateAdminOverview, "getRealEstateAdminOverview">(
      "getRealEstateAdminOverview",
      { query: { market: marketCode } },
    );
  }
  searchProperties(query: PropertySearchQuery) {
    return apiOperation<PropertySearchResult, "postRealEstateSearch">(
      "postRealEstateSearch",
      { body: query },
    );
  }
  getProperty(idOrSlug: string, marketCode: string) {
    return apiOperation<PropertyPublic, "getRealEstatePropertiesById">(
      "getRealEstatePropertiesById",
      { path: { id: idOrSlug }, headers: { "X-Shongre-Market": marketCode } },
    );
  }
  getComparableProperties(propertyId: string, marketCode: string) {
    return apiOperation<
      PropertyPublic[],
      "getRealEstatePropertiesByIdComparables"
    >("getRealEstatePropertiesByIdComparables", {
      path: { id: propertyId },
      headers: { "X-Shongre-Market": marketCode },
    });
  }
  getRecentlyViewed() {
    return apiOperation<PropertyPublic[], "getRealEstateRecentlyViewed">(
      "getRealEstateRecentlyViewed",
      {},
    );
  }
  markRecentlyViewed(propertyId: string) {
    return apiOperation<void, "postRealEstateRecentlyViewed">(
      "postRealEstateRecentlyViewed",
      {
        body: {
          propertyId,
        },
      },
    );
  }
  async getOrCreateDraft(marketCode: string): Promise<PropertyDraft> {
    return propertyDraftToForm(
      await apiOperation<PropertyDraft, "postRealestateDrafts">(
        "postRealestateDrafts",
        {
          body: {
            marketCode,
          },
        },
      ),
    );
  }
  async getDraft(draftId: string) {
    try {
      return propertyDraftToForm(
        await apiOperation<PropertyDraft, "getRealEstateDraftsById">(
          "getRealEstateDraftsById",
          { path: { id: draftId } },
        ),
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
  async saveDraft(draft: PropertyDraft) {
    return propertyDraftToForm(
      await apiOperation<PropertyDraft, "putRealEstateDraftsById">(
        "putRealEstateDraftsById",
        { path: { id: draft.id }, body: propertyDraftToTransport(draft) },
      ),
    );
  }
  submitDraft(draftId: string) {
    return apiOperation<
      {
        propertyId: string;
        lifecycle: "pending_review";
      },
      "postRealEstateDraftsByIdSubmit"
    >("postRealEstateDraftsByIdSubmit", { path: { id: draftId } });
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
    return apiOperation<PropertyLead, "postRealEstateLeads">(
      "postRealEstateLeads",
      { body: input },
    );
  }
  requestAppointment(leadId: string, startsAt: string) {
    return apiOperation<
      PropertyAppointment,
      "postRealEstateLeadsByLeadIdAppointments"
    >("postRealEstateLeadsByLeadIdAppointments", {
      path: { leadId: leadId },
      body: { startsAt },
    });
  }
  getAgencyWorkspace(organizationId: string) {
    return apiOperation<
      AgencyWorkspace,
      "getRealEstateAgenciesByOrganizationIdWorkspace"
    >("getRealEstateAgenciesByOrganizationIdWorkspace", {
      path: { organizationId: organizationId },
    });
  }
  updateLead(
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<PropertyLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    return apiOperation<
      PropertyLead,
      "patchRealEstateAgenciesByOrganizationIdLeadsByLeadId"
    >("patchRealEstateAgenciesByOrganizationIdLeadsByLeadId", {
      path: { organizationId: organizationId, leadId: leadId },
      body: patch,
    });
  }
  addLeadNote(organizationId: string, leadId: string, body: string) {
    return apiOperation<
      PropertyLeadNote,
      "postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes"
    >("postRealEstateAgenciesByOrganizationIdLeadsByLeadIdNotes", {
      path: { organizationId: organizationId, leadId: leadId },
      body: { body },
    });
  }
  exportAgencyLeads(organizationId: string) {
    return apiOperation<
      PropertyLeadExport,
      "getRealEstateAgenciesByOrganizationIdLeadsExport"
    >("getRealEstateAgenciesByOrganizationIdLeadsExport", {
      path: { organizationId: organizationId },
    });
  }
  requestPropertyImport(
    organizationId: string,
    type: PropertyImport["type"],
    fileName?: string,
    idempotencyKey?: string,
  ) {
    return apiOperation<
      PropertyImport,
      "postRealEstateAgenciesByOrganizationIdImports"
    >("postRealEstateAgenciesByOrganizationIdImports", {
      path: { organizationId: organizationId },
      body: { type, fileName, idempotencyKey },
    });
  }
  createCheckout(input: {
    accountId: string;
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
    scenario?: "success" | "pending" | "failed" | "requires_action";
  }) {
    return apiOperation<VerticalCheckout, "postRealEstateCheckouts">(
      "postRealEstateCheckouts",
      { body: input },
    );
  }
  refundCheckout(
    checkoutId: string,
    input: { amountMinor?: number; idempotencyKey: string },
  ) {
    return apiOperation<
      VerticalCheckout,
      "postRealEstateCheckoutsByCheckoutIdRefunds"
    >("postRealEstateCheckoutsByCheckoutIdRefunds", {
      path: { checkoutId: checkoutId },
      body: input,
    });
  }
  updateMarketConfig(
    marketCode: string,
    patch: Partial<RealEstateMarketConfig>,
  ) {
    return apiOperation<
      RealEstateMarketConfig,
      "putRealEstateAdminMarketsByMarketCode"
    >("putRealEstateAdminMarketsByMarketCode", {
      path: { marketCode: marketCode },
      body: patch,
    });
  }
  updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<VerticalOffer>,
  ) {
    return apiOperation<
      VerticalOffer,
      "patchRealEstateAdminMarketsByMarketCodeOffersByOfferId"
    >("patchRealEstateAdminMarketsByMarketCodeOffersByOfferId", {
      path: { marketCode: marketCode, offerId: offerId },
      body: patch,
    });
  }
  updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<VerticalAddOn>,
  ) {
    return apiOperation<
      VerticalAddOn,
      "patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId"
    >("patchRealEstateAdminMarketsByMarketCodeAddOnsByAddOnId", {
      path: { marketCode: marketCode, addOnId: addOnId },
      body: patch,
    });
  }
}

export const httpRealEstateService = new HttpRealEstateService();
