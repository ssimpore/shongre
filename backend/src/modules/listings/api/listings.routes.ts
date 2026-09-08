import { taxonomyV4Service } from "../../taxonomy/taxonomy.runtime.js";
import { z } from "zod";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import {
  requireApiRequestMarket,
  requireOpenMarketplace,
  requireOpenApiRequestMarket,
  requireApiMarketContext,
} from "../../markets/request-market-context.js";
import { listingsService } from "../listings.service.js";
import {
  publicListingCardsRequestSchema,
  getCountryConfig,
} from "@shongre/contracts";
import { storageService } from "../../../infrastructure/storage/storage-service.js";
import { complianceService } from "../../compliance/compliance.service.js";
import { publisherEntitlementsService } from "../../publishers/publisher-entitlements.service.js";
import { assertListingOwnership } from "./access-policy.js";
import { deliveryService } from "../../delivery/delivery.service.js";
import { toPublicListing } from "../../../shared/public-projections.js";
import { deliveryRequestToDiscoveryListing } from "../../discovery/discovery.service.js";

const searchBooleanSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true"),
]);

const searchAttributeScalarSchema = z.union([
  z.string().trim().max(200),
  z.number().finite(),
  z.boolean(),
]);

const searchAttributeValueSchema = z.union([
  searchAttributeScalarSchema,
  z.array(searchAttributeScalarSchema).max(50),
  z
    .object({
      min: z.number().finite().optional(),
      max: z.number().finite().optional(),
    })
    .strict()
    .refine((value) => value.min !== undefined || value.max !== undefined)
    .refine(
      (value) =>
        value.min === undefined ||
        value.max === undefined ||
        value.min <= value.max,
    ),
]);

const publicListingSearchSchema = z
  .object({
    marketCode: z.string().trim().length(2),
    query: z.string().trim().max(200).optional(),
    categoryId: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-zA-Z0-9_.-]+$/)
      .optional(),
    categorySlug: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-zA-Z0-9_.-]+$/)
      .optional(),
    subCategorySlug: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-zA-Z0-9_.-]+$/)
      .optional(),
    city: z.string().trim().max(200).optional(),
    postalCode: z.string().trim().max(32).optional(),
    radiusKm: z.coerce.number().min(0).max(500).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sellerType: z.enum(["all", "individual", "pro"]).optional(),
    deliveryAvailable: searchBooleanSchema.optional(),
    onlinePaymentAvailable: searchBooleanSchema.optional(),
    onlyDeals: searchBooleanSchema.optional(),
    publishedToday: searchBooleanSchema.optional(),
    conditions: z.array(z.string().trim().max(100)).max(20).optional(),
    attributes: z
      .record(
        z
          .string()
          .trim()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9_.-]+$/),
        searchAttributeValueSchema,
      )
      .optional(),
    sortBy: z
      .enum(["date_desc", "price_asc", "price_desc", "relevance", "distance"])
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    cursor: z.string().trim().min(1).max(1024).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "maxPrice doit être supérieur ou égal à minPrice.",
      });
    }
    if (value.attributes && Object.keys(value.attributes).length > 50) {
      context.addIssue({
        code: "custom",
        path: ["attributes"],
        message: "La recherche accepte au plus 50 attributs.",
      });
    }
  });

function parsePublicListingSearchQuery(
  query: URLSearchParams,
  marketCode: string,
) {
  let attributes: Record<string, unknown> | undefined;
  const encodedAttributes = query.get("attributes");
  if (encodedAttributes) {
    try {
      const parsed = JSON.parse(encodedAttributes);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("attributes must be an object");
      }
      attributes = parsed;
    } catch {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le filtre attributes doit être un objet JSON valide.",
      });
    }
  }
  const conditions = query
    .get("conditions")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return publicListingSearchSchema.parse({
    marketCode,
    query: query.get("query") || undefined,
    categoryId: query.get("categoryId") || undefined,
    categorySlug: query.get("categorySlug") || undefined,
    subCategorySlug: query.get("subCategorySlug") || undefined,
    city: query.get("city") || undefined,
    postalCode: query.get("postalCode") || undefined,
    radiusKm: query.get("radiusKm") || undefined,
    minPrice: query.get("minPrice") || undefined,
    maxPrice: query.get("maxPrice") || undefined,
    sellerType: query.get("sellerType") || undefined,
    deliveryAvailable: query.get("deliveryAvailable") || undefined,
    onlinePaymentAvailable: query.get("onlinePaymentAvailable") || undefined,
    onlyDeals: query.get("onlyDeals") || undefined,
    publishedToday: query.get("publishedToday") || undefined,
    conditions: conditions?.length ? conditions : undefined,
    attributes,
    sortBy: query.get("sortBy") || undefined,
    page: query.get("page") || undefined,
    limit: query.get("limit") || undefined,
    cursor: query.get("cursor") || undefined,
  });
}

export function registerListingsRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/listings", PUBLIC, async ({ query, marketCode }) => {
    const resolved = requireApiRequestMarket(marketCode);
    requireOpenMarketplace(resolved);
    const params = {
      ...Object.fromEntries(query.entries()),
      marketCode: resolved,
    };
    return listingsService.getListings(params as any);
  });
  routes.addRoute(
    "POST",
    "/listings/cards",
    PUBLIC,
    async ({ body, marketCode }) => {
      const resolved = requireApiRequestMarket(marketCode);
      requireOpenMarketplace(resolved);
      const input = publicListingCardsRequestSchema.parse(body);
      return listingsService.getPublicListingCards(input.listingIds, resolved);
    },
  );
  routes.addRoute(
    "GET",
    "/listings/search",
    PUBLIC,
    async ({ query, marketCode }) => {
      const resolved = requireApiRequestMarket(marketCode);
      requireOpenMarketplace(resolved);
      return listingsService.searchListings(
        parsePublicListingSearchQuery(query, resolved),
      );
    },
  );
  routes.addRoute(
    "GET",
    "/listings/:id/characteristics",
    PUBLIC,
    async ({ params, marketCode, query }) => {
      const market = requireOpenApiRequestMarket(marketCode);
      let locale = z
        .string()
        .min(2)
        .max(35)
        .parse(query.get("locale") ?? requireApiMarketContext(market).locale);
      try {
        [locale] = Intl.getCanonicalLocales(locale);
      } catch {
        throw new AppError({
          code: "VALIDATION_ERROR",
          statusCode: 400,
          message: "Locale invalide.",
        });
      }
      return listingsService.getListingCharacteristics(
        params.id,
        market,
        locale,
      );
    },
  );
  routes.addRoute(
    "GET",
    "/listings/:id",
    PUBLIC,
    async ({ params, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      return listingsService.getListingById(params.id, resolvedMarketCode);
    },
  );
  routes.addRoute(
    "POST",
    "/listings/search",
    PUBLIC,
    async ({ body, marketCode }) => {
      const resolved = requireApiRequestMarket(marketCode);
      requireOpenMarketplace(resolved);
      const parsed = publicListingSearchSchema.parse(body || {});
      if (parsed.marketCode.toUpperCase() !== resolved) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Le marché du corps ne correspond pas au contexte de requête.",
        });
      }
      return listingsService.searchListings({
        ...parsed,
        marketCode: resolved,
      });
    },
  );
  routes.addRoute(
    "GET",
    "/listing-drafts/current",
    permission("listing.create"),
    async ({ principal, marketCode }) =>
      listingsService.getListingDraft(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/listing-drafts",
    permission("listing.create"),
    async ({ principal, marketCode }) =>
      listingsService.createListingDraft(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "PUT",
    "/listing-drafts/current",
    permission("listing.create"),
    async ({ principal, body, marketCode }) => {
      const resolvedMarketCode = requireApiRequestMarket(marketCode);
      if (body?.marketCode !== resolvedMarketCode) {
        throw new AppError({
          code: "CONFLICT",
          message: "Le brouillon ne correspond pas au marché de la requête.",
        });
      }
      await listingsService.saveListingDraft(body, principal.userId);
      return { success: true };
    },
  );
  routes.addRoute(
    "GET",
    "/listings/bulk-import/template",
    permission("listing.create"),
    async ({ query, marketCode }) => {
      const country = getCountryConfig(requireApiRequestMarket(marketCode))!;
      return listingsService.getBulkImportTemplate(
        query.get("locale") || country.defaultLocale,
      );
    },
  );
  routes.addRoute(
    "POST",
    "/listings/bulk-import/parse",
    permission("listing.create"),
    async ({ body, marketCode }) =>
      listingsService.parseBulkImportCsv({
        ...(body || {}),
        marketCode: requireApiRequestMarket(marketCode),
      }),
  );
  routes.addRoute(
    "POST",
    "/listings/bulk-import/publish",
    permission("listing.publish"),
    async ({ principal, body, marketCode }) =>
      listingsService.publishBulkListings(principal.userId, {
        ...(body || {}),
        marketCode: requireOpenApiRequestMarket(marketCode),
      }),
  );
  routes.addRoute(
    "POST",
    "/media/listings/uploads",
    permission("listing.create"),
    async ({ principal, body }) =>
      storageService.createListingMediaUpload(principal.userId, body || {}),
  );
  routes.addRoute(
    "POST",
    "/media/listings/uploads/:id/complete",
    permission("listing.create"),
    async ({ principal, params }) =>
      storageService.completeListingMediaUpload(principal.userId, params.id),
  );
  routes.addRoute(
    "POST",
    "/media/private-documents/uploads",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      storageService.createPrivateDocumentUpload(principal.userId, body || {}),
  );
  routes.addRoute(
    "POST",
    "/media/private-documents/uploads/:id/complete",
    permission("marketplace.customer.access"),
    async ({ principal, params }) =>
      storageService.completePrivateDocumentUpload(principal.userId, params.id),
  );
  routes.addRoute(
    "POST",
    "/listings/publish",
    permission("listing.publish"),
    async ({ principal, body, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      const subject = await complianceService.getSubject(principal.userId);
      await complianceService.requireForUser(principal.userId, {
        requestedAction:
          subject.accountType === "professional"
            ? "publish_professional_listing"
            : "publish_listing",
        jurisdiction: resolvedMarketCode,
        marketCode: resolvedMarketCode,
        categoryId: body?.draft?.categoryId,
        transactionContext: {
          transactionType: "classified",
          contractConclusionMode: "off_platform",
          paymentFlow: "none",
        },
      });
      // The seller is the caller. Taking sellerId from the body would let anyone
      // publish listings under another account's name.
      return listingsService.publishListing(body?.draft, principal.userId, {
        marketContext: requireApiMarketContext(marketCode),
        sellerType:
          subject.accountType === "professional"
            ? "professional"
            : "individual",
      });
    },
  );
  routes.addRoute(
    "POST",
    "/publication/entitlements",
    permission("listing.create"),
    async ({ principal, body, marketCode }) =>
      publisherEntitlementsService.getPublicationEntitlements({
        actorUserId: principal.userId,
        organizationId: body?.organizationId,
        branchId: body?.branchId,
        marketCode: requireApiRequestMarket(marketCode),
        categoryId: body?.categoryId,
      }),
  );
  routes.addRoute(
    "PUT",
    "/listings/:id",
    permission("listing.update.own"),
    async ({ principal, params, body }) => {
      await assertListingOwnership(principal, params.id);
      return listingsService.updateSellerListing(params.id, body);
    },
  );
  routes.addRoute(
    "DELETE",
    "/listings/:id",
    permission("listing.delete.own"),
    async ({ principal, params }) => {
      await assertListingOwnership(principal, params.id);
      const success = await listingsService.deleteListing(params.id);
      return { success };
    },
  );
  routes.addRoute(
    "POST",
    "/listings/:id/mark-sold",
    permission("listing.update.own"),
    async ({ principal, params }) => {
      await assertListingOwnership(principal, params.id);
      return listingsService.markListingSold(params.id);
    },
  );
  routes.addRoute(
    "PUT",
    "/listings/:id/favorite",
    permission("favorite.manage.own"),
    async ({ principal, params, marketCode, body }) => {
      if (typeof body?.isFavorite !== "boolean")
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "L’état favori demandé est invalide.",
        });
      const isFavorite = await listingsService.setFavorite(
        params.id,
        principal.userId,
        requireApiRequestMarket(marketCode),
        body.isFavorite,
      );
      return { isFavorite };
    },
  );
  routes.addRoute(
    "GET",
    "/favorites",
    permission("favorite.manage.own"),
    async ({ principal, marketCode }) => {
      const resolvedMarket = requireApiRequestMarket(marketCode);
      const [listingCollection, deliveryRequests] = await Promise.all([
        listingsService.getFavoriteCollection(principal.userId, resolvedMarket),
        deliveryService.getFavoritePublicRequests(
          principal,
          requireApiMarketContext(marketCode),
        ),
      ]);
      const taxonomy = await taxonomyV4Service.snapshot();
      const deliveryListings = deliveryRequests.map((request) =>
        toPublicListing(deliveryRequestToDiscoveryListing(request), taxonomy),
      );
      return {
        listingIds: [
          ...listingCollection.listingIds,
          ...deliveryListings.map((listing) => listing.id),
        ],
        listings: [...listingCollection.listings, ...deliveryListings],
      };
    },
  );
}
