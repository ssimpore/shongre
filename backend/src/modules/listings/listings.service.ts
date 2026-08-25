import {
  DeliveryType,
  Listing,
  PublicListing,
  SearchFilters,
} from "../../shared/types/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { toPublicListing } from "../../shared/public-projections.js";
import {
  IListingRepository,
  IMarketRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { IAIProvider, providers } from "../../integrations/providers/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import {
  storageService,
  StorageService,
} from "../../infrastructure/storage/storage-service.js";
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

export interface SellerListingUpdate {
  title?: string;
  description?: string;
  price?: number;
  condition?: string;
  brand?: string;
  model?: string;
  city?: string;
  postalCode?: string;
  allowedDelivery?: DeliveryType[];
  shippingCost?: number;
  attributes?: Record<string, unknown>;
}

type BulkImportValidationCode =
  "TITLE_REQUIRED" | "TITLE_TOO_SHORT" | "PRICE_INVALID";
type BulkListingImportRow = {
  id: string;
  title: string;
  description: string;
  categorySlug: string;
  subCategorySlug: string;
  price: { amountMinor: number; currency: string };
  condition: string;
  stock: number;
  city: string;
  postalCode: string;
  isValid: boolean;
  validationErrorCode?: BulkImportValidationCode;
};

const BULK_IMPORT_TEMPLATE = `Titre;Categorie;SousCategorie;Prix;Etat;Stock;Ville;CodePostal;Description
Table basse chêne massif;home_garden;furniture;180;very_good;2;Lyon;69002;Description détaillée du produit`;

function splitCsvRow(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === ";" && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += character;
  }
  if (quoted)
    throw new AppError({
      code: "VALIDATION_ERROR",
      message:
        "Le fichier CSV contient une valeur entre guillemets incomplète.",
    });
  values.push(value.trim());
  return values;
}

const SELLER_UPDATE_KEYS = new Set<keyof SellerListingUpdate>([
  "title",
  "description",
  "price",
  "condition",
  "brand",
  "model",
  "city",
  "postalCode",
  "allowedDelivery",
  "shippingCost",
  "attributes",
]);

const DELIVERY_TYPES = new Set<DeliveryType>([
  "hand_delivery",
  "relay_point",
  "home_delivery",
  "cocolis",
  "express",
]);

export class ListingsService {
  constructor(
    private listingRepo: IListingRepository = repositories.listings,
    private ai: IAIProvider = providers.ai,
    private taxonomyValidation: TaxonomyValidationService = taxonomyValidationService,
    private publisherEntitlements: PublisherEntitlementsService = publisherEntitlementsService,
    private discovery: UnifiedDiscoveryService = unifiedDiscoveryService,
    private markets: IMarketRepository = repositories.markets,
    private storage: StorageService = storageService,
  ) {}

  async getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: PublicListing[]; total: number }> {
    const res = await this.discovery.search(filter || {});
    return { listings: res.items.map(toPublicListing), total: res.total };
  }

  async getInternalListingById(id: string): Promise<Listing | null> {
    return this.listingRepo.findById(id);
  }

  async getListingById(id: string): Promise<PublicListing | null> {
    const listing = await this.listingRepo.findPublicById(id);
    return listing ? toPublicListing(listing) : null;
  }

  async searchListings(params: SearchFilters) {
    const result = await this.discovery.search(params);
    return { ...result, items: result.items.map(toPublicListing) };
  }

  async createListingDraft(userId?: string): Promise<any> {
    return this.listingRepo.createDraft(userId);
  }

  async getListingDraft(userId: string): Promise<any | null> {
    return this.listingRepo.getDraft(userId);
  }

  async saveListingDraft(draft: any, userId?: string): Promise<void> {
    await this.listingRepo.saveDraft(draft, userId);
  }

  getBulkImportTemplate(locale = "fr-FR") {
    const language = locale.toLowerCase().startsWith("fr") ? "fr" : "fr";
    return {
      fileName: `modele_import_annonces_shongre_${language}.csv`,
      content: BULK_IMPORT_TEMPLATE,
    };
  }

  async parseBulkImportCsv(input: unknown): Promise<BulkListingImportRow[]> {
    const body = (input || {}) as {
      content?: string;
      marketCode?: string;
      defaultCity?: string;
      defaultPostalCode?: string;
    };
    const content = String(body.content || "").replace(/^\uFEFF/, "");
    if (!content.trim() || Buffer.byteLength(content, "utf8") > 1_000_000)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le fichier CSV doit être non vide et ne pas dépasser 1 Mo.",
      });
    const lines = content.trim().split(/\r?\n/);
    if (lines.length > 501)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un import est limité à 500 annonces.",
      });
    const header = splitCsvRow(lines[0]).map((entry) => entry.toLowerCase());
    if (
      header.length < 9 ||
      !header[0].includes("titre") ||
      !header[3].includes("prix")
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Utilisez le modèle CSV Shongre sans modifier ses colonnes.",
      });
    const market = await this.markets.getEffective(
      (body.marketCode || "FR").toUpperCase(),
    );
    return lines.slice(1).flatMap((line, index) => {
      if (!line.trim()) return [];
      const columns = splitCsvRow(line);
      const title = columns[0] || "";
      const amount = Number.parseFloat((columns[3] || "0").replace(",", "."));
      const validationErrorCode = !title
        ? ("TITLE_REQUIRED" as const)
        : title.length < 5
          ? ("TITLE_TOO_SHORT" as const)
          : !Number.isFinite(amount) || amount <= 0
            ? ("PRICE_INVALID" as const)
            : undefined;
      return [
        {
          id: `bulk-row-${index + 1}`,
          title,
          description: columns[8] || "",
          categorySlug: columns[1] || "home_garden",
          subCategorySlug: columns[2] || columns[1] || "furniture",
          price: {
            amountMinor: Math.round(
              (Number.isFinite(amount) ? amount : 0) * 100,
            ),
            currency: market.currency,
          },
          condition: columns[4] || "very_good",
          stock: Math.max(1, Number.parseInt(columns[5] || "1", 10) || 1),
          city: columns[6] || body.defaultCity || "",
          postalCode: columns[7] || body.defaultPostalCode || "",
          isValid: validationErrorCode === undefined,
          validationErrorCode,
        },
      ];
    });
  }

  async publishBulkListings(
    userId: string,
    input: unknown,
  ): Promise<PublicListing[]> {
    const body = (input || {}) as {
      marketCode?: string;
      rows?: BulkListingImportRow[];
    };
    const marketCode = (body.marketCode || "FR").toUpperCase();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length || rows.length > 500 || rows.some((row) => !row.isValid))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "L’import doit contenir entre 1 et 500 lignes valides.",
      });
    const inventoryDecision =
      await this.publisherEntitlements.canImportInventory(userId);
    if (!inventoryDecision.allowed)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Votre formule ne permet pas l’import de catalogue.",
        details: { reasonCode: inventoryDecision.reasonCode },
      });
    const prepared = await Promise.all(
      rows.map(async (row) => {
        const taxonomyNode =
          (await taxonomyService.getNodeBySlug(row.subCategorySlug)) ||
          (await taxonomyService.getNodeBySlug(row.categorySlug));
        if (!taxonomyNode)
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: `La catégorie de la ligne ${row.id} est inconnue.`,
            details: { rowId: row.id },
          });
        return {
          title: row.title,
          description: row.description,
          price: row.price.amountMinor / 100,
          categoryId: taxonomyNode.id,
          marketCode,
          city: row.city,
          postalCode: row.postalCode,
          images: [],
          attributes: { stock_quantity: row.stock },
          allowedDelivery: ["hand_delivery"],
          condition: row.condition,
        } satisfies PublicationDraftInput;
      }),
    );
    const published: PublicListing[] = [];
    try {
      for (const draft of prepared)
        published.push(await this.publishListing(draft, userId));
      return published;
    } catch (error) {
      await Promise.allSettled(
        published.map((listing) => this.listingRepo.delete(listing.id)),
      );
      throw error;
    }
  }

  async publishListing(
    draft: PublicationDraftInput,
    sellerId: string,
  ): Promise<PublicListing> {
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
    const market = await this.markets.getEffective(marketCode);
    if (!market.isActive || market.code !== marketCode) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce marché n’est pas disponible à la publication.",
      });
    }
    const allowedDelivery = (draft.allowedDelivery || [
      "hand_delivery",
    ]) as DeliveryType[];
    if (
      allowedDelivery.length === 0 ||
      allowedDelivery.some(
        (method) =>
          !DELIVERY_TYPES.has(method) ||
          !market.allowedDeliveryMethods.includes(method),
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un mode de livraison n’est pas disponible sur ce marché.",
      });
    }
    const images = draft.images || [];
    await this.storage.assertOwnedListingMedia(sellerId, images);
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
      currency: market.currency,
      status: safety.riskScore >= 50 ? "flagged" : "published",
      condition: draft.condition || "bon-etat",
      brand: draft.brand,
      model: draft.model,
      marketCode,
      city: draft.city || "Paris",
      postalCode: draft.postalCode || "75000",
      country: market.code,
      allowedDelivery,
      shippingCost: draft.shippingCost || 0,
      images,
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
    try {
      await this.storage.attachListingMedia(sellerId, saved.id, images);
    } catch (error) {
      await this.listingRepo.delete(saved.id);
      throw error;
    }
    const hydrated = await this.listingRepo.findById(saved.id);
    logger.info("Listing publication completed", { listingId: saved.id });
    return toPublicListing(hydrated || saved);
  }

  async updateSellerListing(
    id: string,
    input: unknown,
  ): Promise<PublicListing> {
    const existing = await this.listingRepo.findById(id);
    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: `Listing ${id} not found`,
      });
    }
    const updates = this.parseSellerUpdate(input);
    if (updates.attributes || updates.condition) {
      const taxonomyValidation =
        await this.taxonomyValidation.validateListingAttributes(
          existing.categoryId,
          {
            ...(updates.attributes || existing.attributes || {}),
            condition: updates.condition || existing.condition,
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
    }

    const materialChange =
      updates.title !== undefined ||
      updates.description !== undefined ||
      updates.price !== undefined;
    const authoritativeUpdates: Partial<Listing> = { ...updates };
    if (materialChange) {
      const safety = await this.ai.analyzeListingContent(
        updates.title ?? existing.title,
        updates.description ?? existing.description,
        updates.price ?? existing.price,
      );
      authoritativeUpdates.safetyRiskScore = safety.riskScore;
      authoritativeUpdates.materiallyUpdatedAt = new Date().toISOString();
      if (["published", "flagged", "rejected"].includes(existing.status)) {
        authoritativeUpdates.status =
          safety.riskScore >= 50 ? "flagged" : "published";
      }
    }
    const saved = await this.listingRepo.update(id, authoritativeUpdates);
    return toPublicListing(saved);
  }

  private parseSellerUpdate(input: unknown): SellerListingUpdate {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La mise à jour de l’annonce est invalide.",
      });
    }
    const record = input as Record<string, unknown>;
    const unknownKeys = Object.keys(record).filter(
      (key) => !SELLER_UPDATE_KEYS.has(key as keyof SellerListingUpdate),
    );
    if (unknownKeys.length > 0) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Certains champs de l’annonce ne peuvent pas être modifiés.",
        details: { rejectedFields: unknownKeys.sort() },
      });
    }
    if (Object.keys(record).length === 0) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Aucune modification n’a été fournie.",
      });
    }

    const updates = { ...record } as SellerListingUpdate;
    const validateText = (key: keyof SellerListingUpdate, max: number) => {
      const value = updates[key];
      if (value === undefined) return;
      if (typeof value !== "string" || !value.trim() || value.length > max) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `Le champ ${String(key)} est invalide.`,
        });
      }
      (updates as Record<string, unknown>)[key] = value.trim();
    };
    validateText("title", 140);
    validateText("description", 10_000);
    validateText("condition", 80);
    validateText("brand", 120);
    validateText("model", 120);
    validateText("city", 160);
    validateText("postalCode", 20);

    for (const key of ["price", "shippingCost"] as const) {
      const value = updates[key];
      if (
        value !== undefined &&
        (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      ) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `Le champ ${key} doit être un montant positif ou nul.`,
        });
      }
    }
    if (
      updates.allowedDelivery !== undefined &&
      (!Array.isArray(updates.allowedDelivery) ||
        updates.allowedDelivery.length === 0 ||
        updates.allowedDelivery.some((value) => !DELIVERY_TYPES.has(value)))
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Les modes de livraison sont invalides.",
      });
    }
    if (
      updates.attributes !== undefined &&
      (!updates.attributes ||
        typeof updates.attributes !== "object" ||
        Array.isArray(updates.attributes))
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Les caractéristiques de l’annonce sont invalides.",
      });
    }
    return updates;
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
