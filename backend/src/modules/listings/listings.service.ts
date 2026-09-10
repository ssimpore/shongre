import { requireApiMarketContext } from "../markets/request-market-context.js";
import { taxonomyV1Service } from "../taxonomy/taxonomy.runtime.js";
import {
  DeliveryType,
  Listing,
  PublicListing,
  SearchFilters,
} from "../../shared/types/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { toPublicListing } from "../../shared/public-projections.js";
import { listingLocationPolicy } from "../geo/geo.runtime.js";
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
import { projectListingCharacteristics } from "../taxonomy/taxonomy.characteristics.js";
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
  TaxonomyV1ListingIntent,
} from "@shongre/contracts";
import {
  PUBLICATION_CONSTRAINTS,
  toApplicationListingCondition,
  toTaxonomyV1ItemCondition,
} from "@shongre/contracts";
import type {
  DigitalFulfillmentVersionInput,
  FulfillmentType,
} from "@shongre/contracts/digital-products";
import { TaxonomyV1Error } from "../taxonomy/taxonomy.v1.service.js";
import {
  digitalProductsService,
  DigitalProductsService,
} from "../digital-products/digital-products.service.js";
import { DELIVERY_TAXONOMY_CATEGORY_ID } from "@shongre/contracts/delivery";

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
    | "weekly"
    | "monthly"
    | "total"
    | "rent_plus_charges"
    | "unpriced";
  categoryId?: string;
  listingTypeId?: string;
  intent?: TaxonomyV1ListingIntent;
  taxonomyVersion?: "v1";
  taxonomyRevision?: number;
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

const LISTING_PRICE_TYPES = [
  "fixed",
  "negotiable",
  "free",
  "on_request",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "total",
  "rent_plus_charges",
  "unpriced",
] as const;
type ListingPriceType = (typeof LISTING_PRICE_TYPES)[number];
const LISTING_PRICE_TYPE_SET = new Set<string>(LISTING_PRICE_TYPES);

interface SitemapListingCursor {
  version: 1;
  marketCode: string;
  snapshotAt: string;
  after: {
    sortDate: string;
    listingId: string;
  };
}

function encodeSitemapListingCursor(cursor: SitemapListingCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeSitemapListingCursor(
  value: string | undefined,
  marketCode: string,
): SitemapListingCursor | undefined {
  if (!value) return undefined;
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SitemapListingCursor;
    const snapshot = Date.parse(cursor.snapshotAt);
    if (
      cursor.version !== 1 ||
      cursor.marketCode !== marketCode ||
      !cursor.after?.listingId ||
      !Number.isFinite(Date.parse(cursor.after.sortDate)) ||
      !Number.isFinite(snapshot) ||
      snapshot > Date.now() + 300_000
    ) {
      throw new Error("invalid sitemap cursor");
    }
    return cursor;
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le curseur de sitemap est invalide pour ce marché.",
    });
  }
}

function resolveListingPriceType(
  draft: PublicationDraftInput,
): ListingPriceType {
  const candidate =
    draft.priceModel ??
    draft.attributes?.price_type ??
    (draft.price === undefined ? "unpriced" : "fixed");
  if (typeof candidate !== "string" || !LISTING_PRICE_TYPE_SET.has(candidate)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le modèle de prix de l’annonce est invalide.",
    });
  }
  return candidate as ListingPriceType;
}

const SENSITIVE_DRAFT_ATTRIBUTE =
  /(password|secret|credential|access[_-]?token|refresh[_-]?token|kyc|identity[_-]?document|payment[_-]?card|bank[_-]?account|iban|license[_-]?key|download[_-]?url|access[_-]?code)/i;

export function sanitizeStoredListingDraft(draft: any, marketCode: string) {
  return {
    ...draft,
    marketCode,
    attributes: Object.fromEntries(
      Object.entries(draft?.attributes ?? {}).filter(
        ([attributeId]) => !SENSITIVE_DRAFT_ATTRIBUTE.test(attributeId),
      ),
    ),
    digitalFulfillment: undefined,
  };
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

type BulkListingImportRow =
  import("@shongre/contracts/openapi").components["schemas"]["BulkListingImportRow"];
type BulkImportValidationCode = NonNullable<
  BulkListingImportRow["validationErrorCode"]
>;

const BULK_IMPORT_TEMPLATE =
  "Titre;Categorie;SousCategorie;Prix;Etat;Stock;Ville;CodePostal;Description;CaracteristiquesJSON;PhotosJSON\n";

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
  priceType: ListingPriceType,
  definitions: ManagedTaxonomyDefinition[],
  market: { countryCode: string; currency: string },
  sellerType: "individual" | "professional",
): Record<string, unknown> {
  const allowed = new Set(definitions.map((definition) => definition.id));
  const defaults = new Map(
    definitions.map((definition) => [definition.id, definition.defaultValue]),
  );
  const condition = toTaxonomyV1ItemCondition(draft.condition);
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
    price_type: priceType,
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
    private publisherEntitlements: PublisherEntitlementsService = publisherEntitlementsService,
    private discovery: UnifiedDiscoveryService = unifiedDiscoveryService,
    private markets: IMarketRepository = repositories.markets,
    private storage: StorageService = storageService,
    private taxonomyV1 = taxonomyV1Service,
    private digitalProducts: DigitalProductsService = digitalProductsService,
  ) {}

  async getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: PublicListing[]; total: number }> {
    const res = await this.discovery.search(filter || {});
    return {
      listings: await this.projectListings(res.items),
      total: res.total,
    };
  }

  async getSitemapListings(
    marketCode: string,
    cursorValue?: string,
    requestedLimit = 500,
  ): Promise<{
    items: PublicListing[];
    snapshotAt: string;
    pageInfo: { hasNextPage: boolean; nextCursor?: string };
  }> {
    const normalizedMarketCode = requireMarketCode(marketCode);
    const cursor = decodeSitemapListingCursor(
      cursorValue,
      normalizedMarketCode,
    );
    const page = await this.listingRepo.searchDiscoveryCandidates(
      { marketCode: normalizedMarketCode, sortBy: "date_desc" },
      {
        limit: Math.max(1, Math.min(500, Math.trunc(requestedLimit))),
        snapshotAt: cursor?.snapshotAt,
        after: cursor?.after,
      },
    );
    // Candidate pagination stays narrow and index-friendly. Hydrate only the
    // selected IDs through the existing bounded public projection so sitemap
    // image entries receive real media URLs and never ranking-only placeholders.
    const hydratedItems = await this.listingRepo.findPublicByIds(
      page.items.map((listing) => listing.id),
      normalizedMarketCode,
    );
    const nextCursor =
      page.hasMore && page.lastCandidate
        ? encodeSitemapListingCursor({
            version: 1,
            marketCode: normalizedMarketCode,
            snapshotAt: page.snapshotAt,
            after: {
              sortDate: page.lastCandidate.sortDate,
              listingId: page.lastCandidate.listingId,
            },
          })
        : undefined;
    return {
      items: await this.projectListings(hydratedItems),
      snapshotAt: page.snapshotAt,
      pageInfo: {
        hasNextPage: Boolean(nextCursor),
        ...(nextCursor ? { nextCursor } : {}),
      },
    };
  }

  async getInternalListingById(id: string): Promise<Listing | null> {
    return this.listingRepo.findById(id);
  }

  async getOwnedListings(
    userId: string,
    marketCode: string,
  ): Promise<{ listings: PublicListing[]; total: number }> {
    const result = await this.listingRepo.findOwnedBySeller(
      userId,
      requireMarketCode(marketCode),
    );
    return {
      listings: await this.projectListings(result.items),
      total: result.total,
    };
  }

  private async projectListings(items: Listing[]): Promise<PublicListing[]> {
    if (!items.length) return [];
    const taxonomy = await this.taxonomyV1.snapshot();
    return items.map((item) =>
      toPublicListing(item, taxonomy, listingLocationPolicy),
    );
  }

  async getListingById(
    id: string,
    marketCode: string,
  ): Promise<PublicListing | null> {
    const listing = await this.listingRepo.findPublicById(
      id,
      requireMarketCode(marketCode),
    );
    return listing
      ? toPublicListing(
          listing,
          await this.taxonomyV1.snapshot(),
          listingLocationPolicy,
        )
      : null;
  }

  async getListingCharacteristics(
    id: string,
    marketCode: string,
    locale: string,
  ) {
    const listing = await this.listingRepo.findPublicById(
      id,
      requireMarketCode(marketCode),
    );
    if (!listing)
      throw new AppError({
        code: "NOT_FOUND",
        statusCode: 404,
        message: "Annonce introuvable.",
      });
    return projectListingCharacteristics(
      {
        categoryId: listing.categoryId,
        listingTypeId: listing.listingTypeId,
        intent: listing.listingIntent,
        sellerType: (
          listing.publisherType
            ? listing.publisherType === "professional"
            : listing.seller?.accountType === "professional"
        )
          ? "professional"
          : "individual",
        marketCode,
        locale,
        attributes: {
          ...listing.attributes,
          ...(listing.brand ? { brand: listing.brand } : {}),
          ...(listing.model ? { model: listing.model } : {}),
        },
      },
      (await this.taxonomyV1.snapshot()).getBundle(),
    );
  }

  async getPublicListingCards(
    listingIds: readonly string[],
    marketCode: string,
  ): Promise<{ listings: PublicListing[]; total: number }> {
    const listings = await this.listingRepo.findPublicByIds(
      listingIds,
      requireMarketCode(marketCode),
    );
    return {
      listings: await this.projectListings(listings),
      total: listings.length,
    };
  }

  async searchListings(params: SearchFilters) {
    const result = await this.discovery.search(params);
    return { ...result, items: await this.projectListings(result.items) };
  }

  async createListingDraft(userId: string, marketCode: string): Promise<any> {
    return this.listingRepo.createDraft(userId, requireMarketCode(marketCode));
  }

  async getListingDraft(
    userId: string,
    marketCode: string,
  ): Promise<any | null> {
    return this.listingRepo.getDraft(userId, requireMarketCode(marketCode));
  }

  async saveListingDraft(draft: any, userId?: string): Promise<void> {
    const marketCode = requireMarketCode(draft?.marketCode);
    const market = await this.markets.getEffective(marketCode);
    if (!market.isActive)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce marché n’est pas disponible.",
      });
    if (!userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Connexion requise.",
      });
    await this.listingRepo.saveDraft(
      sanitizeStoredListingDraft(draft, marketCode),
      userId,
      marketCode,
    );
  }

  getBulkImportTemplate(locale: string) {
    const language = locale.toLowerCase().startsWith("fr") ? "fr" : "en";
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
    const taxonomy = await this.taxonomyV1.snapshot();
    return lines.slice(1).flatMap((line, index) => {
      if (!line.trim()) return [];
      const columns = splitCsvRow(line);
      const title = columns[0] || "";
      const amount = Number.parseFloat((columns[3] || "0").replace(",", "."));
      const categoryIdentity = columns[2] || columns[1] || "";
      const category = taxonomy.findCategory(categoryIdentity);
      let attributes: BulkListingImportRow["attributes"] = {};
      let images: string[] = [];
      let attributesInvalid = false;
      try {
        const parsed: unknown = JSON.parse(columns[9] || "{}");
        const photos: unknown = JSON.parse(columns[10] || "[]");
        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed) ||
          !Array.isArray(photos) ||
          photos.length > 12 ||
          photos.some((photo) => typeof photo !== "string")
        )
          throw new Error("Invalid import payload");
        attributes = parsed as NonNullable<BulkListingImportRow["attributes"]>;
        images = photos as string[];
      } catch {
        attributesInvalid = true;
      }
      const validationErrorCode: BulkImportValidationCode | undefined = !title
        ? ("TITLE_REQUIRED" as const)
        : title.length < 5
          ? ("TITLE_TOO_SHORT" as const)
          : title.length > PUBLICATION_CONSTRAINTS.title.maxLength
            ? ("TITLE_TOO_LONG" as const)
            : !Number.isFinite(amount) || amount <= 0
              ? ("PRICE_INVALID" as const)
              : !category?.publishable
                ? "CATEGORY_INVALID"
                : attributesInvalid
                  ? "ATTRIBUTES_INVALID"
                  : undefined;
      return [
        {
          id: `bulk-row-${index + 1}`,
          title,
          description: columns[8] || "",
          categorySlug: columns[1] || "",
          subCategorySlug: category?.id ?? categoryIdentity,
          attributes,
          images,
          price: {
            amountMinor: Math.round(
              (Number.isFinite(amount) ? amount : 0) *
                10 ** getCurrencyMinorUnitDigits(market.currency),
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
    if (
      !rows.length ||
      rows.length > 500 ||
      rows.some(
        (row) =>
          !row.isValid ||
          typeof row.title !== "string" ||
          row.title.length > PUBLICATION_CONSTRAINTS.title.maxLength,
      )
    )
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
    const seller = await repositories.users.findById(userId);
    if (!seller)
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    const taxonomyContext = {
      marketContext: requireApiMarketContext(marketCode),
      sellerType: seller.accountType,
    };
    const taxonomy = await this.taxonomyV1.snapshot();
    const prepared = await Promise.all(
      rows.map(async (row) => {
        const taxonomyNode = taxonomy.findCategory(
          row.subCategorySlug || row.categorySlug,
        );
        if (!taxonomyNode)
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: `La catégorie de la ligne ${row.id} est inconnue.`,
            details: { rowId: row.id },
          });
        const resolved = taxonomy.resolve({
          ...taxonomyContext,
          categoryIdentity: taxonomyNode.id,
          locale: taxonomyContext.marketContext.locale!,
        });
        return {
          taxonomyVersion: "v1",
          taxonomyRevision: taxonomy.revision,
          listingTypeId: resolved.listingType.id,
          intent: resolved.listingType.intent,
          title: row.title,
          description: row.description,
          price:
            row.price.amountMinor /
            10 ** getCurrencyMinorUnitDigits(row.price.currency),
          categoryId: taxonomyNode.id,
          marketCode,
          city: row.city,
          postalCode: row.postalCode,
          images: [...(row.images ?? [])],
          attributes: { ...row.attributes, stock_quantity: row.stock },
          allowedDelivery: ["hand_delivery"],
          condition: row.condition,
        } satisfies PublicationDraftInput;
      }),
    );
    const published: PublicListing[] = [];
    try {
      for (const draft of prepared)
        published.push(
          await this.publishListing(draft, userId, taxonomyContext),
        );
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
    if (
      typeof draft.title !== "string" ||
      draft.title.length > PUBLICATION_CONSTRAINTS.title.maxLength
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Le titre ne doit pas dépasser ${PUBLICATION_CONSTRAINTS.title.maxLength} caractères.`,
        details: {
          field: "title",
          maxLength: PUBLICATION_CONSTRAINTS.title.maxLength,
        },
      });
    }
    if (draft.categoryId === DELIVERY_TAXONOMY_CATEGORY_ID) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Les demandes de livraison doivent utiliser le parcours de livraison dédié.",
      });
    }

    const priceType = resolveListingPriceType(draft);
    const numericPrice =
      draft.price === undefined ? undefined : Number(draft.price);
    if (
      numericPrice !== undefined &&
      (!Number.isFinite(numericPrice) || numericPrice < 0)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le prix doit être un montant positif ou nul.",
      });
    }
    const amountIsHidden =
      priceType === "on_request" || priceType === "unpriced";
    if (
      (priceType === "free" || amountIsHidden) &&
      numericPrice !== undefined &&
      numericPrice !== 0
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce modèle de prix ne peut pas masquer un montant renseigné.",
      });
    }
    const amountIsRequired = priceType !== "free" && !amountIsHidden;
    if (amountIsRequired && (numericPrice === undefined || numericPrice <= 0)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un prix ou un tarif positif est obligatoire pour ce modèle.",
      });
    }
    const effectivePrice = numericPrice ?? 0;

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

    {
      if (!taxonomyContext || !draft.listingTypeId || !draft.intent) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Le type d’annonce et le contexte de taxonomie v1 sont obligatoires.",
        });
      }
      try {
        const taxonomy = await this.taxonomyV1.snapshot(draft.taxonomyRevision);
        const resolvedTaxonomy = taxonomy.resolve({
          marketContext: taxonomyContext.marketContext,
          categoryIdentity: draft.categoryId,
          listingTypeId: draft.listingTypeId,
          intent: draft.intent,
          sellerType: taxonomyContext.sellerType,
          sellerCapabilities: taxonomyContext.sellerCapabilities,
          fulfillmentTypes: draft.fulfillmentTypes,
          locale: taxonomyContext.marketContext.locale ?? "fr-FR",
          taxonomyVersion: "v1",
        });
        const acceptsCondition = resolvedTaxonomy.attributes.some(
          ({ definition }) => definition.id === "condition",
        );
        const canonicalCondition = acceptsCondition
          ? toTaxonomyV1ItemCondition(draft.condition)
          : undefined;
        const managedAttributes = applicationManagedTaxonomyAttributes(
          draft,
          priceType,
          resolvedTaxonomy.attributes.map(({ definition }) => definition),
          {
            countryCode: taxonomyContext.marketContext.countryCode!,
            currency: taxonomyContext.marketContext.currency!,
          },
          taxonomyContext.sellerType,
        );
        const validation = taxonomy.validate({
          marketContext: taxonomyContext.marketContext,
          categoryIdentity: draft.categoryId,
          listingTypeId: draft.listingTypeId,
          intent: draft.intent,
          sellerType: taxonomyContext.sellerType,
          sellerCapabilities: taxonomyContext.sellerCapabilities,
          locale: taxonomyContext.marketContext.locale ?? "fr-FR",
          taxonomyVersion: "v1",
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
        if (error instanceof TaxonomyV1Error) {
          throw new AppError({ code: error.code, message: error.message });
        }
        throw error;
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
      attributes: {
        ...(draft.attributes || {}),
        // Keep the authoritative pricing intent in the public-safe listing
        // projection. A zero amount alone cannot distinguish a donation, an
        // on-request price, or a category where no price is published.
        price_type: priceType,
      },
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
    return toPublicListing(
      hydrated || saved,
      await this.taxonomyV1.snapshot(),
      listingLocationPolicy,
    );
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
    if (
      updates.attributes ||
      updates.condition ||
      updates.brand ||
      updates.model
    ) {
      const taxonomy = await this.taxonomyV1.snapshot();
      const seller = await repositories.users.findById(existing.sellerId);
      if (!seller)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Compte introuvable.",
        });
      const previousAttributes = {
        ...(existing.attributes ?? {}),
        ...(existing.brand ? { brand: existing.brand } : {}),
        ...(existing.model ? { model: existing.model } : {}),
        ...(existing.condition
          ? { condition: toTaxonomyV1ItemCondition(existing.condition) }
          : {}),
      };
      const attributes = {
        ...previousAttributes,
        ...(updates.attributes ?? {}),
        ...(updates.brand ? { brand: updates.brand } : {}),
        ...(updates.model ? { model: updates.model } : {}),
        ...(updates.condition
          ? { condition: toTaxonomyV1ItemCondition(updates.condition) }
          : {}),
      };
      const validation = taxonomy.validateRecordedUpdate({
        categoryIdentity: existing.categoryId,
        listingTypeId: existing.listingTypeId,
        intent: existing.listingIntent,
        marketContext: requireApiMarketContext(existing.marketCode),
        sellerType: seller.accountType,
        locale: "fr-FR",
        attributes,
        previousAttributes,
      });
      if (!validation.valid)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            validation.issues[0]?.message ?? "Caractéristiques invalides.",
          details: { issues: validation.issues },
        });
      if (updates.attributes)
        updates.attributes = { ...existing.attributes, ...updates.attributes };
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
    return toPublicListing(
      saved,
      await this.taxonomyV1.snapshot(),
      listingLocationPolicy,
    );
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

  async markListingSold(id: string): Promise<PublicListing> {
    const listing = await this.listingRepo.findById(id);
    if (!listing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      });
    }
    if (!["published", "reserved"].includes(listing.status)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Seule une annonce publiée ou réservée peut être vendue.",
      });
    }
    const sold = await this.listingRepo.update(id, { status: "sold" });
    logger.info("Listing marked sold", { listingId: id });
    return toPublicListing(
      sold,
      await this.taxonomyV1.snapshot(),
      listingLocationPolicy,
    );
  }

  // userId is required rather than defaulted. These previously fell back to
  // 'user_thomas', so any call that forgot to pass an identity silently read
  // and mutated one specific demo account's favourites.
  async setFavorite(
    listingId: string,
    userId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    return this.listingRepo.setFavorite(
      userId,
      listingId,
      marketCode,
      isFavorite,
    );
  }

  async getFavoriteCollection(
    userId: string,
    marketCode: string,
  ): Promise<{
    listingIds: string[];
    listings: PublicListing[];
  }> {
    const listingIds = await this.listingRepo.getFavorites(userId, marketCode);
    const listings = await this.listingRepo.findPublicByIds(
      listingIds,
      marketCode,
    );
    return {
      // A favorite may outlive publication. Keep that durable relationship in
      // storage so it can reappear after republication, but expose only ids for
      // which this same response can provide a public card projection.
      listingIds: listings.map((listing) => listing.id),
      listings: await this.projectListings(listings),
    };
  }
}

export const listingsService = new ListingsService();
