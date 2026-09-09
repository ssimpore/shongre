import type { MarketContext } from "@shongre/contracts";
import { services } from "../../api/client/service-registry";
import type { Collection, CollectionResolution } from "./collection.types";
import { fetchDiscoveryCollections } from "../../api/adapters/http/http-discovery.service";

const labelFor = (labels: Record<string, string>, locale: string): string =>
  labels[locale] || labels["fr-FR"] || Object.values(labels)[0] || "";

class CollectionService {
  /**
   * One request. This previously fetched the taxonomy tree and then issued a
   * `search(limit: 1)` per root category purely to read a count and a cover
   * image — 19 round-trips on a French homepage, repeated on `/collections`
   * and again during server rendering. The backend owns those inventory facts
   * and now returns the assembled rail in a single bounded response.
   */
  async getCollections(
    marketContext: Pick<MarketContext, "countryCode">,
    locale: string,
  ): Promise<Collection[]> {
    return fetchDiscoveryCollections({
      marketCode: marketContext.countryCode || "",
      locale,
    });
  }

  async getCollection(
    slug: string,
    marketContext: Pick<MarketContext, "countryCode">,
    locale: string,
    limit: number,
  ): Promise<CollectionResolution | null> {
    const tree = await services.taxonomy.getV1Tree({ marketContext, locale });
    const node = tree.items.find(
      (candidate) => !candidate.parentId && candidate.slug === slug,
    );
    if (!node) return null;
    const inventory = await services.search.search({
      marketCode: marketContext.countryCode || "",
      categorySlug: node.slug,
      sortBy: "date_desc",
      limit,
    });
    const coverImageUrl = inventory.items[0]?.coverImageUrl;
    if (!inventory.total || !coverImageUrl) return null;
    const title = labelFor(node.labels, locale);
    const shortTitle = labelFor(node.shortLabels, locale) || title;
    const tags = tree.items
      .filter((candidate) => candidate.parentId === node.id)
      .slice(0, 8)
      .map((candidate) => labelFor(candidate.shortLabels, locale))
      .filter(Boolean);
    return {
      collection: {
        id: node.id,
        slug: node.slug,
        title,
        shortTitle,
        description: node.description || title,
        coverImageUrl,
        tags,
        listingCount: inventory.total,
        itemCountLabel: new Intl.NumberFormat(locale).format(inventory.total),
      },
      listings: inventory.items,
    };
  }
}

export const collectionService = new CollectionService();
