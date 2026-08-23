import { Listing, SearchFilters } from "../../shared/types/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  IListingRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { IAIProvider, providers } from "../../integrations/providers/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { randomUUID } from "node:crypto";
import {
  taxonomyValidationService,
  TaxonomyValidationService,
} from "../taxonomy/taxonomy.validation.js";
import { taxonomyService } from "../taxonomy/taxonomy.service.js";
import {
  publisherEntitlementsService,
  PublisherEntitlementsService,
} from "../publishers/publisher-entitlements.service.js";
import {
  unifiedDiscoveryService,
  UnifiedDiscoveryService,
} from "../discovery/discovery.service.js";

export interface PublicationDraftInput {
  title?: string;
  description?: string;
  price?: number;
  priceModel?:
    | "fixed"
    | "negotiable"
    | "free"
    | "on_request"
    | "hourly"
    | "daily"
    | "monthly"
    | "rent_plus_charges";
  categoryId?: string;
  marketCode?: string;
  city?: string;
  postalCode?: string;
  images?: string[];
  attributes?: Record<string, any>;
  allowedDelivery?: string[];
  shippingCost?: number;
  condition?: string;
  brand?: string;
  model?: string;
  organizationId?: string;
  branchId?: string;
  externalStockId?: string;
}

export class ListingsService {
  constructor(
    private listingRepo: IListingRepository = repositories.listings,
    private ai: IAIProvider = providers.ai,
    private taxonomyValidation: TaxonomyValidationService = taxonomyValidationService,
    private publisherEntitlements: PublisherEntitlementsService = publisherEntitlementsService,
    private discovery: UnifiedDiscoveryService = unifiedDiscoveryService,
  ) {}

  async getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: Listing[]; total: number }> {
    const res = await this.discovery.search(filter || {});
    return { listings: res.items, total: res.total };
  }

  async getListingById(id: string): Promise<Listing | null> {
    return this.listingRepo.findById(id);
  }

  async searchListings(params: SearchFilters) {
    return this.discovery.search(params);
  }

  async createListingDraft(userId?: string): Promise<any> {
    return this.listingRepo.createDraft(userId);
  }

  async saveListingDraft(draft: any, userId?: string): Promise<void> {
    await this.listingRepo.saveDraft(draft, userId);
  }

  async publishListing(
    draft: PublicationDraftInput,
    sellerId: string,
  ): Promise<Listing> {
    if (!draft.title || !draft.categoryId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Titre et catégorie obligatoires pour publier une annonce.",
      });
    }

    const taxonomyNode = await taxonomyService.getNodeById(draft.categoryId);
    const acceptsUndisclosedAmount =
      taxonomyNode?.listingFamily === "job" ||
      draft.priceModel === "on_request";
    if (draft.price === undefined && !acceptsUndisclosedAmount) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un prix ou un tarif est obligatoire pour cette catégorie.",
      });
    }
    const effectivePrice = draft.price ?? 0;

    if (
      !Number.isFinite(Number(effectivePrice)) ||
      Number(effectivePrice) < 0
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le prix doit être un montant positif ou nul.",
      });
    }

    const taxonomyValidation =
      await this.taxonomyValidation.validateListingAttributes(
        draft.categoryId,
        {
          ...(draft.attributes || {}),
          // `condition` was historically a top-level publication field. Feed it
          // into the canonical validator without forcing legacy adapters to
          // duplicate it inside their JSON attributes payload.
          ...(draft.condition ? { condition: draft.condition } : {}),
        },
      );
    if (!taxonomyValidation.isValid) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          taxonomyValidation.issues[0]?.message ||
          "Les caractéristiques de l’annonce sont invalides.",
        details: { issues: taxonomyValidation.issues },
      });
    }

    const marketCode = (draft.marketCode || "FR").toUpperCase();
    const publicationPolicy =
      await this.publisherEntitlements.authorizePublication({
        actorUserId: sellerId,
        organizationId: draft.organizationId,
        branchId: draft.branchId,
        marketCode,
        categoryId: draft.categoryId,
      });

    const publisherFilter = publicationPolicy.publisher.organizationId
      ? { publisherOrganizationId: publicationPolicy.publisher.organizationId }
      : { sellerId: publicationPolicy.publisher.userId };
    const existingInventory = await this.listingRepo.search({
      ...publisherFilter,
      marketCode,
      categoryId: draft.categoryId,
      limit: 500,
    });
    const normalize = (value: string | undefined) =>
      (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("fr-FR")
        .replace(/\s+/g, " ")
        .trim();
    const imageFingerprint = [...(draft.images || [])].sort().join("|");
    const exactDuplicate = existingInventory.items.find((candidate) => {
      const sameExternalStock =
        Boolean(draft.externalStockId) &&
        candidate.externalStockId === draft.externalStockId;
      const sameContentAndMedia =
        Boolean(imageFingerprint) &&
        [...candidate.images].sort().join("|") === imageFingerprint &&
        normalize(candidate.title) === normalize(draft.title) &&
        normalize(candidate.description) === normalize(draft.description) &&
        candidate.price === Number(effectivePrice) &&
        normalize(candidate.city) === normalize(draft.city || "Paris");
      return sameExternalStock || sameContentAndMedia;
    });
    if (exactDuplicate) {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette annonce existe déjà dans cet inventaire.",
        details: {
          reasonCode: "EXACT_DUPLICATE",
          canonicalListingId: exactDuplicate.id,
        },
      });
    }

    const safety = await this.ai.analyzeListingContent(
      draft.title,
      draft.description || "",
      effectivePrice,
    );

    const newId = randomUUID();

    const createdAt = new Date().toISOString();
    const listing: Listing = {
      id: newId,
      sellerId,
      publisherType: publicationPolicy.publisher.type,
      publisherUserId: publicationPolicy.publisher.userId,
      publisherOrganizationId: publicationPolicy.publisher.organizationId,
      publisherBranchId: publicationPolicy.publisher.branchId,
      publisherVerificationStatus:
        publicationPolicy.publisher.verificationStatus,
      publicationOfferId:
        publicationPolicy.publisher.type === "professional"
          ? "listing.standard.professional"
          : "listing.standard.individual",
      entitlementSnapshot: publicationPolicy.entitlementSnapshot,
      categoryId: draft.categoryId,
      title: draft.title,
      description: draft.description || "",
      price: Number(effectivePrice),
      currency: "EUR",
      status: safety.riskScore >= 50 ? "flagged" : "published",
      condition: draft.condition || "bon-etat",
      brand: draft.brand,
      model: draft.model,
      marketCode,
      city: draft.city || "Paris",
      postalCode: draft.postalCode || "75000",
      country: "FR",
      allowedDelivery: (draft.allowedDelivery as any) || ["hand_delivery"],
      shippingCost: draft.shippingCost || 0,
      images: draft.images || [],
      isUrgent: false,
      isFeatured: false,
      promotionState: "inactive",
      viewCount: 0,
      favoriteCount: 0,
      safetyRiskScore: safety.riskScore,
      attributes: draft.attributes || {},
      externalStockId: draft.externalStockId,
      createdAt,
      publishedAt: createdAt,
      organicFreshnessAt: createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(
        Date.now() +
          (publicationPolicy.durationDays || 60) * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };

    const saved = await this.listingRepo.save(listing);
    logger.info("Listing publication completed", { listingId: saved.id });
    return saved;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const existing = await this.listingRepo.findById(id);
    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: `Listing ${id} not found`,
      });
    }
    return this.listingRepo.update(id, updates);
  }

  async deleteListing(id: string): Promise<boolean> {
    const success = await this.listingRepo.delete(id);
    logger.info("Listing deleted", { listingId: id });
    return success;
  }

  // userId is required rather than defaulted. These previously fell back to
  // 'user_thomas', so any call that forgot to pass an identity silently read
  // and mutated one specific demo account's favourites.
  async toggleFavorite(listingId: string, userId: string): Promise<boolean> {
    return this.listingRepo.toggleFavorite(userId, listingId);
  }

  async getFavorites(userId: string): Promise<string[]> {
    return this.listingRepo.getFavorites(userId);
  }
}

export const listingsService = new ListingsService();
