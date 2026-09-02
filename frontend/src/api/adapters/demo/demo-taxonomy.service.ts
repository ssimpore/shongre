import { TaxonomyServiceContract } from "../../contracts/taxonomy.contract";
import { Category } from "../../../types";
import {
  TaxonomyNode,
  TaxonomyAttribute,
} from "../../../domains/taxonomy/taxonomy.types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { CANONICAL_TAXONOMY_IDENTITIES } from "@shongre/contracts/taxonomy-catalog";
import {
  taxonomyHeaderNavigationUpdateSchema,
  type MarketContext,
  type TaxonomyV4PublicResolver,
  type TaxonomyHeaderNavigationConfiguration,
  type TaxonomyHeaderNavigationUpdate,
  type ResolveTaxonomyV4PublicInput,
  type TaxonomyV4OptionPage,
  type TaxonomyV4ResolvedSchema,
  type TaxonomyV4TreeResponse,
} from "@shongre/contracts";
import { storageService } from "../../../services/storage.service";
import {
  requireDemoAnyCapability,
  requireDemoCapability,
} from "./demo-authorization";
import { DEFAULT_HEADER_CATEGORY_IDS } from "../../../domains/taxonomy/taxonomy-header.defaults";

const HEADER_NAVIGATION_STORAGE_KEY = "shongre_taxonomy_header_navigation:v1";
interface StoredHeaderNavigation {
  revision: number;
  updatedAt: string | null;
  items: TaxonomyHeaderNavigationUpdate["items"];
}

const DEFAULT_HEADER_NAVIGATION = Object.fromEntries(
  ["FR", "BE", "CH"].map((marketCode) => [
    marketCode,
    {
      revision: 1,
      updatedAt: "2026-08-01T08:00:00.000Z",
      items: DEFAULT_HEADER_CATEGORY_IDS.map((categoryId, displayOrder) => ({
        categoryId,
        isActive: true,
        displayOrder,
      })),
    } satisfies StoredHeaderNavigation,
  ]),
) as Record<string, StoredHeaderNavigation>;

const headerCategoryById = new Map(
  CANONICAL_TAXONOMY_IDENTITIES.filter((item) => !item.parentId).map((item) => [
    item.id,
    item,
  ]),
);

const loadLegacyTaxonomy = () =>
  import("../../../domains/taxonomy/taxonomy.service").then(
    ({ taxonomyService }) => taxonomyService,
  );

let taxonomyV4ResolverPromise: Promise<TaxonomyV4PublicResolver> | undefined;
const loadTaxonomyV4Resolver = () =>
  (taxonomyV4ResolverPromise ??= Promise.all([
    import("@shongre/contracts/taxonomy-v4-public"),
    import("@shongre/contracts/taxonomy-v4-resolver"),
  ]).then(
    ([{ getTaxonomyV4PublicBundle }, { TaxonomyV4PublicResolver }]) =>
      new TaxonomyV4PublicResolver(getTaxonomyV4PublicBundle()),
  ));

function getStoredHeaderNavigation(): Record<string, StoredHeaderNavigation> {
  return storageService.get(
    HEADER_NAVIGATION_STORAGE_KEY,
    DEFAULT_HEADER_NAVIGATION,
  );
}

function projectHeaderNavigation(
  marketCode: string,
  includeInactive: boolean,
): TaxonomyHeaderNavigationConfiguration {
  const stored = getStoredHeaderNavigation()[marketCode] ?? {
    revision: 0,
    updatedAt: null,
    items: [],
  };
  return {
    marketCode,
    revision: stored.revision,
    updatedAt: stored.updatedAt,
    items: stored.items
      .flatMap((item) => {
        const category = headerCategoryById.get(item.categoryId);
        if (
          !category ||
          category.parentId ||
          (!includeInactive && !item.isActive)
        ) {
          return [];
        }
        return [
          {
            categoryId: category.id,
            slug: category.slug,
            labels: category.labels,
            shortLabels: category.shortLabels ?? category.labels,
            iconName: category.iconName,
            isActive: item.isActive,
            displayOrder: item.displayOrder,
          },
        ];
      })
      .sort((left, right) => left.displayOrder - right.displayOrder),
  };
}

export class DemoTaxonomyService implements TaxonomyServiceContract {
  private requireReadAccess() {
    requireDemoAnyCapability(["listing.read", "taxonomy.manage"]);
  }

  async getRootCategories(): Promise<Category[]> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyService = await loadLegacyTaxonomy();
    return taxonomyService.getRootCategories() as any;
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyService = await loadLegacyTaxonomy();
    return taxonomyService.getNode(id) || null;
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyService = await loadLegacyTaxonomy();
    return taxonomyService.getNodeBySlug(slug) || null;
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyService = await loadLegacyTaxonomy();
    return taxonomyService.getChildren(nodeId);
  }

  async getAttributesForCategory(
    categoryId: string,
  ): Promise<TaxonomyAttribute[]> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyService = await loadLegacyTaxonomy();
    const schema = taxonomyService.resolvePublicationSchema(categoryId);
    return schema?.attributes ?? [];
  }

  async resolveSearchFilters(nodeId?: string): Promise<any[]> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyService = await loadLegacyTaxonomy();
    return taxonomyService.resolveSearchFilters(nodeId);
  }

  async getHeaderNavigation(
    marketContext: MarketContext,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    if (!marketContext.countryCode) {
      throw new Error("Un marché explicite est requis.");
    }
    if (marketContext.kind !== "market") {
      throw new Error("Ce marché n’est pas encore ouvert.");
    }
    return projectHeaderNavigation(marketContext.countryCode, false);
  }

  async getAdminHeaderNavigation(
    marketContext: MarketContext,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    requireDemoCapability("taxonomy.manage");
    await simulateNetworkDelay();
    if (!marketContext.countryCode) {
      throw new Error("Un marché explicite est requis.");
    }
    return projectHeaderNavigation(marketContext.countryCode, true);
  }

  async saveHeaderNavigation(
    input: TaxonomyHeaderNavigationUpdate,
  ): Promise<TaxonomyHeaderNavigationConfiguration> {
    requireDemoCapability("taxonomy.manage");
    await simulateNetworkDelay();
    const parsed = taxonomyHeaderNavigationUpdateSchema.parse(input);
    const storedByMarket = getStoredHeaderNavigation();
    const current = storedByMarket[parsed.marketCode];
    if ((current?.revision ?? 0) !== parsed.expectedRevision) {
      throw new Error(
        "La configuration a été modifiée. Rechargez-la avant de réessayer.",
      );
    }

    const { getTaxonomyV4PublicBundle } =
      await import("@shongre/contracts/taxonomy-v4-public");
    const categoryById = new Map(
      getTaxonomyV4PublicBundle().categories.map((category) => [
        category.id,
        category,
      ]),
    );
    parsed.items.forEach((item) => {
      const category = categoryById.get(item.categoryId);
      const availability = category?.marketAvailability.find(
        (entry) => entry.marketCode === parsed.marketCode,
      );
      if (!category || category.parentId) {
        throw new Error(
          "Seules les catégories racines peuvent apparaître dans l’en-tête.",
        );
      }
      if (
        item.isActive &&
        (category.status !== "active" || !availability?.marketplaceEnabled)
      ) {
        throw new Error(
          "Une catégorie active doit être disponible sur le marché sélectionné.",
        );
      }
    });

    storageService.set(HEADER_NAVIGATION_STORAGE_KEY, {
      ...storedByMarket,
      [parsed.marketCode]: {
        revision: parsed.expectedRevision + 1,
        updatedAt: new Date().toISOString(),
        items: parsed.items,
      },
    });
    return projectHeaderNavigation(parsed.marketCode, true);
  }

  async getV4Tree(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    locale: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4TreeResponse> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyV4Resolver = await loadTaxonomyV4Resolver();
    return taxonomyV4Resolver.tree(
      input.marketContext,
      input.locale,
      input.taxonomyVersion,
    );
  }

  async resolveV4(
    input: ResolveTaxonomyV4PublicInput,
  ): Promise<TaxonomyV4ResolvedSchema> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyV4Resolver = await loadTaxonomyV4Resolver();
    return taxonomyV4Resolver.resolve(input);
  }

  async lookupV4Options(input: {
    marketContext: ResolveTaxonomyV4PublicInput["marketContext"];
    optionSetId: string;
    parentOptionId?: string;
    query?: string;
    cursor?: string;
    limit?: number;
    locale?: string;
    taxonomyVersion?: string;
  }): Promise<TaxonomyV4OptionPage> {
    this.requireReadAccess();
    await simulateNetworkDelay();
    const taxonomyV4Resolver = await loadTaxonomyV4Resolver();
    taxonomyV4Resolver.tree(input.marketContext, input.locale ?? "fr-FR");
    return taxonomyV4Resolver.lookupOptions(input);
  }
}

export const demoTaxonomyService = new DemoTaxonomyService();
