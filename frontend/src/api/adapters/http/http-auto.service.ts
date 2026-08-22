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
  VehicleTypeConfig,
} from "@shongre/contracts/auto";
import type {
  AutoLeadDraft,
  AutoServiceContract,
} from "../../contracts/auto.contract";
import { httpClient } from "./http-client";

export class HttpAutoService implements AutoServiceContract {
  getCatalog(marketCode: string) {
    return httpClient.get<AutoCatalog>("/auto/catalog", {
      params: { market: marketCode },
    });
  }
  getAdminOverview(marketCode: string) {
    return httpClient.get<AutoAdminOverview>("/auto/admin/overview", {
      params: { market: marketCode },
    });
  }
  searchVehicles(query: VehicleSearchQuery) {
    return httpClient.post<VehicleSearchResponse>("/auto/search", query);
  }
  getVehicle(idOrSlug: string) {
    return httpClient.get<VehiclePublic>(
      `/auto/vehicles/${encodeURIComponent(idOrSlug)}`,
    );
  }
  async getDraft(draftId: string) {
    try {
      return await httpClient.get<VehicleDraft>(
        `/auto/drafts/${encodeURIComponent(draftId)}`,
      );
    } catch (error: any) {
      if (error?.code === "NOT_FOUND") return null;
      throw error;
    }
  }
  saveDraft(draft: VehicleDraft) {
    return httpClient.put<VehicleDraft>(
      `/auto/drafts/${encodeURIComponent(draft.id)}`,
      draft,
    );
  }
  checkDuplicateIdentity(draftId: string, vin?: string, registration?: string) {
    return httpClient.post<{ status: VehicleDraft["duplicateCheck"] }>(
      `/auto/drafts/${encodeURIComponent(draftId)}/duplicate-check`,
      { vin, registration },
    );
  }
  submitDraft(
    draftId: string,
  ): Promise<{ vehicleId: string; lifecycle: "pending_review" }> {
    return httpClient.post(
      `/auto/drafts/${encodeURIComponent(draftId)}/submit`,
    );
  }
  uploadDraftMedia(
    draftId: string,
    file: { name: string; type: string; size: number },
  ) {
    return httpClient.post<{ url: string }>(
      `/auto/drafts/${encodeURIComponent(draftId)}/media`,
      file,
    );
  }
  submitLead(input: AutoLeadDraft): Promise<AutoLead> {
    return httpClient.post("/auto/leads", input);
  }
  getDealerWorkspace(organizationId: string) {
    return httpClient.get<DealerWorkspace>(
      `/auto/dealers/${encodeURIComponent(organizationId)}/workspace`,
    );
  }
  updateLead(
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<AutoLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    return httpClient.request<AutoLead>(
      `/auto/dealers/${encodeURIComponent(organizationId)}/leads/${encodeURIComponent(leadId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
  requestInventoryImport(
    organizationId: string,
    type: InventoryImport["type"],
    fileName?: string,
    idempotencyKey?: string,
  ) {
    return httpClient.post<InventoryImport>(
      `/auto/dealers/${encodeURIComponent(organizationId)}/imports`,
      { type, fileName, idempotencyKey },
    );
  }
  async getFavoriteVehicleIds(_accountId: string): Promise<string[]> {
    return [];
  }
  async toggleFavoriteVehicle(
    _accountId: string,
    _vehicleId: string,
  ): Promise<boolean> {
    throw new Error(
      "Les favoris Auto seront persistés après migration des favoris verticaux.",
    );
  }
  updateMarketConfig(marketCode: string, patch: Partial<AutoMarketConfig>) {
    return httpClient.put<AutoMarketConfig>(
      `/auto/admin/markets/${encodeURIComponent(marketCode)}`,
      patch,
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
    return httpClient.request<AutoPlan>(
      `/auto/admin/markets/${encodeURIComponent(marketCode)}/plans/${encodeURIComponent(planId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
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
    return httpClient.request<AutoAddOn>(
      `/auto/admin/markets/${encodeURIComponent(marketCode)}/add-ons/${encodeURIComponent(addOnId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
  updateVehicleType(
    marketCode: string,
    type: string,
    patch: Partial<
      Pick<
        VehicleTypeConfig,
        | "label"
        | "description"
        | "isActive"
        | "requiredFieldIds"
        | "filterFieldIds"
      >
    >,
  ) {
    return httpClient.request<VehicleTypeConfig>(
      `/auto/admin/markets/${encodeURIComponent(marketCode)}/types/${encodeURIComponent(type)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
}

export const httpAutoService = new HttpAutoService();
