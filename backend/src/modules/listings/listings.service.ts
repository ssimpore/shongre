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
import { requireMarketCode } from "../../shared/market/market-code.js";
import { getCurrencyMinorUnitDigits } from "@shongre/shared";
import { analyticsService } from "../analytics/analytics.service.js";
import type {
  MarketContext,
  TaxonomyV4ListingIntent,
} from "@shongre/contracts";
import {
  toApplicationListingCondition,
  toTaxonomyV4ItemCondition,
} from "@shongre/contracts";
import type {
  DigitalFulfillmentVersionInput,
  FulfillmentType,
} from "@shongre/contracts/digital-products";
import {
  taxonomyV4Service,
  TaxonomyV4Error,
  TaxonomyV4Service,
} from "../taxonomy/taxonomy.v4.service.js";
import {
  digitalProductsService,
  DigitalProductsService,
} from "../digital-products/digital-products.service.js";

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
  listingTypeId?: string;
  intent?: TaxonomyV4ListingIntent;
  taxonomyVersion?: "4.0.0";
  marketCode?: string;
  selectedMarkets?: string[];
  marketPublications?: Record<
    string,
    {
      priceMinor?: number;
      currency?: string;
      localizedContent?: Record<string, unknown>;
    }
  >;
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
  fulfillmentTypes?: FulfillmentType[];
  digitalFulfillment?: DigitalFulfillmentVersionInput;
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
  "digital",
]);

type ManagedTaxonomyDefinition = {
  id: string;
  defaultValue?: unknown;
};

function applicationManagedTaxonomyAttributes(
  draft: PublicationDraftInput,
  definitions: ManagedTaxonomyDefinition[],
  market: { countryCode: string; currency: string },
  sellerType: "individual" | "professional",
): Record<string, unknown> {
  const allowed = new Set(definitions.map((definition) => definition.id));
  const defaults = new Map(
    definitions.map((definition) => [definition.id, definition.defaultValue]),
  );
  const condition = toTaxonomyV4ItemCondition(draft.condition);
  const currency = market.currency;
  const candidates: Record<string, unknown> = {
    listing_intent:
      draft.attributes?.listing_intent ??
      draft.intent?.toLocaleLowerCase("en-US") ??
      "sell",
    title: draft.title,
    description: draft.description,
    images: draft.images,
    price:
      draft.price === undefined
        ? undefined
        : Math.round(draft.price * 10 ** getCurrencyMinorUnitDigits(currency)),
    currency,
    price_type: draft.attributes?.price_type ?? draft.priceModel ?? "fixed",
    condition,
    country: market.countryCode,
    postal_code: draft.postalCode,
    city: draft.city,
    location_country: market.countryCode,
    location_postcode: draft.postalCode,
    location_city: draft.city,
    contact_mode:
      draft.attributes?.contact_mode ?? defaults.get("contact_mode"),
    seller_type: sellerType,
    item_condition: condition,
  };

  return Object.fromEntries(
    Object.entries(candidates).filter(
      ([id, value]) => allowed.has(id) && value !== undefined,
    ),
  );
}

export class ListingsService {
  constructor(
    private listingRepo: IListingRepository = repositories.listings,
    private ai: IAIProvider = providers.ai,
    private taxonomyValidation: TaxonomyValidationService = taxonomyValidationService,
    private publisherEntitlements: PublisherEntitlementsService = publisherEntitlementsService,
    private discovery: UnifiedDiscoveryService = unifiedDiscoveryService,
    private markets: IMarketRepository = repositories.markets,
    private storage: StorageService = storageService,
    private taxonomyV4: TaxonomyV4Service = taxonomyV4Service,
    private digitalProducts: DigitalProductsService = digitalProductsService,
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

  async getListingById(
    id: string,
    marketCode: string,
  ): Promise<PublicListing | null> {
    const listing = await this.listingRepo.findPublicById(
      id,
      requireMarketCode(marketCode),
    );
    return listing ? toPublicListing(listing) : null;
  }

  async searchListings(params: SearchFilters) {
    const result = await this.discovery.search(params);
    return { ...result, items: result.items.map(toPublicListing) };
  }

  async createListingDraft(userId: string, marketCode: string): Promise<any> {
    return this.listingRepo.createDraft(userId, requireMarketCode(marketCode));
  }

  async getListingDraft(userId: string): Promise<any | null> {
    return this.listingRepo.getDraft(userId);
  }

  async saveListingDraft(draft: any, userId?: string): Promise<void> {
    const marketCode = requireMarketCode(draft?.marketCode);
    const market = await this.markets.getEffective(marketCode);
    if (!market.isActive)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce marché n’est pas disponible.",
      });
    await this.listingRepo.saveDraft({ ...draft, marketCode }, userId);
  }

  getBulkImportTemplate(locale: string) {
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
      requireMarketCode(body.marketCode),
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
    const marketCode = requireMarketCode(body.marketCode);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length || rows.length > 500 || rows.some((row) => !row.isValid))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "L’import doit contenir entre 1 et 500 lignes valides.",
      });
    const inventoryDecision =
      await this.publisherEntitlements.canImportInventory(userId, marketCode);
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
          price:
            row.price.amountMinor /
            10 ** getCurrencyMinorUnitDigits(row.price.currency),
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
    taxonomyContext?: {
      marketContext: MarketContext;
      sellerType: "individual" | "professional";
      sellerCapabilities?: string[];
    },
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

    const marketCode = requireMarketCode(draft.marketCode);
    const primaryMarket = await this.markets.getEffective(marketCode);
    const requestedFulfillmentTypes = draft.fulfillmentTypes?.length
      ? [...new Set(draft.fulfillmentTypes)]
      : (["PHYSICAL"] as FulfillmentType[]);
    const isDigital = draft.digitalFulfillment !== undefined;
    if (
      isDigital !==
      requestedFulfillmentTypes.some((type) => type !== "PHYSICAL")
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le modèle de remise explicite de l’annonce est incohérent.",
      });
    }
    if (isDigital) {
      if (
        requestedFulfillmentTypes.includes("PHYSICAL") ||
        requestedFulfillmentTypes.length !==
          draft.digitalFulfillment!.fulfillmentTypes.length ||
        requestedFulfillmentTypes.some(
          (type) =>
            !draft.digitalFulfillment!.fulfillmentTypes.includes(
              type as Exclude<FulfillmentType, "PHYSICAL">,
            ),
        )
      ) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Les modes de remise numérique ne correspondent pas à la version fournie.",
        });
      }
      await this.digitalProducts.assertPublicationInput({
        sellerId,
        marketCode,
        categoryId: draft.categoryId,
        priceMajor: Number(effectivePrice),
        currency: primaryMarket.currency,
        fulfillment: draft.digitalFulfillment,
      });
    }

    if (
      draft.taxonomyVersion === "4.0.0" ||
      draft.listingTypeId ||
      draft.intent
    ) {
      if (!taxonomyContext || !draft.listingTypeId || !draft.intent) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Le type d’annonce et le contexte de taxonomie v4 sont obligatoires.",
        });
      }
      try {
        const resolvedTaxonomy = this.taxonomyV4.resolve({
          marketContext: taxonomyContext.marketContext,
          categoryIdentity: draft.categoryId,
          listingTypeId: draft.listingTypeId,
          intent: draft.intent,
          sellerType: taxonomyContext.sellerType,
          sellerCapabilities: taxonomyContext.sellerCapabilities,
          locale: taxonomyContext.marketContext.locale ?? "fr-FR",
          taxonomyVersion: "4.0.0",
        });
        const acceptsCondition = resolvedTaxonomy.attributes.some(
          ({ definition }) => definition.id === "condition",
        );
        const canonicalCondition = acceptsCondition
          ? toTaxonomyV4ItemCondition(draft.condition)
          : undefined;
        const managedAttributes = applicationManagedTaxonomyAttributes(
          draft,
          resolvedTaxonomy.attributes.map(({ definition }) => definition),
          {
            countryCode: taxonomyContext.marketContext.countryCode!,
            currency: taxonomyContext.marketContext.currency!,
          },
          taxonomyContext.sellerType,
        );
        const validation = this.taxonomyV4.validate({
          marketContext: taxonomyContext.marketContext,
          categoryIdentity: draft.categoryId,
          listingTypeId: draft.listingTypeId,
          intent: draft.intent,
          sellerType: taxonomyContext.sellerType,
          sellerCapabilities: taxonomyContext.sellerCapabilities,
          locale: taxonomyContext.marketContext.locale ?? "fr-FR",
          taxonomyVersion: "4.0.0",
          attributes: {
            ...(draft.attributes || {}),
            ...managedAttributes,
            ...(canonicalCondition ? { condition: canonicalCondition } : {}),
          },
        });
        if (!validation.valid) {
          throw new AppError({
            code: validation.issues[0]?.code ?? "VALIDATION_ERROR",
            message:
              validation.issues[0]?.message ||
              "Les caractéristiques de l’annonce sont invalides.",
            details: { issues: validation.issues },
          });
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (error instanceof TaxonomyV4Error) {
          throw new AppError({ code: error.code, message: error.message });
        }
        throw error;
      }
    } else {
      const definitions = await taxonomyService.getAttributesForCategory(
        draft.categoryId,
      );
      const managedAttributes = applicationManagedTaxonomyAttributes(
        draft,
        definitions,
        { countryCode: marketCode, currency: primaryMarket.currency },
        "individual",
      );
      const taxonomyValidation =
        await this.taxonomyValidation.validateListingAttributes(
          draft.categoryId,
          {
            ...(draft.attributes || {}),
            ...managedAttributes,
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

    const requestedMarketCodes = Array.from(
      new Set(
        (draft.selectedMarkets?.length
          ? draft.selectedMarkets
          : [marketCode]
        ).map(requireMarketCode),
      ),
    );
    if (!requestedMarketCodes.includes(marketCode))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le marché principal doit faire partie des marchés publiés.",
      });
    if (isDigital && requestedMarketCodes.length !== 1) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "La publication numérique multi-marché reste désactivée tant qu’une politique approuvée n’est pas disponible pour chaque achat.",
      });
    }
    const selectedMarketCodes = [
      marketCode,
      ...requestedMarketCodes.filter((code) => code !== marketCode),
    ];
    const selectedMarkets = await Promise.all(
      selectedMarketCodes.map((code) =>
        code === marketCode
          ? Promise.resolve(primaryMarket)
          : this.markets.getEffective(code),
      ),
    );
    if (
      selectedMarkets.some(
        (market) => !market.isActive || market.code !== market.marketCode,
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un marché sélectionné n’est pas disponible à la publication.",
      });
    }
    const market = selectedMarkets.find(
      (candidate) => candidate.code === marketCode,
    )!;
    const allowedDelivery = (
      isDigital ? ["digital"] : draft.allowedDelivery || ["hand_delivery"]
    ) as DeliveryType[];
    if (
      allowedDelivery.length === 0 ||
      allowedDelivery.some(
        (method) =>
          !DELIVERY_TYPES.has(method) ||
          (!isDigital &&
            selectedMarkets.some(
              (selectedMarket) =>
                !selectedMarket.allowedDeliveryMethods.includes(method),
            )),
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un mode de livraison n’est pas disponible sur ce marché.",
      });
    }
    const images = draft.images || [];
    await this.storage.assertOwnedListingMedia(sellerId, images);
    const publicationPolicies = await Promise.all(
      selectedMarketCodes.map((selectedMarketCode) =>
        this.publisherEntitlements.authorizePublication({
          actorUserId: sellerId,
          organizationId: draft.organizationId,
          branchId: draft.branchId,
          marketCode: selectedMarketCode,
          categoryId: draft.categoryId!,
        }),
      ),
    );
    const publicationPolicy = publicationPolicies[0];

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
        .toLowerCase()
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
        normalize(candidate.city) === normalize(draft.city);
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
    if (!isDigital && (!draft.city?.trim() || !draft.postalCode?.trim()))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La ville et le code postal sont obligatoires.",
      });
    const publicationStatus = isDigital
      ? "draft"
      : safety.riskScore >= 50
        ? "pending_review"
        : "active";
    const marketPublications = selectedMarkets.map((selectedMarket) => {
      const custom = draft.marketPublications?.[selectedMarket.code];
      const currency = (
        custom?.currency || selectedMarket.currency
      ).toUpperCase();
      if (!selectedMarket.supportedCurrencies.includes(currency))
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `La devise ${currency} n’est pas disponible sur ${selectedMarket.code}.`,
        });
      if (
        selectedMarket.code !== marketCode &&
        currency !== market.currency &&
        custom?.priceMinor === undefined
      )
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `Un prix explicite est requis pour publier en ${currency}.`,
        });
      const priceMinor =
        custom?.priceMinor ??
        Math.round(
          Number(effectivePrice) * 10 ** getCurrencyMinorUnitDigits(currency),
        );
      if (!Number.isSafeInteger(priceMinor) || priceMinor < 0)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `Le prix configuré pour ${selectedMarket.code} est invalide.`,
        });
      return {
        marketCode: selectedMarket.code,
        status: publicationStatus,
        isPrimary: selectedMarket.code === marketCode,
        priceMinor,
        currency,
        localizedContent: custom?.localizedContent || {},
        availableServices: Object.fromEntries(
          allowedDelivery.map((method) => [method, true]),
        ),
        complianceState:
          isDigital || safety.riskScore >= 50
            ? ("pending" as const)
            : ("approved" as const),
        publishedAt:
          isDigital || safety.riskScore >= 50 ? undefined : createdAt,
        sortDate: createdAt,
      } satisfies NonNullable<Listing["marketPublications"]>[number];
    });

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
      listingTypeId: draft.listingTypeId,
      listingIntent: draft.intent,
      title: draft.title,
      description: draft.description || "",
      price: Number(effectivePrice),
      currency: market.currency,
      status: isDigital
        ? "draft"
        : safety.riskScore >= 50
          ? "flagged"
          : "published",
      condition: toApplicationListingCondition(
        draft.attributes || {},
        draft.condition || "bon-etat",
      ),
      brand: draft.brand,
      model: draft.model,
      marketCode,
      marketCodes: selectedMarketCodes,
      marketPublications,
      city: isDigital ? "" : draft.city!.trim(),
      postalCode: isDigital ? "" : draft.postalCode!.trim(),
      country: market.code,
      allowedDelivery,
      shippingCost: draft.shippingCost || 0,
      fulfillmentModel: isDigital
        ? draft.digitalFulfillment!.primaryFulfillmentType
        : "PHYSICAL",
      productVersion: isDigital
        ? draft.digitalFulfillment!.productVersion
        : undefined,
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
          Math.min(
            ...publicationPolicies.map((policy) => policy.durationDays || 60),
          ) *
            24 *
            60 *
            60 *
            1000,
      ).toISOString(),
    };

    const saved = await this.listingRepo.save(listing);
    try {
      await this.storage.attachListingMedia(sellerId, saved.id, images);
      if (isDigital) {
        await this.digitalProducts.createFulfillmentVersion({
          sellerId,
          marketCode,
          listingId: saved.id,
          fulfillment: draft.digitalFulfillment,
        });
      }
    } catch (error) {
      await this.listingRepo.delete(saved.id);
      throw error;
    }
    const hydrated = await this.listingRepo.findById(saved.id);
    logger.info("Listing publication completed", { listingId: saved.id });
    void analyticsService
      .captureAuthoritative({
        name: "listing_published",
        marketCode,
        eventId: `evt_listing_published_${saved.id}`,
        userId: sellerId,
        userType: publicationPolicy.publisher.type,
        properties: {
          listingId: saved.id,
          sellerId,
          categoryId: draft.categoryId,
          selectedMarketCodes,
        },
      })
      .catch((error) =>
        logger.warn("analytics_listing_publication_failed", {
          listingId: saved.id,
          errorCode: error instanceof Error ? error.name : "unknown",
        }),
      );
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
