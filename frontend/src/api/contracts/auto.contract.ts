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

/** Neutral form shape used only while an adapter-backed draft is loading. */
export const EMPTY_AUTO_DRAFT_DATA = {
  vehicleType: "",
  makeId: "",
  makeLabel: "",
  modelId: "",
  modelLabel: "",
  generationLabel: "",
  trimLabel: "",
  modelYear: 0,
  firstRegistrationDate: "",
  mileage: 0,
  mileageUnit: "km",
  fuelType: "",
  transmission: "",
  bodyType: "",
  powerHp: 0,
  fiscalPower: 0,
  exteriorColor: "",
  doors: 0,
  seats: 0,
  co2GramsPerKm: 0,
  critAirClass: "",
  condition: "",
  accidentStatus: "",
  previousOwnerCount: 0,
  maintenanceBookStatus: "",
  inspectionStatus: "",
  inspectionValidUntil: "",
  warrantyMonths: 0,
  priceMinor: 0,
  priceIncludesTax: false,
  priceNegotiable: false,
  financingAvailable: false,
  locationLabel: "",
  title: "",
  description: "",
  mediaUrls: [] as string[],
  equipment: [] as string[],
  documents: [] as import("@shongre/contracts/auto").VehicleDocument[],
  historyReportStatus: "",
  sellerType: "",
  sellerDisplayName: "",
  planId: "",
} as const;

type WidenDraftValue<Value> = Value extends readonly (infer Item)[]
  ? Item[]
  : Value extends string
    ? string
    : Value extends number
      ? number
      : Value extends boolean
        ? boolean
        : Value;

export type AutoDraftData = {
  -readonly [Key in keyof typeof EMPTY_AUTO_DRAFT_DATA]: WidenDraftValue<
    (typeof EMPTY_AUTO_DRAFT_DATA)[Key]
  >;
} & Record<string, unknown>;

export interface AutoServiceContract {
  getCatalog(marketCode: string): Promise<AutoCatalog>;
  getAdminOverview(marketCode: string): Promise<AutoAdminOverview>;
  searchVehicles(query: VehicleSearchQuery): Promise<VehicleSearchResponse>;
  getVehicle(idOrSlug: string): Promise<VehiclePublic>;
  getOrCreateDraft(
    ownerUserId: string,
    marketCode: string,
  ): Promise<VehicleDraft>;
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
