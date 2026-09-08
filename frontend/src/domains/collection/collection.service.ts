import type { MarketContext } from "@shongre/contracts";
import { services } from "../../api/client/service-registry";
import type { Collection, CollectionResolution } from "./collection.types";

const labelFor = (labels: Record<string, string>, locale: string): string =>
  labels[locale] || labels["fr-FR"] || Object.values(labels)[0] || "";

class CollectionService {
  async getCollections(
    marketContext: Pick<MarketContext, "countryCode">,
    locale: string,
  ): Promise<Collection[]> {
    const tree = await services.taxonomy.getV1Tree({ marketContext, locale });
    const roots = tree.items.filter((node) => !node.parentId);
    const results = await Promise.all(
      roots.map(async (node): Promise<Collection | null> => {
        const inventory = await services.search.search({
          marketCode: marketContext.countryCode || "",
          categorySlug: node.slug,
          sortBy: "date_desc",
          limit: 1,
        });
        const coverImageUrl = inventory.items[0]?.coverImageUrl;
        if (!inventory.total || !coverImageUrl) return null;
        const title = labelFor(node.labels, locale);
        const shortTitle = labelFor(node.shortLabels, locale) || title;
        const tags = tree.items
          .filter((candidate) => candidate.parentId === node.id)
          .slice(0, 4)
          .map((candidate) => labelFor(candidate.shortLabels, locale))
          .filter(Boolean);
        return {
          id: node.id,
          slug: node.slug,
          title,
          shortTitle,
          description: node.description || title,
          coverImageUrl,
          tags,
          listingCount: inventory.total,
          itemCountLabel: new Intl.NumberFormat(locale).format(inventory.total),
        };
      }),
    );
    return results.filter((item): item is Collection => item !== null);
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
