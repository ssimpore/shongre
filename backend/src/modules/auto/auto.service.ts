import { createHash, randomUUID } from "node:crypto";
import type {
  AutoAddOn,
  AutoLead,
  AutoMarketConfig,
  AutoPlan,
  InventoryImport,
  PartnerReferral,
  VehicleDraft,
  VehiclePrivate,
  VehicleTypeConfig,
} from "@shongre/contracts/auto";
import { applyMonetizationToAutoCatalog } from "@shongre/contracts/vertical-monetization-adapters";
import {
  autoAddOnSchema,
  autoLeadSchema,
  autoMarketConfigSchema,
  autoPlanSchema,
  vehicleDraftSchema,
  vehiclePrivateSchema,
  vehicleSearchQuerySchema,
  vehicleTypeConfigSchema,
} from "@shongre/contracts/auto";
import {
  IAutoRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../infrastructure/logging/logger.js";
import {
  businessRulesService,
  BusinessRulesService,
} from "../business-rules/business-rules.service.js";

export class AutoService {
  constructor(
    private readonly repo: IAutoRepository = repositories.auto,
    private readonly commercialRules: BusinessRulesService = businessRulesService,
  ) {}

  private async resolveCatalog(marketCode = "FR", includeInactive = false) {
    const normalized = marketCode.toUpperCase();
    const [catalog, commercial] = await Promise.all([
      this.repo.getCatalog(normalized, includeInactive),
      this.commercialRules.getCatalog(normalized),
    ]);
    return applyMonetizationToAutoCatalog(catalog, commercial);
  }

  getCatalog(marketCode = "FR", includeInactive = false) {
    return this.resolveCatalog(marketCode, includeInactive);
  }

  async search(input: unknown) {
    const query = vehicleSearchQuerySchema.parse(input);
    const catalog = await this.resolveCatalog(query.marketCode);
    if (
      !catalog.config.isEnabled ||
      !catalog.config.featureFlags.verticalEnabled
    ) {
      return { items: [], total: 0, pageInfo: { hasNextPage: false } };
    }
    return this.repo.search(query);
  }

  async getPublicVehicle(idOrSlug: string) {
    const vehicle = await this.repo.getVehicle(idOrSlug);
    if (
      !vehicle ||
      vehicle.lifecycle !== "published" ||
      vehicle.moderationStatus !== "approved"
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Véhicule introuvable.",
      });
    }
    const {
      ownerUserId: _owner,
      dealerOrganizationId: _org,
      dealerLocationId: _location,
      stockReference: _stock,
      vinMasked: _vin,
      vinHash: _vinHash,
      registrationHash: _registration,
      moderationStatus: _moderation,
      moderationReason: _reason,
      planId: _plan,
      documents: _documents,
      riskSignals: _risk,
      createdAt: _created,
      ...publicVehicle
    } = vehicle;
    return publicVehicle;
  }

  async getOwnDraft(userId: string, draftId: string) {
    const draft = await this.repo.getDraft(draftId);
    if (!draft)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Brouillon Auto introuvable.",
      });
    if (draft.ownerUserId !== userId)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Ce brouillon appartient à un autre compte.",
      });
    return draft;
  }

  async saveOwnDraft(
    userId: string,
    draftId: string,
    input: unknown,
  ): Promise<VehicleDraft> {
    const existing = await this.repo.getDraft(draftId);
    if (existing && existing.ownerUserId !== userId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Ce brouillon appartient à un autre compte.",
      });
    }
    const current = new Date().toISOString();
    const body = (input || {}) as Partial<VehicleDraft>;
    const safeData = { ...(body.data || existing?.data || {}) };
    for (const sensitiveKey of [
      "vin",
      "vinNumber",
      "registrationNumber",
      "licensePlate",
      "identityDocumentUrl",
      "documentStoragePath",
    ])
      delete safeData[sensitiveKey];
    const draft = vehicleDraftSchema.parse({
      id: draftId,
      ownerUserId: userId,
      schemaVersion: 1,
      marketCode: body.marketCode || existing?.marketCode || "FR",
      currentStep: body.currentStep || existing?.currentStep || 1,
      completedSteps: body.completedSteps || existing?.completedSteps || [],
      data: safeData,
      duplicateCheck:
        body.duplicateCheck || existing?.duplicateCheck || "not_checked",
      updatedAt: current,
    });
    return this.repo.saveDraft(draft);
  }

  async checkDuplicateIdentity(
    userId: string,
    draftId: string,
    vin?: string,
    registration?: string,
  ) {
    const draft = await this.getOwnDraft(userId, draftId);
    if (!vin && !registration) return { status: "not_checked" as const };
    const vinHash = vin
      ? createHash("sha256").update(vin.trim().toUpperCase()).digest("hex")
      : undefined;
    const registrationHash = registration
      ? createHash("sha256")
          .update(registration.replaceAll(/\s|-/g, "").toUpperCase())
          .digest("hex")
      : undefined;
    const duplicate = await this.repo.hasDuplicateIdentity({
      vinHash: vinHash ? `sha256:${vinHash}` : undefined,
      registrationHash: registrationHash
        ? `sha256:${registrationHash}`
        : undefined,
    });
    await this.repo.saveDraftIdentity(draftId, {
      vinHash: vinHash ? `sha256:${vinHash}` : undefined,
      vinMasked: vin
        ? `${vin.trim().slice(0, 3).toUpperCase()}${"*".repeat(Math.max(0, vin.trim().length - 3))}`
        : undefined,
      registrationHash: registrationHash
        ? `sha256:${registrationHash}`
        : undefined,
    });
    await this.repo.saveDraft({
      ...draft,
      duplicateCheck: duplicate ? "possible_match" : "clear",
      updatedAt: new Date().toISOString(),
    });
    return {
      status: duplicate ? ("possible_match" as const) : ("clear" as const),
    };
  }

  async submitOwnDraft(userId: string, draftId: string) {
    const draft = await this.getOwnDraft(userId, draftId);
    if (draft.completedSteps.length < 10) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Complétez les étapes obligatoires avant l’envoi en validation.",
      });
    }
    if (!["clear", "possible_match"].includes(draft.duplicateCheck)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le contrôle anti-doublon doit être terminé.",
      });
    }
    const data = draft.data as Record<string, any>;
    const identity = await this.repo.getDraftIdentity(draftId);
    const now = new Date().toISOString();
    const vehicleId = randomUUID();
    const priceMinor = Number(data.priceMinor || 0);
    const makeLabel = String(data.makeLabel || "Véhicule");
    const modelLabel = String(data.modelLabel || "à identifier");
    const title = String(
      data.title || `${makeLabel} ${modelLabel} ${data.trimLabel || ""}`,
    ).trim();
    const catalog = await this.resolveCatalog(draft.marketCode);
    const plan = catalog.plans.find(
      (row) => row.id === (data.planId || "auto_private_free"),
    );
    if (!plan || plan.audience !== "individual")
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette formule n’est pas disponible pour un particulier.",
      });
    const mediaUrls = Array.isArray(data.mediaUrls) ? data.mediaUrls : [];
    if (mediaUrls.length > plan.entitlements.maxPhotosPerVehicle)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Le nombre de photos dépasse le quota de la formule.",
      });
    const activeCount = await this.repo.countActiveVehicles({
      ownerUserId: userId,
    });
    if (activeCount >= plan.entitlements.maxActiveVehicles)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Le quota de véhicules actifs de cette formule est atteint.",
      });
    const slugBase = title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const riskSignals = await this.repo.assessVehicleRisk({
      excludeVehicleId: vehicleId,
      vinHash: identity?.vinHash,
      registrationHash: identity?.registrationHash,
      description: String(data.description || ""),
      mediaUrls,
      mileage: Number(data.mileage || 0),
    });
    if (draft.duplicateCheck === "possible_match")
      riskSignals.push("duplicate_vin");
    const vehicle = vehiclePrivateSchema.parse({
      id: vehicleId,
      schemaVersion: 1,
      vertical: "automotive",
      slug: `${slugBase}-${vehicleId.slice(0, 8)}`,
      vehicleType: data.vehicleType || "car",
      lifecycle: "pending_review",
      marketCodes: [draft.marketCode],
      title,
      description: String(data.description || ""),
      makeId: data.makeId,
      makeLabel,
      modelId: data.modelId,
      modelLabel,
      generationLabel: data.generationLabel,
      trimLabel: data.trimLabel,
      technical: {
        bodyType: data.bodyType,
        modelYear: Number(data.modelYear),
        firstRegistrationDate: data.firstRegistrationDate,
        mileage: Number(data.mileage || 0),
        mileageUnit: data.mileageUnit || "km",
        fuelType: data.fuelType || "other",
        transmission: data.transmission || "other",
        powerKw: data.powerKw ? Number(data.powerKw) : undefined,
        powerHp: data.powerHp ? Number(data.powerHp) : undefined,
        fiscalPower: data.fiscalPower ? Number(data.fiscalPower) : undefined,
        batteryCapacityKwh: data.batteryCapacityKwh
          ? Number(data.batteryCapacityKwh)
          : undefined,
        electricRangeKm: data.electricRangeKm
          ? Number(data.electricRangeKm)
          : undefined,
        chargingPowerKw: data.chargingPowerKw
          ? Number(data.chargingPowerKw)
          : undefined,
        exteriorColor: data.exteriorColor,
        interiorColor: data.interiorColor,
        doors: data.doors ? Number(data.doors) : undefined,
        seats: data.seats ? Number(data.seats) : undefined,
        co2GramsPerKm: data.co2GramsPerKm
          ? Number(data.co2GramsPerKm)
          : undefined,
        critAirClass: data.critAirClass,
      },
      history: {
        condition: data.condition || "good",
        accidentStatus: data.accidentStatus || "unknown",
        previousOwnerCount: data.previousOwnerCount
          ? Number(data.previousOwnerCount)
          : undefined,
        maintenanceBookStatus: data.maintenanceBookStatus || "unknown",
        inspectionStatus: data.inspectionStatus || "unknown",
        inspectionValidUntil: data.inspectionValidUntil,
        warrantyMonths: data.warrantyMonths
          ? Number(data.warrantyMonths)
          : undefined,
        warrantyLabel: data.warrantyLabel,
      },
      price: { amountMinor: priceMinor, currency: "EUR" },
      priceIncludesTax: data.priceIncludesTax !== false,
      priceNegotiable: data.priceNegotiable === true,
      financingAvailable: data.financingAvailable === true,
      financingDisclaimer: catalog.config.financingDisclaimer,
      locationLabel: String(data.locationLabel || ""),
      seller: {
        id: userId,
        type: data.sellerType || "individual",
        displayName: String(data.sellerDisplayName || "Vendeur Shongre"),
        slug: `vendeur-${userId}`,
        locationLabel: String(data.locationLabel || ""),
        memberSinceYear: new Date().getUTCFullYear(),
        verifiedBusiness: false,
      },
      mediaUrls,
      equipment: Array.isArray(data.equipment) ? data.equipment : [],
      dynamicAttributes:
        typeof data.dynamicAttributes === "object" && data.dynamicAttributes
          ? data.dynamicAttributes
          : {},
      trust: {
        sellerIdentity: "pending",
        professionalBusiness:
          data.sellerType === "dealer" ? "pending" : "not_applicable",
        vinOnFile: Boolean(identity?.vinHash),
        documents: Array.isArray(data.documents) ? data.documents : [],
        historyReportStatus: data.historyReportStatus || "unavailable",
        publicBadges: [],
      },
      promotionLabels: [],
      isFavorite: false,
      publishedAt: now,
      sortDate: now,
      updatedAt: now,
      ownerUserId: userId,
      vinMasked: identity?.vinMasked,
      vinHash: identity?.vinHash,
      registrationHash: identity?.registrationHash,
      moderationStatus: "pending_review",
      planId: data.planId || "auto_private_free",
      documents: Array.isArray(data.documents) ? data.documents : [],
      riskSignals: Array.from(new Set(riskSignals)),
      createdAt: now,
    });
    await this.repo.saveVehicle(vehicle);
    return { vehicleId, lifecycle: "pending_review" as const };
  }

  async saveOwnVehicle(
    userId: string,
    input: unknown,
  ): Promise<VehiclePrivate> {
    const body = input as Partial<VehiclePrivate>;
    const current = body.id ? await this.repo.getVehicle(body.id) : null;
    const dealerOrganizationId =
      body.dealerOrganizationId || current?.dealerOrganizationId;
    if (current?.ownerUserId && current.ownerUserId !== userId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Ce véhicule appartient à un autre compte.",
      });
    }
    if (dealerOrganizationId) {
      const workspace = await this.getOwnDealerWorkspace(
        userId,
        dealerOrganizationId,
      );
      if (
        body.dealerLocationId &&
        !workspace.locations.some(
          (location) => location.id === body.dealerLocationId,
        )
      )
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Le site sélectionné n’appartient pas à cette concession.",
        });
    }
    const marketCode = body.marketCodes?.[0] || "FR";
    const catalog = await this.resolveCatalog(marketCode);
    const plan =
      catalog.plans.find((row) => row.id === body.planId) ||
      catalog.plans.find((row) => row.id === "auto_private_free");
    if (!plan)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Aucune formule Auto applicable.",
      });
    if (plan.audience !== (dealerOrganizationId ? "dealer" : "individual"))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La formule sélectionnée ne correspond pas au vendeur.",
      });
    if (
      body.mediaUrls &&
      body.mediaUrls.length > plan.entitlements.maxPhotosPerVehicle
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Le nombre de photos dépasse le quota de la formule.",
        details: {
          entitlement: "maxPhotosPerVehicle",
          limit: plan.entitlements.maxPhotosPerVehicle,
        },
      });
    }
    const now = new Date().toISOString();
    if (
      !current &&
      ["pending_review", "published", "reserved"].includes(
        body.lifecycle || "draft",
      )
    ) {
      const activeCount = await this.repo.countActiveVehicles(
        dealerOrganizationId
          ? { dealerOrganizationId }
          : { ownerUserId: userId },
      );
      if (activeCount >= plan.entitlements.maxActiveVehicles)
        throw new AppError({
          code: "FORBIDDEN",
          message: "Le quota de véhicules actifs de cette formule est atteint.",
        });
    }
    const parsed = vehiclePrivateSchema.parse({
      ...body,
      id: current?.id || body.id || randomUUID(),
      ownerUserId: dealerOrganizationId ? undefined : userId,
      dealerOrganizationId,
      schemaVersion: 1,
      vertical: "automotive",
      lifecycle:
        body.lifecycle === "published"
          ? "pending_review"
          : body.lifecycle || "draft",
      moderationStatus:
        body.lifecycle === "published"
          ? "pending_review"
          : body.moderationStatus || "draft",
      planId: plan.id,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    });
    return this.repo.saveVehicle(parsed);
  }

  async submitLead(
    requesterUserId: string | undefined,
    input: unknown,
  ): Promise<AutoLead> {
    const body = input as Partial<AutoLead>;
    const vehicle = body.vehicleId
      ? await this.repo.getVehicle(body.vehicleId)
      : null;
    if (!vehicle || vehicle.lifecycle !== "published")
      throw new AppError({
        code: "NOT_FOUND",
        message: "Véhicule introuvable.",
      });
    const config = (await this.resolveCatalog(vehicle.marketCodes[0])).config;
    if (!config.featureFlags.structuredLeadsEnabled)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Les demandes Auto ne sont pas activées sur ce marché.",
      });
    const now = new Date().toISOString();
    const normalizedMessage = String(body.message || "").trim();
    const suspicious = /(telegram|western union|crypto|gift card)/i.test(
      normalizedMessage,
    );
    const duplicate = await this.repo.hasRecentDuplicateLead(
      String(body.vehicleId),
      String(body.contactEmail || ""),
    );
    const lead = autoLeadSchema.parse({
      ...body,
      id: randomUUID(),
      requesterUserId,
      dealerOrganizationId: vehicle.dealerOrganizationId,
      contactEmail: String(body.contactEmail || "")
        .trim()
        .toLowerCase(),
      status: suspicious ? "spam" : "new",
      spamAssessment: suspicious ? "blocked" : duplicate ? "review" : "clear",
      marketingConsent: body.marketingConsent === true,
      contactConsentAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.createLead(lead);
  }

  async getOwnDealerWorkspace(userId: string, organizationId: string) {
    const workspace = await this.repo.getDealerWorkspace(organizationId);
    if (!workspace)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace concession introuvable.",
      });
    const membership = workspace.members.find(
      (row) => row.userId === userId && row.status === "active",
    );
    if (!membership)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Vous n’appartenez pas à cette concession.",
      });
    return workspace;
  }

  async updateOwnLead(
    userId: string,
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<AutoLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    const workspace = await this.getOwnDealerWorkspace(userId, organizationId);
    const lead = workspace.leads.find((row) => row.id === leadId);
    if (!lead)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande Auto introuvable.",
      });
    if (
      patch.assignedUserId &&
      !workspace.members.some(
        (row) => row.userId === patch.assignedUserId && row.status === "active",
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La demande ne peut être affectée qu’à un membre actif.",
      });
    }
    return this.repo.saveLead(
      autoLeadSchema.parse({
        ...lead,
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  async requestInventoryImport(
    userId: string,
    organizationId: string,
    type: InventoryImport["type"],
    fileName?: string,
    clientIdempotencyKey?: string,
  ): Promise<InventoryImport> {
    const workspace = await this.getOwnDealerWorkspace(userId, organizationId);
    const catalog = await this.resolveCatalog(
      workspace.locations[0]?.marketCode || "FR",
    );
    const plan = catalog.plans.find(
      (row) => row.id === workspace.organization.planId,
    );
    const allowed =
      type === "csv"
        ? plan?.entitlements.inventoryCsvImport
        : type === "xml"
          ? plan?.entitlements.inventoryXmlImport
          : plan?.entitlements.inventoryApiSync &&
            catalog.config.featureFlags.dealerApiSyncEnabled;
    if (!allowed)
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Ce format d’import n’est pas inclus ou n’est pas activé sur ce marché.",
      });
    if (!clientIdempotencyKey || clientIdempotencyKey.length < 12)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence d’import valide est requise.",
      });
    // Files are scanned and parsed by the asynchronous import worker. This API
    // only creates a durable job; it never interprets uploaded rows inline.
    const job: InventoryImport = {
      id: randomUUID(),
      dealerOrganizationId: organizationId,
      type,
      fileName,
      status: "queued",
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      reportAvailable: false,
      requestedAt: new Date().toISOString(),
    };
    const idempotencyKey = `auto-import:${createHash("sha256")
      .update(`${userId}:${organizationId}:${clientIdempotencyKey}`)
      .digest("hex")}`;
    return this.repo.createInventoryImport(
      job,
      userId,
      workspace.locations[0]?.marketCode || "FR",
      idempotencyKey,
    );
  }

  async createPartnerReferral(
    _userId: string | undefined,
    marketCode: string,
    input: Omit<PartnerReferral, "id" | "status" | "createdAt" | "updatedAt">,
  ): Promise<PartnerReferral> {
    const config = (await this.resolveCatalog(marketCode)).config;
    const enabled =
      input.type === "financing"
        ? config.featureFlags.financingReferralsEnabled
        : input.type === "insurance"
          ? config.featureFlags.insuranceReferralsEnabled
          : input.type === "inspection"
            ? config.featureFlags.inspectionReferralsEnabled
            : input.type === "warranty"
              ? config.featureFlags.warrantyReferralsEnabled
              : input.type === "delivery"
                ? config.featureFlags.deliveryReferralsEnabled
                : config.featureFlags.tradeInReferralsEnabled;
    if (!enabled)
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Ce parcours partenaire n’est pas activé. Aucun accord partenaire n’est présenté comme disponible.",
      });
    throw new AppError({
      code: "FORBIDDEN",
      message:
        "Le routage partenaire et la base légale doivent être configurés avant tout envoi.",
    });
  }

  async handleProviderWebhook(
    provider: "stripe",
    body: any,
    rawBody: string,
  ): Promise<{
    handled: boolean;
    duplicate: boolean;
    purchaseUpdated: boolean;
  }> {
    const providerEventId = String(body?.id || "");
    const eventType = String(body?.type || "");
    if (!providerEventId || !eventType)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Événement de paiement incomplet.",
      });
    const object = body?.data?.object || {};
    const metadata = object.metadata || {};
    if (metadata.vertical !== "automotive")
      return { handled: false, duplicate: false, purchaseUpdated: false };
    const inserted = await this.repo.beginProviderEvent({
      provider,
      providerEventId,
      eventType,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    });
    if (!inserted)
      return { handled: true, duplicate: true, purchaseUpdated: false };

    const statuses: Record<
      string,
      "requires_action" | "paid" | "failed" | "cancelled" | "refunded"
    > = {
      "checkout.session.completed": "paid",
      "checkout.session.async_payment_failed": "failed",
      "checkout.session.expired": "cancelled",
      "payment_intent.requires_action": "requires_action",
      "charge.refunded": "refunded",
    };
    try {
      const status = statuses[eventType];
      const purchaseId = String(metadata.autoPurchaseId || "");
      if (status && purchaseId)
        await this.repo.updateAddOnPurchaseFromProvider(
          purchaseId,
          status,
          String(object.payment_intent || object.id || "") || undefined,
        );
      await this.repo.completeProviderEvent(providerEventId);
      return {
        handled: true,
        duplicate: false,
        purchaseUpdated: Boolean(status && purchaseId),
      };
    } catch (error) {
      await this.repo.completeProviderEvent(
        providerEventId,
        error instanceof Error ? error.message : "provider_event_failed",
      );
      throw error;
    }
  }

  getAdminOverview(marketCode = "FR") {
    return this.repo.getAdminOverview(marketCode.toUpperCase());
  }

  async updateMarketConfig(
    marketCode: string,
    input: unknown,
  ): Promise<AutoMarketConfig> {
    const current = (await this.resolveCatalog(marketCode, true)).config;
    const next = autoMarketConfigSchema.parse({
      ...current,
      ...(input as object),
      marketCode: marketCode.toUpperCase(),
      updatedAt: new Date().toISOString(),
    });
    if (
      next.featureFlags.paidOffersEnabled ||
      next.featureFlags.secureSaleEnabled
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Les offres payantes et Vente Sérénité restent désactivées jusqu’à la configuration serveur des prix, webhooks et remboursements.",
      });
    }
    logger.info(`Auto market configuration updated for ${next.marketCode}`);
    return this.repo.saveMarketConfig(next);
  }

  async updatePlan(
    marketCode: string,
    planId: string,
    input: Partial<
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
    const catalog = await this.resolveCatalog(marketCode, true);
    const current = catalog.plans.find((row) => row.id === planId);
    if (!current)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Formule Auto introuvable.",
      });
    return this.repo.savePlan(
      autoPlanSchema.parse({
        ...current,
        ...input,
        marketCode: marketCode.toUpperCase(),
      }),
    );
  }

  async updateAddOn(
    marketCode: string,
    addOnId: string,
    input: Partial<
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
    const catalog = await this.resolveCatalog(marketCode, true);
    const current = catalog.addOns.find((row) => row.id === addOnId);
    if (!current)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Option Auto introuvable.",
      });
    const partnerTypes: AutoAddOn["type"][] = [
      "inspection_referral",
      "warranty_referral",
      "financing_referral",
      "insurance_referral",
      "delivery_referral",
      "trade_in_referral",
    ];
    if (input.isActive && partnerTypes.includes(current.type))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Cette option partenaire reste désactivée jusqu’à la validation du fournisseur, du consentement et des opérations.",
      });
    return this.repo.saveAddOn(
      autoAddOnSchema.parse({
        ...current,
        ...input,
        marketCode: marketCode.toUpperCase(),
      }),
    );
  }

  async updateVehicleType(
    marketCode: string,
    type: string,
    input: Partial<
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
    const catalog = await this.resolveCatalog(marketCode, true);
    const current = catalog.vehicleTypes.find((row) => row.type === type);
    if (!current)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Type de véhicule introuvable.",
      });
    if (
      type === "boat" &&
      input.isActive &&
      !catalog.config.featureFlags.boatListingsEnabled
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le drapeau marché Bateaux doit être activé avant ce type.",
      });
    return this.repo.saveVehicleType(
      vehicleTypeConfigSchema.parse({ ...current, ...input }),
      marketCode,
    );
  }
}

export const autoService = new AutoService();
