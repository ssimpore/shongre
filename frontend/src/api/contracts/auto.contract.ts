import type {
  AutoAdminOverview,
  AutoAddOn,
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

export type AutoLeadDraft = Pick<
  AutoLead,
  | "vehicleId"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "intention"
  | "message"
  | "source"
  | "marketingConsent"
>;

export interface AutoServiceContract {
  getCatalog(marketCode: string): Promise<AutoCatalog>;
  getAdminOverview(marketCode: string): Promise<AutoAdminOverview>;
  searchVehicles(query: VehicleSearchQuery): Promise<VehicleSearchResponse>;
  getVehicle(idOrSlug: string): Promise<VehiclePublic>;
  getDraft(draftId: string): Promise<VehicleDraft | null>;
  saveDraft(draft: VehicleDraft): Promise<VehicleDraft>;
  checkDuplicateIdentity(
    draftId: string,
    vin?: string,
    registration?: string,
  ): Promise<{ status: VehicleDraft["duplicateCheck"] }>;
  submitDraft(
    draftId: string,
  ): Promise<{ vehicleId: string; lifecycle: "pending_review" }>;
  uploadDraftMedia(
    draftId: string,
    file: { name: string; type: string; size: number; body?: Blob },
  ): Promise<{ url: string }>;
  submitLead(input: AutoLeadDraft): Promise<AutoLead>;
  getDealerWorkspace(organizationId: string): Promise<DealerWorkspace>;
  updateLead(
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<AutoLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ): Promise<AutoLead>;
  requestInventoryImport(
    organizationId: string,
    type: InventoryImport["type"],
    fileName?: string,
    idempotencyKey?: string,
  ): Promise<InventoryImport>;
  getFavoriteVehicleIds(accountId: string): Promise<string[]>;
  toggleFavoriteVehicle(accountId: string, vehicleId: string): Promise<boolean>;
  updateMarketConfig(
    marketCode: string,
    patch: Partial<AutoMarketConfig>,
  ): Promise<AutoMarketConfig>;
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
  ): Promise<AutoPlan>;
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
  ): Promise<AutoAddOn>;
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
  ): Promise<VehicleTypeConfig>;
}
