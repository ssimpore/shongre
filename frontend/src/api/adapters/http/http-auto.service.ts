import type {
  AutoAddOn,
  AutoAdminOverview,
  AutoCatalog,
  AutoLead,
  AutoMarketConfig,
  AutoPlan,
  DealerWorkspace,
  InventoryImport,
  VehicleDraft,
  VehiclePublic,
  VehicleSearchQuery,
  VehicleSearchResponse,
} from "@shongre/contracts/auto";
import { apiOperation } from "./generated-api-operation";
import type {
  AutoLeadDraft,
  AutoServiceContract,
} from "../../contracts/auto.contract";
import { uploadPublicImage } from "./http-upload";

export class HttpAutoService implements AutoServiceContract {
  getCatalog(marketCode: string) {
    return apiOperation<AutoCatalog, "getAutoCatalog">("getAutoCatalog", {
      query: { market: marketCode },
    });
  }
  getAdminOverview(marketCode: string) {
    return apiOperation<AutoAdminOverview, "getAutoAdminOverview">(
      "getAutoAdminOverview",
      { query: { market: marketCode } },
    );
  }
  searchVehicles(query: VehicleSearchQuery) {
    return apiOperation<VehicleSearchResponse, "postAutoSearch">(
      "postAutoSearch",
      { body: query },
    );
  }
  getVehicle(idOrSlug: string, marketCode: string) {
    return apiOperation<VehiclePublic, "getAutoVehiclesById">(
      "getAutoVehiclesById",
      { path: { id: idOrSlug }, headers: { "X-Shongre-Market": marketCode } },
    );
  }
  getOrCreateDraft(marketCode: string): Promise<VehicleDraft> {
    return apiOperation<VehicleDraft, "postAutoDrafts">("postAutoDrafts", {
      body: { marketCode },
    });
  }
  async getDraft(draftId: string) {
    try {
      return await apiOperation<VehicleDraft, "getAutoDraftsById">(
        "getAutoDraftsById",
        { path: { id: draftId } },
      );
    } catch (error: any) {
      if (error?.code === "NOT_FOUND") return null;
      throw error;
    }
  }
  saveDraft(draft: VehicleDraft) {
    return apiOperation<VehicleDraft, "putAutoDraftsById">(
      "putAutoDraftsById",
      { path: { id: draft.id }, body: draft },
    );
  }
  checkDuplicateIdentity(draftId: string, vin?: string, registration?: string) {
    return apiOperation<
      { status: VehicleDraft["duplicateCheck"] },
      "postAutoDraftsByIdDuplicateCheck"
    >("postAutoDraftsByIdDuplicateCheck", {
      path: { id: draftId },
      body: { vin, registration },
    });
  }
  submitDraft(
    draftId: string,
  ): Promise<{ vehicleId: string; lifecycle: "pending_review" }> {
    return apiOperation<
      { vehicleId: string; lifecycle: "pending_review" },
      "postAutoDraftsByIdSubmit"
    >("postAutoDraftsByIdSubmit", { path: { id: draftId } });
  }
  async uploadDraftMedia(
    _draftId: string,
    file: { name: string; type: string; size: number; body?: Blob },
  ) {
    const uploaded = await uploadPublicImage(file);
    return { url: uploaded.url };
  }
  submitLead(input: AutoLeadDraft): Promise<AutoLead> {
    return apiOperation<AutoLead, "postAutoLeads">("postAutoLeads", {
      body: input,
    });
  }
  getDealerWorkspace(organizationId: string) {
    return apiOperation<
      DealerWorkspace,
      "getAutoDealersByOrganizationIdWorkspace"
    >("getAutoDealersByOrganizationIdWorkspace", {
      path: { organizationId: organizationId },
    });
  }
  updateLead(
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<AutoLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    return apiOperation<
      AutoLead,
      "patchAutoDealersByOrganizationIdLeadsByLeadId"
    >("patchAutoDealersByOrganizationIdLeadsByLeadId", {
      path: { organizationId: organizationId, leadId: leadId },
      body: patch,
    });
  }
  requestInventoryImport(
    organizationId: string,
    type: InventoryImport["type"],
    fileName?: string,
    idempotencyKey?: string,
  ) {
    return apiOperation<
      InventoryImport,
      "postAutoDealersByOrganizationIdImports"
    >("postAutoDealersByOrganizationIdImports", {
      path: { organizationId: organizationId },
      body: { type, fileName, idempotencyKey },
    });
  }
  async getFavoriteVehicleIds(marketCode: string): Promise<string[]> {
    const result = await apiOperation<
      { vehicleIds: string[] },
      "getAutoFavorites"
    >("getAutoFavorites", { headers: { "X-Shongre-Market": marketCode } });
    return result.vehicleIds;
  }
  async setFavoriteVehicle(
    vehicleId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const result = await apiOperation<
      { isFavorite: boolean },
      "putAutoVehiclesByIdFavorite"
    >("putAutoVehiclesByIdFavorite", {
      path: { id: vehicleId },
      body: { isFavorite },
      headers: { "X-Shongre-Market": marketCode },
    });
    return result.isFavorite;
  }
  updateMarketConfig(marketCode: string, patch: Partial<AutoMarketConfig>) {
    return apiOperation<AutoMarketConfig, "putAutoAdminMarketsByMarketCode">(
      "putAutoAdminMarketsByMarketCode",
      { path: { marketCode: marketCode }, body: patch },
    );
  }
  updatePlan(
    marketCode: string,
    planId: string,
    patch: Partial<
      Pick<
        AutoPlan,
        | "isActive"
        | "monthlyPrice"
        | "annualPrice"
        | "durationDays"
        | "trialDays"
        | "vehicleTypes"
        | "entitlements"
      >
    >,
  ) {
    return apiOperation<
      AutoPlan,
      "patchAutoAdminMarketsByMarketCodePlansByPlanId"
    >("patchAutoAdminMarketsByMarketCodePlansByPlanId", {
      path: { marketCode: marketCode, planId: planId },
      body: patch,
    });
  }
  updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<
      Pick<
        AutoAddOn,
        | "vehicleType"
        | "name"
        | "description"
        | "price"
        | "taxRateBps"
        | "validityDays"
        | "creditQuantity"
        | "isActive"
      >
    >,
  ) {
    return apiOperation<
      AutoAddOn,
      "patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId"
    >("patchAutoAdminMarketsByMarketCodeAddOnsByAddOnId", {
      path: { marketCode: marketCode, addOnId: addOnId },
      body: patch,
    });
  }
}

export const httpAutoService = new HttpAutoService();
