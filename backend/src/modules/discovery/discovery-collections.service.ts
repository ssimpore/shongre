import type { MarketContext } from "@shongre/contracts/market-country";
import { taxonomyV1Service } from "../taxonomy/taxonomy.runtime.js";
import type { TaxonomyV1Node } from "@shongre/contracts/taxonomy";
import { listingsService } from "../listings/listings.service.js";

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
 * expensive was doing it one HTTP round-trip at a time from the client. Here
 * the per-root reads are local and parallel, and the whole rail is one bounded
 * public response.
 */
export class DiscoveryCollectionsService {
  async getCollections(
    marketContext: MarketContext,
    locale: string,
  ): Promise<DiscoveryCollectionPage> {
    const marketCode = marketContext.countryCode;
    if (!marketCode) {
      return { collections: [], taxonomyRevision: 0 };
    }
    const taxonomy = await taxonomyV1Service.snapshot();
    const items = taxonomy.listTree(marketContext);
    const roots = items.filter((node: TaxonomyV1Node) => !node.parentId);

    const resolved = await Promise.all(
      roots.map(
        async (node: TaxonomyV1Node): Promise<DiscoveryCollection | null> => {
          const inventory = await listingsService.searchListings({
            marketCode,
            categorySlug: node.slug,
            sortBy: "date_desc",
            limit: 1,
          });
          // The public projection exposes ordered media; the first is the cover.
          const coverImageUrl = inventory.items[0]?.images?.[0];
          // A collection with no eligible inventory or no artwork is omitted
          // rather than rendered as an empty card with a placeholder.
          if (!inventory.total || !coverImageUrl) return null;
          const title = labelFor(node.labels, locale);
          return {
            id: node.id,
            slug: node.slug,
            title,
            shortTitle: labelFor(node.shortLabels, locale) || title,
            description: node.description || title,
            coverImageUrl,
            tags: items
              .filter(
                (candidate: TaxonomyV1Node) => candidate.parentId === node.id,
              )
              .slice(0, COLLECTION_TAG_LIMIT)
              .map((candidate: TaxonomyV1Node) =>
                labelFor(candidate.shortLabels, locale),
              )
              .filter(Boolean),
            listingCount: inventory.total,
          };
        },
      ),
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
