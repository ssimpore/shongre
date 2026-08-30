import type {
  AutoAddOn,
  AutoLead,
  AutoMarketConfig,
  AutoPlan,
  InventoryImport,
  VehicleDraft,
  VehiclePrivate,
  VehicleSearchQuery,
  VehicleTypeConfig,
} from "@shongre/contracts/auto";
import { AUTO_CONSTRAINTS, AUTO_SCHEMA_VERSION } from "@shongre/contracts/auto";
import { applyMonetizationToAutoCatalog } from "@shongre/contracts/vertical-monetization-adapters";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { simulateNetworkDelay } from "../../client/api-client.config";
import type {
  AutoLeadDraft,
  AutoServiceContract,
} from "../../contracts/auto.contract";
import {
  AUTO_DEMO_ADMIN,
  AUTO_DEMO_CATALOG,
  AUTO_DEMO_DRAFT_DATA,
  AUTO_DEMO_LEADS,
  AUTO_DEMO_MEDIA_URLS,
  AUTO_DEMO_NOW,
  AUTO_DEMO_PRIVATE_VEHICLES,
  AUTO_DEMO_WORKSPACE,
  toPublicVehicle,
} from "../../../mocks/autoDemoData";
import { storageService } from "../../../services/storage.service";
import { requireDemoCapability } from "./demo-authorization";

const clone = <T>(value: T): T => structuredClone(value);
const autoDraftKey = (draftId: string) => `shongre_auto_draft_v2:${draftId}`;
const activeAutoDraftKey = (ownerUserId: string) =>
  `shongre_auto_active_draft_v2:${ownerUserId}`;

function matches(query: VehicleSearchQuery, vehicle: VehiclePrivate) {
  if (
    vehicle.lifecycle !== "published" ||
    !vehicle.marketCodes.includes(query.marketCode)
  )
    return false;
  if (
    query.vehicleTypes?.length &&
    !query.vehicleTypes.includes(vehicle.vehicleType)
  )
    return false;
  if (
    query.makeIds?.length &&
    (!vehicle.makeId || !query.makeIds.includes(vehicle.makeId))
  )
    return false;
  if (
    query.modelIds?.length &&
    (!vehicle.modelId || !query.modelIds.includes(vehicle.modelId))
  )
    return false;
  if (
    query.bodyTypes?.length &&
    (!vehicle.technical.bodyType ||
      !query.bodyTypes.includes(vehicle.technical.bodyType))
  )
    return false;
  if (
    query.fuelTypes?.length &&
    !query.fuelTypes.includes(vehicle.technical.fuelType)
  )
    return false;
  if (
    query.transmissions?.length &&
    !query.transmissions.includes(vehicle.technical.transmission)
  )
    return false;
  if (
    query.sellerTypes?.length &&
    !query.sellerTypes.includes(vehicle.seller.type)
  )
    return false;
  if (
    query.minPriceMinor !== undefined &&
    vehicle.price.amountMinor < query.minPriceMinor
  )
    return false;
  if (
    query.maxPriceMinor !== undefined &&
    vehicle.price.amountMinor > query.maxPriceMinor
  )
    return false;
  if (
    query.minYear !== undefined &&
    vehicle.technical.modelYear < query.minYear
  )
    return false;
  if (
    query.maxYear !== undefined &&
    vehicle.technical.modelYear > query.maxYear
  )
    return false;
  if (
    query.maxMileage !== undefined &&
    vehicle.technical.mileage > query.maxMileage
  )
    return false;
  if (
    query.minPowerHp !== undefined &&
    (vehicle.technical.powerHp || 0) < query.minPowerHp
  )
    return false;
  if (
    query.maxPowerHp !== undefined &&
    (vehicle.technical.powerHp || 0) > query.maxPowerHp
  )
    return false;
  if (
    query.minBatteryCapacityKwh !== undefined &&
    (vehicle.technical.batteryCapacityKwh || 0) < query.minBatteryCapacityKwh
  )
    return false;
  if (
    query.minElectricRangeKm !== undefined &&
    (vehicle.technical.electricRangeKm || 0) < query.minElectricRangeKm
  )
    return false;
  if (
    query.city &&
    !vehicle.locationLabel.toLowerCase().includes(query.city.toLowerCase())
  )
    return false;
  if (query.warrantyOnly && !vehicle.history.warrantyMonths) return false;
  if (query.financingAvailable && !vehicle.financingAvailable) return false;
  if (
    query.query &&
    !`${vehicle.title} ${vehicle.description} ${vehicle.makeLabel} ${vehicle.modelLabel}`
      .toLowerCase()
      .includes(query.query.toLowerCase())
  )
    return false;
  return true;
}

export class DemoAutoService implements AutoServiceContract {
  private catalog = clone(AUTO_DEMO_CATALOG);
  private vehicles = new Map(
    AUTO_DEMO_PRIVATE_VEHICLES.map((row) => [row.id, clone(row)]),
  );
  private leads = new Map(AUTO_DEMO_LEADS.map((row) => [row.id, clone(row)]));
  private drafts = new Map<string, VehicleDraft>();
  private favorites = new Map<string, Set<string>>([
    ["user_thomas", new Set(["vehicle_3008_petrol"])],
  ]);
  private sequence = 1;

  async getCatalog(marketCode: string) {
    requireDemoCapability("auto.read");
    await simulateNetworkDelay();
    const catalog = clone(
      applyMonetizationToAutoCatalog(
        {
          ...this.catalog,
          config: {
            ...this.catalog.config,
            marketCode: marketCode.toUpperCase(),
          },
        },
        BASELINE_MONETIZATION_CATALOG,
      ),
    );
    return {
      ...catalog,
      vehicleTypes: catalog.vehicleTypes.filter((row) => row.isActive),
      attributes: catalog.attributes.filter((row) => row.isActive),
      vehicleCatalog: catalog.vehicleCatalog.filter((row) => row.isActive),
      plans: catalog.plans.filter((row) => row.isActive),
      addOns: catalog.addOns.filter((row) => row.isActive),
    };
  }

  async getAdminOverview(marketCode: string) {
    requireDemoCapability("auto.admin.manage");
    await simulateNetworkDelay();
    return clone({
      ...AUTO_DEMO_ADMIN,
      catalog: {
        ...applyMonetizationToAutoCatalog(
          this.catalog,
          BASELINE_MONETIZATION_CATALOG,
        ),
        config: {
          ...this.catalog.config,
          marketCode: marketCode.toUpperCase(),
        },
      },
      metrics: {
        ...AUTO_DEMO_ADMIN.metrics,
        activeVehicles: this.vehicles.size + 1244,
      },
    });
  }

  async searchVehicles(query: VehicleSearchQuery) {
    requireDemoCapability("auto.read");
    await simulateNetworkDelay();
    const rows = Array.from(this.vehicles.values()).filter((row) =>
      matches(query, row),
    );
    rows.sort((a, b) =>
      query.sort === "price_asc"
        ? a.price.amountMinor - b.price.amountMinor
        : query.sort === "price_desc"
          ? b.price.amountMinor - a.price.amountMinor
          : query.sort === "year_desc"
            ? b.technical.modelYear - a.technical.modelYear
            : query.sort === "mileage_asc"
              ? a.technical.mileage - b.technical.mileage
              : b.sortDate.localeCompare(a.sortDate),
    );
    const offset = Number(query.cursor || 0);
    const limit = Math.min(50, query.limit || 20);
    return {
      items: rows
        .slice(offset, offset + limit)
        .map(toPublicVehicle)
        .map(clone),
      total: rows.length,
      pageInfo: {
        hasNextPage: offset + limit < rows.length,
        nextCursor:
          offset + limit < rows.length ? String(offset + limit) : undefined,
      },
    };
  }

  async getVehicle(idOrSlug: string) {
    requireDemoCapability("auto.read");
    await simulateNetworkDelay();
    const row =
      this.vehicles.get(idOrSlug) ||
      Array.from(this.vehicles.values()).find(
        (vehicle) => vehicle.slug === idOrSlug,
      );
    if (!row) throw new Error("Véhicule introuvable");
    return clone(toPublicVehicle(row));
  }

  async getOrCreateDraft(ownerUserId: string, marketCode: string) {
    requireDemoCapability("auto.vehicle.manage.own");
    await simulateNetworkDelay();
    const activeId = storageService.get(
      activeAutoDraftKey(ownerUserId),
      `demo-auto-draft-${ownerUserId}`,
    );
    const existing = await this.getDraft(activeId);
    const draft = {
      ...existing,
      id: activeId,
      ownerUserId,
      marketCode,
    } as VehicleDraft;
    storageService.set(activeAutoDraftKey(ownerUserId), activeId);
    return this.saveDraft(draft);
  }

  async getDraft(draftId: string) {
    requireDemoCapability("auto.vehicle.manage.own");
    await simulateNetworkDelay();
    const existing =
      this.drafts.get(draftId) ||
      storageService.get<VehicleDraft | null>(autoDraftKey(draftId), null);
    if (existing) return clone(existing);
    const seeded: VehicleDraft = {
      id: draftId,
      ownerUserId: "demo_auto_seller",
      schemaVersion: AUTO_SCHEMA_VERSION,
      marketCode: "FR",
      currentStep: AUTO_CONSTRAINTS.publication.firstStep,
      completedSteps: [],
      data: clone(AUTO_DEMO_DRAFT_DATA),
      duplicateCheck: "not_checked",
      updatedAt: AUTO_DEMO_NOW,
    };
    this.drafts.set(draftId, seeded);
    storageService.set(autoDraftKey(draftId), seeded);
    return clone(seeded);
  }

  async saveDraft(draft: VehicleDraft) {
    requireDemoCapability("auto.vehicle.manage.own");
    await simulateNetworkDelay();
    const next = clone({ ...draft, updatedAt: AUTO_DEMO_NOW });
    this.drafts.set(next.id, next);
    storageService.set(autoDraftKey(next.id), next);
    storageService.set(activeAutoDraftKey(next.ownerUserId), next.id);
    return clone(next);
  }

  async checkDuplicateIdentity(
    draftId: string,
    vin?: string,
    registration?: string,
  ) {
    requireDemoCapability("auto.vehicle.manage.own");
    await simulateNetworkDelay();
    const duplicate =
      vin?.replaceAll(/\s/g, "").toUpperCase() === "VF3DUPLICATE00001" ||
      registration?.replaceAll(/\s|-/g, "").toUpperCase() === "AA123AA";
    const current = this.drafts.get(draftId);
    const status = duplicate ? ("possible_match" as const) : ("clear" as const);
    if (current) {
      const next = {
        ...current,
        duplicateCheck: status,
        updatedAt: AUTO_DEMO_NOW,
      };
      this.drafts.set(draftId, next);
      storageService.set(autoDraftKey(draftId), next);
    }
    return { status };
  }

  async submitDraft(draftId: string) {
    requireDemoCapability("auto.vehicle.manage.own");
    await simulateNetworkDelay();
    const draft = this.drafts.get(draftId);
    if (
      !draft ||
      draft.completedSteps.length <
        AUTO_CONSTRAINTS.publication.requiredCompletedSteps
    )
      throw new Error("Complétez les étapes obligatoires.");
    if (!["clear", "possible_match"].includes(draft.duplicateCheck))
      throw new Error("Terminez le contrôle anti-doublon.");
    const result = {
      vehicleId: `vehicle_pending_${this.sequence++}`,
      lifecycle: "pending_review" as const,
    };
    this.drafts.delete(draftId);
    storageService.remove(autoDraftKey(draftId));
    storageService.remove(activeAutoDraftKey(draft.ownerUserId));
    return result;
  }

  async uploadDraftMedia(
    _draftId: string,
    file: { name: string; type: string; size: number },
  ) {
    requireDemoCapability("auto.vehicle.manage.own");
    await simulateNetworkDelay();
    if (!file.type.startsWith("image/"))
      throw new Error("Seules les images sont acceptées dans cette étape.");
    if (file.size > 20 * 1024 * 1024)
      throw new Error("Cette image dépasse la limite de 20 Mo.");
    return {
      url: AUTO_DEMO_MEDIA_URLS[this.sequence++ % AUTO_DEMO_MEDIA_URLS.length],
    };
  }

  async submitLead(input: AutoLeadDraft): Promise<AutoLead> {
    requireDemoCapability("auto.read");
    await simulateNetworkDelay();
    const suspicious = /(telegram|western union|crypto|gift card)/i.test(
      input.message,
    );
    const normalizedEmail = input.contactEmail.trim().toLowerCase();
    const duplicate = Array.from(this.leads.values()).some(
      (lead) =>
        lead.vehicleId === input.vehicleId &&
        lead.contactEmail.trim().toLowerCase() === normalizedEmail,
    );
    const lead: AutoLead = {
      ...input,
      id: `lead_auto_demo_${this.sequence++}`,
      dealerOrganizationId: "dealer_auto_select_lyon",
      contactEmail: normalizedEmail,
      status: suspicious ? "spam" : "new",
      spamAssessment: suspicious ? "blocked" : duplicate ? "review" : "clear",
      contactConsentAt: AUTO_DEMO_NOW,
      createdAt: AUTO_DEMO_NOW,
      updatedAt: AUTO_DEMO_NOW,
    };
    this.leads.set(lead.id, clone(lead));
    return clone(lead);
  }

  async getDealerWorkspace(organizationId: string) {
    requireDemoCapability("auto.dealer.manage.own");
    await simulateNetworkDelay();
    if (organizationId !== AUTO_DEMO_WORKSPACE.organization.id)
      throw new Error("Espace concession introuvable");
    return clone({
      ...AUTO_DEMO_WORKSPACE,
      vehicles: Array.from(this.vehicles.values()),
      leads: Array.from(this.leads.values()),
    });
  }

  async updateLead(
    _organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<AutoLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    requireDemoCapability("auto.lead.manage.own");
    await simulateNetworkDelay();
    const current = this.leads.get(leadId);
    if (!current) throw new Error("Demande Auto introuvable");
    const next = { ...current, ...patch, updatedAt: AUTO_DEMO_NOW };
    this.leads.set(leadId, next);
    return clone(next);
  }

  async requestInventoryImport(
    organizationId: string,
    type: InventoryImport["type"],
    fileName?: string,
    _idempotencyKey?: string,
  ) {
    requireDemoCapability("auto.inventory.import.own");
    await simulateNetworkDelay();
    const catalog = await this.getCatalog("FR");
    const plan = catalog.plans.find(
      (row) => row.id === AUTO_DEMO_WORKSPACE.organization.planId,
    )!;
    const allowed =
      type === "csv"
        ? plan.entitlements.inventoryCsvImport
        : type === "xml"
          ? plan.entitlements.inventoryXmlImport
          : plan.entitlements.inventoryApiSync &&
            catalog.config.featureFlags.dealerApiSyncEnabled;
    if (!allowed)
      throw new Error(
        "Ce format d’import n’est pas activé pour cette formule.",
      );
    return clone({
      id: `import_auto_${this.sequence++}`,
      dealerOrganizationId: organizationId,
      type,
      fileName,
      status: "queued" as const,
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      reportAvailable: false,
      requestedAt: AUTO_DEMO_NOW,
    });
  }

  async getFavoriteVehicleIds(accountId: string) {
    requireDemoCapability("favorite.manage.own");
    await simulateNetworkDelay();
    return Array.from(this.favorites.get(accountId) || []);
  }

  async toggleFavoriteVehicle(accountId: string, vehicleId: string) {
    requireDemoCapability("favorite.manage.own");
    await simulateNetworkDelay();
    const bucket = this.favorites.get(accountId) || new Set<string>();
    const next = !bucket.has(vehicleId);
    if (next) bucket.add(vehicleId);
    else bucket.delete(vehicleId);
    this.favorites.set(accountId, bucket);
    return next;
  }

  async updateMarketConfig(
    marketCode: string,
    patch: Partial<AutoMarketConfig>,
  ) {
    requireDemoCapability("auto.admin.manage");
    await simulateNetworkDelay();
    if (
      patch.featureFlags?.paidOffersEnabled ||
      patch.featureFlags?.secureSaleEnabled
    )
      throw new Error(
        "Les offres payantes nécessitent une configuration serveur validée.",
      );
    this.catalog.config = {
      ...this.catalog.config,
      ...patch,
      marketCode: marketCode.toUpperCase(),
      updatedAt: AUTO_DEMO_NOW,
    };
    return clone(this.catalog.config);
  }

  async updatePlan(
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
    requireDemoCapability("auto.admin.manage");
    await simulateNetworkDelay();
    const index = this.catalog.plans.findIndex(
      (row) => row.id === planId && row.marketCode === marketCode,
    );
    if (index < 0) throw new Error("Formule Auto introuvable");
    this.catalog.plans[index] = { ...this.catalog.plans[index], ...patch };
    return clone(this.catalog.plans[index]);
  }

  async updateAddOn(
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
    requireDemoCapability("auto.admin.manage");
    await simulateNetworkDelay();
    const index = this.catalog.addOns.findIndex(
      (row) => row.id === addOnId && row.marketCode === marketCode,
    );
    if (index < 0) throw new Error("Option Auto introuvable");
    if (patch.isActive && this.catalog.addOns[index].type.endsWith("_referral"))
      throw new Error(
        "Cette option partenaire nécessite une intégration et une validation légale.",
      );
    this.catalog.addOns[index] = { ...this.catalog.addOns[index], ...patch };
    return clone(this.catalog.addOns[index]);
  }

  async updateVehicleType(
    _marketCode: string,
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
    requireDemoCapability("auto.admin.manage");
    await simulateNetworkDelay();
    const index = this.catalog.vehicleTypes.findIndex(
      (row) => row.type === type,
    );
    if (index < 0) throw new Error("Type de véhicule introuvable");
    if (
      type === "boat" &&
      patch.isActive &&
      !this.catalog.config.featureFlags.boatListingsEnabled
    )
      throw new Error("Activez d’abord le drapeau marché Bateaux.");
    this.catalog.vehicleTypes[index] = {
      ...this.catalog.vehicleTypes[index],
      ...patch,
    };
    return clone(this.catalog.vehicleTypes[index]);
  }
}

export const demoAutoService = new DemoAutoService();
