import { createHash, randomUUID } from "node:crypto";
import type {
  AgencyWorkspace,
  PropertyDraft,
  PropertyImport,
  PropertyFieldRule,
  PropertyLead,
  PropertyLeadExport,
  PropertyLeadNote,
  PropertyPrivate,
  PropertyTypeConfig,
  RealEstateCatalog,
  RealEstateMarketConfig,
} from "@shongre/contracts/real-estate";
import { applyMonetizationToRealEstateCatalog } from "@shongre/contracts/vertical-monetization-adapters";
import {
  REAL_ESTATE_CONSTRAINTS,
  propertyDraftSchema,
  propertyLeadSchema,
  propertyLeadExportSchema,
  propertyLeadNoteSchema,
  propertyPrivateSchema,
  propertySearchQuerySchema,
} from "@shongre/contracts/real-estate";
import type { VerticalCheckout } from "@shongre/contracts/vertical";
import { verticalCheckoutSchema } from "@shongre/contracts/vertical";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-catalog";
import {
  IRealEstateRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { stripeCheckoutAdapter } from "../../infrastructure/payments/stripe-checkout-adapter.js";
import { AppError } from "../../shared/errors/app-error.js";
import { storageService } from "../../infrastructure/storage/storage-service.js";
import {
  businessRulesService,
  BusinessRulesService,
} from "../business-rules/business-rules.service.js";

const currentIso = () => new Date().toISOString();
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const IMMO_COMMERCIAL_PRODUCT_IDS: Record<string, string> = {
  immo_owner_free: "immo.owner.free",
  immo_owner_visibility: "immo.owner.visibility",
  immo_agency_starter: "immo.agency.starter",
  immo_agency_growth: "immo.agency.growth",
  immo_agency_network: "immo.agency.network",
};

function publicProperty(property: PropertyPrivate) {
  const {
    moderationStatus: _moderationStatus,
    moderationReason: _moderationReason,
    documents: _documents,
    createdByUserId: _createdByUserId,
    ownerUserId: _ownerUserId,
    organizationId: _organizationId,
    branchId: _branchId,
    planId: _planId,
    riskSignals: _riskSignals,
    createdAt: _createdAt,
    address,
    ...rest
  } = property;
  const { exactAddress: _exactAddress, ...publicAddress } = address;
  const stepByPrecision = {
    exact: 0.001,
    street: 0.001,
    district: 0.005,
    city: 0.02,
  } as const;
  const step = stepByPrecision[address.precision];
  return {
    ...rest,
    address: {
      ...publicAddress,
      latitude: Math.round(address.latitude / step) * step,
      longitude: Math.round(address.longitude / step) * step,
    },
    isFavorite: false,
  };
}

export class RealEstateService {
  constructor(
    private readonly repo: IRealEstateRepository = repositories.realEstate,
    private readonly commercialRules: BusinessRulesService = businessRulesService,
  ) {}

  private async resolveCatalog(marketCode = "FR", includeInactive = false) {
    const normalized = marketCode.toUpperCase();
    const [catalog, commercial] = await Promise.all([
      this.repo.getCatalog(normalized, includeInactive),
      this.commercialRules.getCatalog(normalized),
    ]);
    return applyMonetizationToRealEstateCatalog(catalog, commercial);
  }

  getCatalog(marketCode = "FR", includeInactive = false) {
    return this.resolveCatalog(marketCode, includeInactive);
  }

  async search(input: unknown) {
    const query = propertySearchQuerySchema.parse(input);
    const catalog = await this.resolveCatalog(query.marketCode);
    if (
      !catalog.activation.isActive ||
      !catalog.config.isEnabled ||
      !catalog.config.featureFlags.verticalEnabled
    ) {
      return { items: [], total: 0, pageInfo: { hasNextPage: false } };
    }
    const result = await this.repo.search(query);
    await this.repo.trackAnalyticsEvent({
      eventName: "search_performed",
      marketCode: query.marketCode,
      dimensions: {
        resultCount: result.total,
        hasFreeText: Boolean(query.query),
        propertyTypeCount: query.propertyTypes?.length || 0,
        transactionTypeCount: query.transactionTypes?.length || 0,
        usesMapBounds: Boolean(query.boundingBox),
      },
    });
    return result;
  }

  async getPublicProperty(idOrSlug: string) {
    const property = await this.repo.getProperty(idOrSlug);
    if (
      !property ||
      property.lifecycle !== "published" ||
      property.moderationStatus !== "approved"
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Bien immobilier introuvable.",
      });
    }
    await this.repo.trackAnalyticsEvent({
      eventName: "property_viewed",
      marketCode: property.marketCodes[0],
      propertyId: property.id,
      organizationId: property.organizationId,
    });
    return publicProperty(property);
  }

  async getComparableProperties(propertyId: string) {
    const property = await this.repo.getProperty(propertyId);
    if (!property)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Bien immobilier introuvable.",
      });
    const result = await this.repo.search({
      marketCode: property.marketCodes[0],
      propertyTypes: [property.propertyType],
      transactionTypes: [property.transactionType],
      minSurfaceSquareMeters:
        property.characteristics.livingAreaSquareMeters * 0.75,
      maxSurfaceSquareMeters:
        property.characteristics.livingAreaSquareMeters * 1.25,
      sort: "relevance",
      limit: 10,
    });
    return result.items
      .filter((candidate) => candidate.id !== propertyId)
      .slice(0, 3);
  }

  async getRecentlyViewed(userId: string) {
    return (await this.repo.getRecentlyViewed(userId))
      .filter(
        (property) =>
          property.lifecycle === "published" &&
          property.moderationStatus === "approved",
      )
      .map(publicProperty);
  }

  async markRecentlyViewed(userId: string, propertyId: string) {
    await this.getPublicProperty(propertyId);
    await this.repo.markRecentlyViewed(userId, propertyId);
    return { success: true };
  }

  async getOrCreateOwnDraft(userId: string, marketCode = "FR") {
    const normalizedMarket = marketCode.toUpperCase();
    const existing = await this.repo.getLatestDraft(userId, normalizedMarket);
    if (existing) return existing;
    return this.saveOwnDraft(userId, randomUUID(), {
      schemaVersion: 1,
      marketCode: normalizedMarket,
      currentStep: REAL_ESTATE_CONSTRAINTS.publication.firstStep,
      completedSteps: [],
      data: {},
      validationIssues: [],
    });
  }

  async getOwnPrivateDocumentAccess(
    userId: string,
    propertyId: string,
    documentId: string,
  ) {
    const property = await this.repo.getProperty(propertyId);
    if (!property)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Document introuvable.",
      });
    if (property.ownerUserId !== userId) {
      if (!property.organizationId)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Document introuvable.",
        });
      await this.loadOwnAgencyWorkspace(userId, property.organizationId);
    }
    const document = property.documents.find(
      (candidate) => candidate.id === documentId,
    );
    if (!document?.privateStorageKey)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Document introuvable.",
      });
    return storageService.createPrivateSignedUrl(
      document.privateStorageKey,
      300,
    );
  }

  async getOwnDraft(userId: string, draftId: string) {
    const draft = await this.repo.getDraft(draftId);
    if (!draft)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Brouillon immobilier introuvable.",
      });
    if (draft.ownerUserId !== userId) {
      if (!draft.organizationId)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Brouillon immobilier introuvable.",
        });
      await this.loadOwnAgencyWorkspace(userId, draft.organizationId);
    }
    return draft;
  }

  async saveOwnDraft(userId: string, draftId: string, input: unknown) {
    const existing = await this.repo.getDraft(draftId);
    const body = (input || {}) as Partial<PropertyDraft>;
    const organizationId = body.organizationId || existing?.organizationId;
    if (existing && existing.ownerUserId !== userId) {
      if (!existing.organizationId)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Brouillon immobilier introuvable.",
        });
      await this.loadOwnAgencyWorkspace(userId, existing.organizationId);
    }
    if (organizationId)
      await this.loadOwnAgencyWorkspace(userId, organizationId);
    const safeData = { ...(body.data || existing?.data || {}) };
    for (const key of [
      "riskScore",
      "riskSignals",
      "moderationStatus",
      "moderationReason",
      "signedDocumentUrl",
      "paymentSecret",
    ])
      delete safeData[key];
    const draft = propertyDraftSchema.parse({
      id: draftId,
      ownerUserId: existing?.ownerUserId || userId,
      organizationId,
      schemaVersion: body.schemaVersion || existing?.schemaVersion || 1,
      marketCode: body.marketCode || existing?.marketCode || "FR",
      currentStep: body.currentStep || existing?.currentStep || 1,
      completedSteps: body.completedSteps || existing?.completedSteps || [],
      data: safeData,
      validationIssues: body.validationIssues || [],
      updatedAt: currentIso(),
    });
    const catalog = await this.resolveCatalog(draft.marketCode);
    if (draft.schemaVersion !== catalog.activation.schemaVersion)
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le formulaire a évolué. Rechargez le brouillon pour continuer.",
      });
    const saved = await this.repo.saveDraft(draft);
    await this.repo.trackAnalyticsEvent({
      eventName: "publication_step_completed",
      marketCode: draft.marketCode,
      dimensions: {
        draftId: draft.id,
        currentStep: draft.currentStep,
        completedStepCount: draft.completedSteps.length,
      },
    });
    return saved;
  }

  private validatePublicationData(
    draft: PropertyDraft,
    catalog: RealEstateCatalog,
  ) {
    const data = draft.data as Record<string, unknown>;
    const issues: Array<{
      fieldId: string;
      message: string;
      severity: "error";
    }> = [];
    for (const fieldId of [
      "transactionType",
      "propertyType",
      "title",
      "description",
      "address",
      "characteristics",
      "financials",
      "energy",
      "regulatory",
      "media",
      "seller",
      "offerId",
    ]) {
      if (!data[fieldId])
        issues.push({
          fieldId,
          message: "Cette information est nécessaire pour publier.",
          severity: "error",
        });
    }
    const readPath = (path: string) =>
      path.split(".").reduce<unknown>((value, key) => {
        if (!value || typeof value !== "object") return undefined;
        return (value as Record<string, unknown>)[key];
      }, data);
    const missing = (value: unknown) =>
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    const propertyType = String(data.propertyType || "");
    const transactionType = String(data.transactionType || "");
    const sellerType = String(
      (data.seller as Record<string, unknown> | undefined)?.type || "",
    );
    for (const rule of catalog.fieldRules.filter(
      (candidate) =>
        candidate.isActive &&
        candidate.requirement === "required" &&
        (!candidate.propertyType || candidate.propertyType === propertyType) &&
        (!candidate.transactionType ||
          candidate.transactionType === transactionType),
    )) {
      const excludedPropertyTypes = Array.isArray(
        rule.condition.excludedPropertyTypes,
      )
        ? rule.condition.excludedPropertyTypes.map(String)
        : [];
      if (excludedPropertyTypes.includes(propertyType)) continue;
      const sellerTypes = Array.isArray(rule.condition.sellerTypes)
        ? rule.condition.sellerTypes.map(String)
        : [];
      if (sellerTypes.length && !sellerTypes.includes(sellerType)) continue;
      const whenPath =
        typeof rule.condition.whenPath === "string"
          ? rule.condition.whenPath
          : undefined;
      if (whenPath && readPath(whenPath) !== rule.condition.whenEquals)
        continue;
      const path =
        typeof rule.condition.path === "string"
          ? rule.condition.path
          : rule.fieldId;
      if (missing(readPath(path))) {
        const label =
          catalog.attributes.find((attribute) => attribute.id === rule.fieldId)
            ?.label || rule.fieldId;
        issues.push({
          fieldId: rule.fieldId,
          message: `${label} : cette information est requise pour ce marché.`,
          severity: "error",
        });
      }
    }
    return issues;
  }

  async submitOwnDraft(userId: string, draftId: string) {
    const draft = await this.getOwnDraft(userId, draftId);
    if (draft.completedSteps.length < 9)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Complétez les étapes obligatoires avant l’envoi.",
      });
    const catalog = await this.resolveCatalog(draft.marketCode);
    const issues = this.validatePublicationData(draft, catalog);
    if (issues.length) {
      await this.repo.saveDraft({
        ...draft,
        validationIssues: issues,
        updatedAt: currentIso(),
      });
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: issues[0].message,
        details: { issues },
      });
    }
    const data = draft.data as Record<string, any>;
    const privateDocumentKeys = Array.isArray(data.documents)
      ? data.documents
          .map((document: { privateStorageKey?: unknown }) =>
            typeof document.privateStorageKey === "string"
              ? document.privateStorageKey
              : "",
          )
          .filter(Boolean)
      : [];
    await storageService.assertOwnedPrivateDocumentKeys(
      userId,
      privateDocumentKeys,
    );
    const offer = catalog.offers.find(
      (candidate) => candidate.id === data.offerId && candidate.isActive,
    );
    if (!offer)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Sélectionnez une offre disponible.",
      });
    const maxActive = Number(offer.entitlements.maxActiveListings || 0);
    const active = await this.repo.countActiveProperties(
      draft.organizationId
        ? { organizationId: draft.organizationId }
        : { ownerUserId: userId },
    );
    if (active >= maxActive)
      throw new AppError({
        code: "CONFLICT",
        message: "Le quota de biens actifs de cette offre est atteint.",
      });
    const media = data.media || {};
    const mediaUrls = Array.isArray(media.photos) ? media.photos : [];
    const floorPlans = Array.isArray(media.floorPlans) ? media.floorPlans : [];
    const mediaCount = mediaUrls.length + floorPlans.length;
    const maxMedia = Number(offer.entitlements.maxMedia || 0);
    const videoCount = media.videoUrl ? 1 : 0;
    const maxVideos = Number(offer.entitlements.maxVideosPerListing || 0);
    const virtualTourCount = media.virtualTourUrl ? 1 : 0;
    const maxVirtualTours = Number(
      offer.entitlements.maxVirtualToursPerListing || 0,
    );
    if (mediaCount > maxMedia)
      throw new AppError({
        code: "FORBIDDEN",
        message: `Cette offre autorise ${maxMedia} photo(s) ou plan(s) par bien.`,
        details: {
          entitlement: "maxMedia",
          limit: maxMedia,
          requested: mediaCount,
        },
      });
    if (videoCount > maxVideos)
      throw new AppError({
        code: "FORBIDDEN",
        message: "La vidéo n’est pas incluse dans cette offre.",
        details: {
          entitlement: "maxVideosPerListing",
          limit: maxVideos,
          requested: videoCount,
        },
      });
    if (virtualTourCount > maxVirtualTours)
      throw new AppError({
        code: "FORBIDDEN",
        message: "La visite virtuelle n’est pas incluse dans cette offre.",
        details: {
          entitlement: "maxVirtualToursPerListing",
          limit: maxVirtualTours,
          requested: virtualTourCount,
        },
      });
    const riskSignals = await this.repo.assessRisk({
      title: data.title,
      description: data.description,
      priceMinor: data.financials.price.amountMinor,
      city: data.address.city,
      mediaUrls,
    });
    const now = currentIso();
    const property = propertyPrivateSchema.parse({
      id: randomUUID(),
      listingId: randomUUID(),
      slug: `${String(data.title)
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-|-$/g, "")}-${draftId.slice(0, 8)}`,
      schemaVersion: draft.schemaVersion,
      marketCodes: [draft.marketCode],
      propertyType: data.propertyType,
      transactionType: data.transactionType,
      lifecycle: "pending_review",
      title: data.title,
      description: data.description,
      financials: data.financials,
      characteristics: data.characteristics,
      energy: data.energy,
      regulatory: data.regulatory,
      address: data.address,
      media: data.media,
      seller: data.seller,
      promotion: { urgent: false, featured: false, sponsored: false },
      customAttributes: data.customAttributes || {},
      moderationStatus: "pending",
      documents: data.documents || [],
      createdByUserId: userId,
      ownerUserId: draft.organizationId ? undefined : userId,
      organizationId: draft.organizationId,
      branchId: draft.organizationId ? data.branchId : undefined,
      planId: offer.id,
      riskSignals,
      createdAt: now,
      sortDate: now,
    });
    const saved = await this.repo.saveProperty(property);
    await Promise.all([
      this.repo.trackAnalyticsEvent({
        eventName: "listing_created",
        marketCode: draft.marketCode,
        propertyId: saved.id,
        dimensions: {
          propertyType: saved.propertyType,
          transactionType: saved.transactionType,
        },
      }),
      this.repo.trackAnalyticsEvent({
        eventName: "publication_completed",
        marketCode: draft.marketCode,
        propertyId: saved.id,
        valueMinor: saved.financials.price.amountMinor,
        currency: saved.financials.price.currency,
        dimensions: { offerId: offer.id },
      }),
    ]);
    return { propertyId: saved.id, lifecycle: "pending_review" as const };
  }

  async submitLead(userId: string | undefined, input: unknown) {
    const body = (input || {}) as Partial<PropertyLead>;
    if (!body.consentGiven)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Votre accord est nécessaire pour transmettre la demande.",
      });
    const property = await this.repo.getProperty(String(body.propertyId || ""));
    if (!property || property.lifecycle !== "published")
      throw new AppError({
        code: "NOT_FOUND",
        message: "Bien immobilier introuvable.",
      });
    const duplicate = await this.repo.findDuplicateLead(
      property.id,
      String(body.requesterEmail || ""),
      body.type || "information",
    );
    if (duplicate) return duplicate;
    const now = currentIso();
    const lead = propertyLeadSchema.parse({
      id: randomUUID(),
      propertyId: property.id,
      organizationId: property.organizationId,
      requesterUserId: userId,
      type: body.type,
      status: "new",
      requesterName: body.requesterName,
      requesterEmail: body.requesterEmail,
      requesterPhone: body.requesterPhone,
      message: body.message,
      desiredMoveDate: body.desiredMoveDate,
      preferredContactChannel: body.preferredContactChannel,
      consentGiven: true,
      qualificationAnswers: body.qualificationAnswers || {},
      contactDetailsReleased: false,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.repo.saveLead(lead);
    await Promise.all([
      this.repo.trackAnalyticsEvent({
        eventName: "lead_created",
        marketCode: property.marketCodes[0],
        propertyId: property.id,
        organizationId: property.organizationId,
        dimensions: { leadType: saved.type },
      }),
      this.repo.trackAnalyticsEvent({
        eventName: "search_contacted",
        marketCode: property.marketCodes[0],
        propertyId: property.id,
        organizationId: property.organizationId,
      }),
    ]);
    return saved;
  }

  async requestAppointment(userId: string, leadId: string, startsAt: string) {
    const lead = await this.repo.getLead(leadId);
    if (!lead || lead.requesterUserId !== userId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    const start = new Date(startsAt);
    if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now())
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Choisissez une date de visite future.",
      });
    const appointment = await this.repo.saveAppointment({
      id: randomUUID(),
      propertyId: lead.propertyId,
      leadId: lead.id,
      organizationId: lead.organizationId,
      assignedUserId: lead.assignedUserId,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
      status: "requested",
    });
    const property = await this.repo.getProperty(lead.propertyId);
    await this.repo.trackAnalyticsEvent({
      eventName: "visit_requested",
      marketCode: property?.marketCodes[0] || "FR",
      propertyId: lead.propertyId,
      organizationId: lead.organizationId,
    });
    return appointment;
  }

  private assertAgencyMember(userId: string, workspace: AgencyWorkspace) {
    if (!workspace.members.some((member) => member.id === userId))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace agence introuvable.",
      });
  }

  private async loadOwnAgencyWorkspace(userId: string, organizationId: string) {
    const workspace = await this.repo.getAgencyWorkspace(organizationId);
    if (!workspace)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace agence introuvable.",
      });
    this.assertAgencyMember(userId, workspace);
    return workspace;
  }

  async getOwnAgencyWorkspace(userId: string, organizationId: string) {
    const workspace = await this.loadOwnAgencyWorkspace(userId, organizationId);
    await this.repo.trackAnalyticsEvent({
      eventName: "agency_workspace_opened",
      marketCode: workspace.properties[0]?.marketCodes[0] || "FR",
      organizationId,
    });
    return workspace;
  }

  async updateOwnLead(
    userId: string,
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<PropertyLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    const workspace = await this.loadOwnAgencyWorkspace(userId, organizationId);
    const lead = workspace.leads.find((candidate) => candidate.id === leadId);
    if (!lead)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    const firstResponse =
      lead.status === "new" &&
      patch.status !== undefined &&
      patch.status !== "new" &&
      !lead.firstRespondedAt;
    const updated = await this.repo.saveLead({
      ...lead,
      ...patch,
      firstRespondedAt: firstResponse ? currentIso() : lead.firstRespondedAt,
      updatedAt: currentIso(),
    });
    if (firstResponse) {
      const property = await this.repo.getProperty(lead.propertyId);
      await this.repo.trackAnalyticsEvent({
        eventName: "lead_responded",
        marketCode: property?.marketCodes[0] || "FR",
        propertyId: lead.propertyId,
        organizationId,
        dimensions: {
          responseMinutes: Math.max(
            0,
            Math.round(
              (new Date(updated.firstRespondedAt!).getTime() -
                new Date(lead.createdAt).getTime()) /
                60_000,
            ),
          ),
        },
      });
    }
    return updated;
  }

  async addOwnLeadNote(
    userId: string,
    organizationId: string,
    leadId: string,
    body: string,
  ): Promise<PropertyLeadNote> {
    const workspace = await this.loadOwnAgencyWorkspace(userId, organizationId);
    if (!workspace.leads.some((lead) => lead.id === leadId))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    return this.repo.saveLeadNote(
      propertyLeadNoteSchema.parse({
        id: randomUUID(),
        leadId,
        authorUserId: userId,
        body,
        createdAt: currentIso(),
      }),
    );
  }

  async exportOwnAgencyLeads(
    userId: string,
    organizationId: string,
  ): Promise<PropertyLeadExport> {
    const workspace = await this.loadOwnAgencyWorkspace(userId, organizationId);
    const csvCell = (value: string) => {
      const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["id", "statut", "type", "nom", "email", "téléphone", "créé le"],
      ...workspace.leads.map((lead) => [
        lead.id,
        lead.status,
        lead.type,
        lead.requesterName,
        lead.contactDetailsReleased ? lead.requesterEmail : "",
        lead.contactDetailsReleased ? lead.requesterPhone || "" : "",
        lead.createdAt,
      ]),
    ];
    return propertyLeadExportSchema.parse({
      fileName: `leads-${organizationId}-${new Date().toISOString().slice(0, 10)}.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: rows
        .map((row) => row.map((value) => csvCell(String(value))).join(","))
        .join("\n"),
    });
  }

  async requestImport(
    userId: string,
    organizationId: string,
    type: PropertyImport["type"],
    fileName?: string,
    idempotencyKey = randomUUID(),
  ) {
    const workspace = await this.loadOwnAgencyWorkspace(userId, organizationId);
    const catalog = await this.resolveCatalog("FR");
    const offer = catalog.offers.find(
      (candidate) => candidate.id === workspace.organization.planId,
    );
    const allowed =
      (type === "csv" && offer?.entitlements.csvImport === true) ||
      (type === "xml" && offer?.entitlements.xmlImport === true) ||
      (type === "api" && offer?.entitlements.apiAccess === true);
    if (!allowed)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Cette formule ne comprend pas ce mode d’import.",
      });
    const existing = await this.repo.getImportByIdempotency(
      organizationId,
      idempotencyKey,
    );
    if (existing) return existing;
    return this.repo.saveImport({
      id: randomUUID(),
      organizationId,
      type,
      status: "queued",
      fileName,
      importedCount: 0,
      rejectedCount: 0,
      idempotencyKey,
      createdAt: currentIso(),
    });
  }

  async createCheckout(userId: string, input: unknown) {
    const body = (input || {}) as {
      marketCode?: string;
      offerId?: string;
      addOnIds?: string[];
      idempotencyKey?: string;
    };
    if (!body.idempotencyKey || body.idempotencyKey.length < 8)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence est requise.",
      });
    const existing = await this.repo.getCheckoutByIdempotency(
      userId,
      body.idempotencyKey,
    );
    if (existing) return existing;
    const catalog = await this.resolveCatalog(body.marketCode || "FR");
    const offer = body.offerId
      ? catalog.offers.find(
          (candidate) => candidate.id === body.offerId && candidate.isActive,
        )
      : undefined;
    const addOns = catalog.addOns.filter(
      (candidate) =>
        body.addOnIds?.includes(candidate.id) && candidate.isActive,
    );
    if (body.offerId && !offer)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette offre n’est plus disponible.",
      });
    const price = offer?.prices.find((candidate) => candidate.isActive);
    const totalMinor =
      (price?.amount.amountMinor || 0) +
      addOns.reduce((total, addOn) => total + addOn.price.amountMinor, 0);
    if (totalMinor < 0)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Montant invalide.",
      });
    const now = currentIso();
    let providerCheckoutId: string | undefined;
    let providerCheckoutUrl: string | undefined;
    let status: VerticalCheckout["status"] =
      totalMinor === 0 ? "paid" : "created";
    let taxMinor = 0;
    let centralProvider: VerticalCheckout["provider"] = "demo";
    let providerPaymentId: string | undefined;
    let invoiceId: string | undefined;
    let checkoutId: string = randomUUID();
    if (totalMinor > 0) {
      const offerProductId = offer
        ? IMMO_COMMERCIAL_PRODUCT_IDS[offer.id]
        : undefined;
      const productIds = [
        offerProductId,
        ...addOns.map((addOn) => addOn.id),
      ].filter((id): id is string => Boolean(id));
      const priceIds =
        offerProductId && price ? { [offerProductId]: price.id } : undefined;
      const quote = await this.commercialRules.createQuote(userId, {
        productIds,
        priceIds,
        marketCode: catalog.config.marketCode,
        categoryId: CANONICAL_TAXONOMY_IDS.realEstate,
        idempotencyKey: `immo-quote:${body.idempotencyKey}`,
      });
      const order = await this.commercialRules.createCheckout(
        userId,
        quote.id,
        `immo-checkout:${body.idempotencyKey}`,
      );
      checkoutId = order.id;
      taxMinor = quote.taxMinor;
      providerCheckoutId = order.providerCheckoutId;
      providerCheckoutUrl = order.providerCheckoutUrl;
      providerPaymentId = order.providerPaymentId;
      invoiceId = order.invoiceId;
      centralProvider = order.provider === "stripe" ? "stripe" : "demo";
      status =
        order.status === "partially_refunded" ? "refunded" : order.status;
    }
    const checkout = verticalCheckoutSchema.parse({
      id: checkoutId,
      verticalType: "real_estate",
      marketCode: catalog.config.marketCode,
      accountId: userId,
      offerId: offer?.id,
      addOnIds: addOns.map((addOn) => addOn.id),
      total: { amountMinor: totalMinor, currency: catalog.config.currency },
      tax: { amountMinor: taxMinor, currency: catalog.config.currency },
      status,
      provider: centralProvider,
      providerCheckoutId,
      providerCheckoutUrl,
      providerPaymentId,
      invoiceId,
      idempotencyKey: body.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.repo.saveCheckout(checkout);
    if (offer) {
      await this.repo.trackAnalyticsEvent({
        eventName: "offer_selected",
        marketCode: saved.marketCode,
        valueMinor: saved.total.amountMinor,
        currency: saved.total.currency,
        dimensions: { offerId: offer.id, offerKind: offer.kind },
      });
    }
    if (saved.status === "paid") await this.trackPaidCheckout(saved);
    return saved;
  }

  private async trackPaidCheckout(checkout: VerticalCheckout) {
    const catalog = await this.resolveCatalog(checkout.marketCode, true);
    const offer = catalog.offers.find(
      (candidate) => candidate.id === checkout.offerId,
    );
    const events = [
      this.repo.trackAnalyticsEvent({
        eventName: "checkout_completed" as const,
        marketCode: checkout.marketCode,
        valueMinor: checkout.total.amountMinor,
        currency: checkout.total.currency,
        dimensions: {
          checkoutId: checkout.id,
          offerId: checkout.offerId,
          addOnCount: checkout.addOnIds.length,
        },
      }),
    ];
    if (offer && ["subscription", "custom"].includes(offer.kind))
      events.push(
        this.repo.trackAnalyticsEvent({
          eventName: "subscription_started",
          marketCode: checkout.marketCode,
          valueMinor: checkout.total.amountMinor,
          currency: checkout.total.currency,
          dimensions: { offerId: offer.id },
        }),
      );
    if (checkout.addOnIds.length)
      events.push(
        this.repo.trackAnalyticsEvent({
          eventName: "add_on_purchased",
          marketCode: checkout.marketCode,
          valueMinor: checkout.total.amountMinor,
          currency: checkout.total.currency,
          dimensions: { addOnIds: checkout.addOnIds },
        }),
      );
    await Promise.all(events);
  }

  async handleProviderWebhook(
    provider: "stripe",
    payload: Record<string, any>,
    rawPayload: string,
  ) {
    const eventId = String(payload.id || "");
    if (!eventId)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Événement de paiement sans identifiant.",
      });
    if (await this.repo.hasWebhookEvent(provider, eventId))
      return { duplicate: true };
    const eventType = String(payload.type || "unknown");
    await this.repo.saveWebhookEvent({
      provider,
      eventId,
      eventType,
      payloadHash: hash(rawPayload),
      status: "received",
    });
    const object = payload.data?.object || {};
    if (
      ![
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "charge.refunded",
      ].includes(eventType)
    ) {
      await this.repo.saveWebhookEvent({
        provider,
        eventId,
        eventType,
        payloadHash: hash(rawPayload),
        status: "ignored",
      });
      return { duplicate: false, processed: false };
    }
    if (object?.metadata?.vertical_type !== "real_estate") {
      await this.repo.saveWebhookEvent({
        provider,
        eventId,
        eventType,
        payloadHash: hash(rawPayload),
        status: "ignored",
      });
      return { duplicate: false, processed: false };
    }
    const accountId = String(object.metadata.account_id || "");
    const idempotencyKey = String(object.metadata.idempotency_key || "");
    const checkout = await this.repo.getCheckoutByIdempotency(
      accountId,
      idempotencyKey,
    );
    if (checkout) {
      const nextStatus: VerticalCheckout["status"] =
        eventType === "checkout.session.async_payment_failed"
          ? "failed"
          : eventType === "charge.refunded"
            ? "refunded"
            : "paid";
      const saved = await this.repo.saveCheckout({
        ...checkout,
        status: nextStatus,
        providerPaymentId: object.payment_intent || checkout.providerPaymentId,
        invoiceId: object.invoice || checkout.invoiceId,
        updatedAt: currentIso(),
      });
      if (saved.status === "paid") await this.trackPaidCheckout(saved);
    }
    await this.repo.saveWebhookEvent({
      provider,
      eventId,
      eventType,
      payloadHash: hash(rawPayload),
      status: "processed",
    });
    return { duplicate: false, processed: true };
  }

  async refundCheckout(
    checkoutId: string,
    input: { amountMinor?: number; idempotencyKey?: string },
  ) {
    const checkout = await this.repo.getCheckout(checkoutId);
    if (!checkout)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Paiement introuvable.",
      });
    if (checkout.status === "refunded") return checkout;
    if (checkout.status !== "paid")
      throw new AppError({
        code: "CONFLICT",
        message: "Ce paiement ne peut pas être remboursé.",
      });
    const amountMinor = input.amountMinor ?? checkout.total.amountMinor;
    if (!Number.isInteger(amountMinor) || amountMinor <= 0)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Montant de remboursement invalide.",
      });
    if (amountMinor !== checkout.total.amountMinor)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Montant invalide : seul le remboursement intégral est disponible pour cette offre.",
      });
    const idempotencyKey = input.idempotencyKey || `refund-${checkout.id}`;
    if (checkout.provider === "stripe") {
      if (!checkout.providerPaymentId)
        throw new AppError({
          code: "CONFLICT",
          message: "Référence de paiement indisponible.",
        });
      await stripeCheckoutAdapter.createRefund({
        paymentIntentId: checkout.providerPaymentId,
        amountMinor,
        idempotencyKey,
      });
    }
    return this.repo.saveCheckout({
      ...checkout,
      status: "refunded",
      updatedAt: currentIso(),
    });
  }

  getAdminOverview(marketCode = "FR") {
    return this.repo.getAdminOverview(marketCode.toUpperCase());
  }
  updateMarketConfig(
    marketCode: string,
    patch: Partial<RealEstateMarketConfig>,
  ) {
    return this.repo.updateMarketConfig(marketCode.toUpperCase(), patch);
  }
  updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<RealEstateCatalog["offers"][number]>,
  ) {
    return this.repo.updateOffer(marketCode.toUpperCase(), offerId, patch);
  }
  updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<RealEstateCatalog["addOns"][number]>,
  ) {
    return this.repo.updateAddOn(marketCode.toUpperCase(), addOnId, patch);
  }
  updatePropertyType(
    marketCode: string,
    type: string,
    patch: Partial<PropertyTypeConfig>,
  ) {
    return this.repo.updatePropertyType(marketCode.toUpperCase(), type, patch);
  }
  updateFieldRule(
    marketCode: string,
    ruleId: string,
    patch: Partial<PropertyFieldRule>,
  ) {
    return this.repo.updateFieldRule(marketCode.toUpperCase(), ruleId, patch);
  }
}

export const realEstateService = new RealEstateService();
