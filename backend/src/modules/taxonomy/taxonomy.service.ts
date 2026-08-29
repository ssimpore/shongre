import { Category } from "../../shared/types/index.js";
import {
  taxonomyHeaderNavigationUpdateSchema,
  type MarketContext,
  type TaxonomyHeaderNavigationConfiguration,
  type TaxonomyHeaderNavigationUpdate,
} from "@shongre/contracts";
import {
  ITaxonomyRepository,
  repositories,
  TaxonomyAttribute,
  TaxonomyNode,
  CANONICAL_DEMO_CATEGORIES,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";

export type { TaxonomyAttribute, TaxonomyNode };
export const CANONICAL_CATEGORIES: Category[] = CANONICAL_DEMO_CATEGORIES;

export class TaxonomyService {
  constructor(
    private taxonomyRepo: ITaxonomyRepository = repositories.taxonomy,
  ) {}

  async getRootCategories(): Promise<Category[]> {
    return this.taxonomyRepo.getRootCategories();
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    return this.taxonomyRepo.getNodeById(id);
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    return this.taxonomyRepo.getNodeBySlug(slug);
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    return this.taxonomyRepo.getChildren(nodeId);
  }

  async getAttributesForCategory(
    categoryId: string,
  ): Promise<TaxonomyAttribute[]> {
    return this.taxonomyRepo.getAttributesForCategory(categoryId);
  }

  async resolveSearchFilters(
    nodeId?: string,
  ): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>> {
    const attrs = await this.getAttributesForCategory(nodeId || "root");
    return attrs
      .filter((attribute) => attribute.filterable !== false)
      .map((attribute) => ({
        attribute,
        facetType:
          attribute.dataType === "select" ||
          attribute.dataType === "multi_select"
            ? "multi_select"
            : attribute.dataType === "number" ||
                attribute.dataType === "year" ||
                attribute.dataType === "range"
              ? "range"
              : attribute.dataType === "boolean"
                ? "boolean"
                : "keyword",
      }));
  }

  async getHeaderNavigation(
    marketContext: MarketContext,
    includeInactive = false,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    const marketCode = marketContext.countryCode;
    if (!marketCode) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        statusCode: 400,
        message: "Un marché explicite est requis.",
      });
    }
    if (!includeInactive && marketContext.kind !== "market") {
      throw new AppError({
        code: "CONFLICT",
        statusCode: 409,
        message: "Ce marché n’est pas encore ouvert.",
      });
    }
    const configuration = await this.taxonomyRepo.getHeaderNavigation(
      marketCode,
      includeInactive,
    );
    return {
      ...configuration,
      items: [...configuration.items].sort(
        (left, right) => left.displayOrder - right.displayOrder,
      ),
    };
  }

  async saveHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
    context: {
      marketContext: MarketContext;
      actorProfileId: string;
      requestId?: string;
    },
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    const parsed = taxonomyHeaderNavigationUpdateSchema.parse(input);
    if (parsed.marketCode !== context.marketContext.countryCode) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        statusCode: 400,
        message: "La configuration ne correspond pas au marché demandé.",
      });
    }

    const nodes = await Promise.all(
      parsed.items.map((item) =>
        this.taxonomyRepo.getNodeById(item.categoryId),
      ),
    );
    if (nodes.some((node) => !node || node.parentId)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        statusCode: 400,
        message:
          "Seules les catégories racines de la taxonomie peuvent être affichées dans l’en-tête.",
      });
    }

    await this.taxonomyRepo.replaceHeaderNavigation(
      parsed,
      context.actorProfileId,
      context.requestId,
    );
    return this.getHeaderNavigation(context.marketContext, true);
  }
}

export const taxonomyService = new TaxonomyService();
