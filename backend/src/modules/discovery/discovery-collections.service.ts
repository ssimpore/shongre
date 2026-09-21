import type { MarketContext } from "@shongre/contracts/market-country";
import { taxonomyV1Service } from "../taxonomy/taxonomy.runtime.js";
import type { TaxonomyV1Node } from "@shongre/contracts/taxonomy";
import {
  repositories,
  type RepositoryContainer,
} from "../../infrastructure/database/repositories/repository-container.js";
import type { TaxonomyV1Service } from "../taxonomy/taxonomy.v1.service.js";

export interface DiscoveryCollection {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  coverImageUrl: string;
  tags: string[];
  listingCount: number;
}

export interface DiscoveryCollectionPage {
  collections: DiscoveryCollection[];
  taxonomyRevision: number;
}

/** At most four child labels are shown as tags on a collection card. */
const COLLECTION_TAG_LIMIT = 4;

function labelFor(
  labels: Record<string, string> | undefined,
  locale: string,
): string {
  if (!labels) return "";
  return labels[locale] || labels["fr-FR"] || Object.values(labels)[0] || "";
}

/**
 * Assembles the collection rail for a market.
 *
 * This used to run in the browser: the client fetched the taxonomy tree, then
 * issued one `search(limit: 1)` per root category purely to read a count and a
 * cover image — 19 requests on a French homepage, repeated on `/collections`
 * and again during server rendering. The work itself is small; what made it
 * expensive was doing it one HTTP round-trip at a time from the client. The
 * backend now resolves every root through one database aggregation, and the
 * whole rail remains one bounded public response.
 */
export class DiscoveryCollectionsService {
  constructor(
    private readonly listings: RepositoryContainer["listings"] = repositories.listings,
    private readonly taxonomyProvider: {
      snapshot(): Promise<TaxonomyV1Service>;
    } = taxonomyV1Service,
  ) {}

  async getCollections(
    marketContext: MarketContext,
    locale: string,
  ): Promise<DiscoveryCollectionPage> {
    const marketCode = marketContext.countryCode;
    if (!marketCode) {
      return { collections: [], taxonomyRevision: 0 };
    }
    const taxonomy = await this.taxonomyProvider.snapshot();
    const items = taxonomy.listTree(marketContext);
    const roots = items.filter((node: TaxonomyV1Node) => !node.parentId);
    const inventory = await this.listings.getDiscoveryCollectionInventory({
      marketCode,
      groups: roots.map((root) => ({
        rootId: root.id,
        categoryIds: taxonomy
          .getBundle()
          .categories.filter((category) =>
            taxonomy.isDescendant(category.id, root.id),
          )
          .map((category) => category.id),
      })),
    });
    const inventoryByRoot = new Map(
      inventory.map((entry) => [entry.rootId, entry] as const),
    );
    const resolved = roots.map(
      (node: TaxonomyV1Node): DiscoveryCollection | null => {
        const rootInventory = inventoryByRoot.get(node.id);
        // A collection with no eligible inventory or no artwork is omitted
        // rather than rendered as an empty card with a placeholder.
        if (!rootInventory?.listingCount || !rootInventory.coverImageUrl)
          return null;
        const title = labelFor(node.labels, locale);
        return {
          id: node.id,
          slug: node.slug,
          title,
          shortTitle: labelFor(node.shortLabels, locale) || title,
          description: node.description || title,
          coverImageUrl: rootInventory.coverImageUrl,
          tags: items
            .filter(
              (candidate: TaxonomyV1Node) => candidate.parentId === node.id,
            )
            .slice(0, COLLECTION_TAG_LIMIT)
            .map((candidate: TaxonomyV1Node) =>
              labelFor(candidate.shortLabels, locale),
            )
            .filter(Boolean),
          listingCount: rootInventory.listingCount,
        };
      },
    );

    return {
      collections: resolved.filter(
        (
          collection: DiscoveryCollection | null,
        ): collection is DiscoveryCollection => collection !== null,
      ),
      taxonomyRevision: taxonomy.getMetadata().revision,
    };
  }
}

export const discoveryCollectionsService = new DiscoveryCollectionsService();
