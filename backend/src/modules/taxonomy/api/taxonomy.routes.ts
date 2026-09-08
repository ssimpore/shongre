import { z } from "zod";
import { AppError } from "../../../shared/errors/app-error.js";
import { TaxonomyV4Error } from "../taxonomy.v4.service.js";
import { taxonomyV4Service } from "../taxonomy.runtime.js";
import { type RouteRegistrar, PUBLIC } from "../../../api/v1/route-contract.js";
import { taxonomyService } from "../taxonomy.service.js";
import { requireApiMarketContext } from "../../markets/request-market-context.js";
import { taxonomyV4ListingIntentSchema } from "@shongre/contracts";

function requireTaxonomyV4Version(value: string | null): "4.0.0" | undefined {
  if (value === null) return undefined;
  if (value !== "4.0.0") {
    throw new AppError({
      code: "TAXONOMY_VERSION_UNSUPPORTED",
      statusCode: 400,
      message: "Version de taxonomie non prise en charge.",
    });
  }
  return value;
}

function taxonomyV4Result<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (!(error instanceof TaxonomyV4Error)) throw error;
    const statusCode =
      error.code === "TAXONOMY_CATEGORY_NOT_FOUND" ||
      error.code === "TAXONOMY_LISTING_TYPE_NOT_FOUND"
        ? 404
        : [
              "TAXONOMY_CATEGORY_NOT_PUBLISHABLE",
              "TAXONOMY_LISTING_TYPE_AMBIGUOUS",
              "TAXONOMY_MARKET_UNAVAILABLE",
              "TAXONOMY_SELLER_INELIGIBLE",
            ].includes(error.code)
          ? 409
          : 400;
    throw new AppError({
      code: error.code,
      statusCode,
      message: error.message,
      details: error.field ? { field: error.field } : undefined,
    });
  }
}

export function registerTaxonomyRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/taxonomy/root", PUBLIC, async ({ marketCode }) =>
    (
      await taxonomyService.publicProjection(
        requireApiMarketContext(marketCode),
      )
    ).getRootCategories(),
  );
  routes.addRoute(
    "GET",
    "/taxonomy/nodes/:id",
    PUBLIC,
    async ({ params, marketCode }) =>
      (
        await taxonomyService.publicProjection(
          requireApiMarketContext(marketCode),
        )
      ).getNode(params.id),
  );
  routes.addRoute(
    "GET",
    "/taxonomy/slug/:slug",
    PUBLIC,
    async ({ params, marketCode }) =>
      (
        await taxonomyService.publicProjection(
          requireApiMarketContext(marketCode),
        )
      ).getNode(params.slug),
  );
  routes.addRoute(
    "GET",
    "/taxonomy/nodes/:id/children",
    PUBLIC,
    async ({ params, marketCode }) =>
      (
        await taxonomyService.publicProjection(
          requireApiMarketContext(marketCode),
        )
      ).getChildren(params.id),
  );
  routes.addRoute(
    "GET",
    "/taxonomy/nodes/:id/attributes",
    PUBLIC,
    async ({ params, marketCode }) =>
      (
        await taxonomyService.publicProjection(
          requireApiMarketContext(marketCode),
        )
      ).publicAttributesForCategory(params.id),
  );
  routes.addRoute(
    "GET",
    "/taxonomy/search-filters",
    PUBLIC,
    async ({ query, marketCode }) => {
      const projection = await taxonomyService.publicProjection(
        requireApiMarketContext(marketCode),
      );
      return projection
        .publicAttributesForCategory(query.get("nodeId") || "root")
        .filter((attribute) => attribute.filterable !== false)
        .map((attribute) => ({
          attribute,
          facetType: ["select", "multi_select"].includes(attribute.dataType)
            ? "multi_select"
            : ["number", "year", "range"].includes(attribute.dataType)
              ? "range"
              : attribute.dataType === "boolean"
                ? "boolean"
                : "keyword",
        }));
    },
  );
  routes.addRoute(
    "GET",
    "/taxonomy/header-navigation",
    PUBLIC,
    async ({ marketCode }) =>
      taxonomyService.getHeaderNavigation(
        requireApiMarketContext(marketCode),
        false,
      ),
  );
  routes.addRoute(
    "GET",
    "/taxonomy/v4/tree",
    PUBLIC,
    async ({ marketCode, query }) => {
      requireTaxonomyV4Version(query.get("version"));
      const marketContext = requireApiMarketContext(marketCode);
      const locale = query.get("locale") || marketContext.locale;
      if (!locale || locale.length < 2 || locale.length > 16) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Locale de taxonomie invalide.",
        });
      }
      const taxonomy = await taxonomyV4Service.snapshot(
        query.has("revision")
          ? z.coerce.number().int().positive().parse(query.get("revision"))
          : undefined,
      );
      const items = taxonomyV4Result(() => taxonomy.listTree(marketContext));
      const visibleIds = new Set(items.map((node) => node.id));
      return taxonomyV4Result(() => ({
        ...taxonomy.getMetadata(),
        marketCode: marketContext.countryCode!,
        locale,
        items,
        listingTypes: taxonomy.listListingTypes(marketContext),
        aliases: taxonomy
          .getBundle()
          .aliases.filter((alias) => visibleIds.has(alias.canonicalCategoryId)),
        seo: taxonomy
          .getBundle()
          .projections.seo.filter((row) => visibleIds.has(row.categoryId)),
      }));
    },
  );
  routes.addRoute(
    "GET",
    "/taxonomy/v4/resolve",
    PUBLIC,
    async ({ marketCode, query }) => {
      const categoryIdentity = query.get("category") || "";
      const sellerType = query.get("sellerType");
      const locale = query.get("locale") || "";
      if (!categoryIdentity) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Une catégorie explicite est requise.",
        });
      }
      if (sellerType !== "individual" && sellerType !== "professional") {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Type de vendeur invalide.",
        });
      }
      if (locale.length < 2 || locale.length > 16) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Locale de taxonomie invalide.",
        });
      }
      const intentValue = query.get("intent");
      const intent = intentValue
        ? taxonomyV4ListingIntentSchema.parse(intentValue)
        : undefined;
      const taxonomy = await taxonomyV4Service.snapshot(
        query.has("revision")
          ? z.coerce.number().int().positive().parse(query.get("revision"))
          : undefined,
      );
      return taxonomyV4Result(() =>
        taxonomy.resolve({
          marketContext: requireApiMarketContext(marketCode),
          categoryIdentity,
          listingTypeId: query.get("listingTypeId") || undefined,
          intent,
          sellerType,
          sellerCapabilities: query.getAll("sellerCapability"),
          locale,
          taxonomyVersion: requireTaxonomyV4Version(query.get("version")),
        }),
      );
    },
  );
  routes.addRoute(
    "GET",
    "/taxonomy/v4/options/:optionSetId",
    PUBLIC,
    async ({ marketCode, params, query }) => {
      requireTaxonomyV4Version(query.get("version"));
      const marketContext = requireApiMarketContext(marketCode);
      const taxonomy = await taxonomyV4Service.snapshot(
        query.has("revision")
          ? z.coerce.number().int().positive().parse(query.get("revision"))
          : undefined,
      );
      return taxonomyV4Result(() => {
        // Option availability is taxonomy-version and market scoped even when
        // the current authored option set is shared by all active markets.
        taxonomy.listTree(marketContext);
        return taxonomy.lookupOptions({
          marketContext,
          optionSetId: params.optionSetId,
          parentOptionId: query.get("parentOptionId") || undefined,
          query: query.get("q") || undefined,
          cursor: query.get("cursor") || undefined,
          limit: query.has("limit") ? Number(query.get("limit")) : undefined,
        });
      });
    },
  );
}
