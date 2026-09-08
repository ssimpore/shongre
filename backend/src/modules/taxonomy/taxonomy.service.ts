import { taxonomyV1Service } from "./taxonomy.runtime.js";
import { createTaxonomyProjection } from "../../infrastructure/database/repositories/taxonomy.projection.js";
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
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";

export type { TaxonomyAttribute, TaxonomyNode };

export class TaxonomyService {
  constructor(
    private taxonomyRepo: ITaxonomyRepository = repositories.taxonomy,
  ) {}

  async publicProjection(context: MarketContext) {
    if (context.kind !== "market")
      throw new AppError({
        code: "CONFLICT",
        statusCode: 409,
        message: "Ce marché n’est pas encore ouvert.",
      });
    const snapshot = await taxonomyV1Service.snapshot();
    const bundle = snapshot.getBundle();
    return createTaxonomyProjection({
      ...bundle,
      categories: snapshot.listTree(context),
      listingTypes: snapshot.listListingTypes(context),
      attributes: bundle.attributes.filter((field) =>
        field.marketAvailability.some(
          (market) =>
            market.marketCode === context.countryCode &&
            market.status === "active" &&
            market.marketplaceEnabled,
        ),
      ),
    });
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
    if (
      parsed.links?.some((link) => link.isActive) &&
      context.marketContext.kind !== "market"
    ) {
      throw new AppError({
        code: "CONFLICT",
        statusCode: 409,
        message: "Ce marché n’est pas encore ouvert.",
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
