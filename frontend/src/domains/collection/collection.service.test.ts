import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectionService } from "./collection.service";
import { PAGE_SIZES } from "../../configuration/pagination.config";

const api = vi.hoisted(() => ({
  tree: vi.fn(),
  search: vi.fn(),
  collections: vi.fn(),
}));
vi.mock("../../api/client/service-registry", () => ({
  services: {
    taxonomy: { getV1Tree: api.tree },
    search: { search: api.search },
  },
}));
// The collection rail is now one backend projection instead of a per-root
// search fan-out; the detail page still resolves through taxonomy + search.
vi.mock("../../api/adapters/http/http-discovery.service", () => ({
  fetchDiscoveryCollections: api.collections,
}));

const marketContext = { countryCode: "FR" };
const root = {
  id: "electronics",
  slug: "electronique",
  parentId: null,
  labels: { "fr-FR": "Électronique", "en-GB": "Electronics" },
  shortLabels: {},
  description: "",
};
const listing = {
  id: "api-listing",
  title: "Published listing",
  coverImageUrl: "https://media.example.test/listing.jpg",
};

describe("API-driven collections", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.tree.mockResolvedValue({ items: [root] });
    api.search.mockResolvedValue({ total: 12, items: [listing] });
    api.collections.mockResolvedValue([
      {
        id: root.id,
        slug: root.slug,
        title: "Electronics",
        shortTitle: "Electronics",
        description: "Electronics",
        coverImageUrl: listing.coverImageUrl,
        tags: ["Phones"],
        listingCount: 12,
        itemCountLabel: "12",
      },
    ]);
  });

  it("keeps the shared browser and SSR page size within the search API contract", async () => {
    // The canonical GET /listings/search contract accepts limits from 1 to 50.
    api.search.mockImplementation(async ({ limit }: { limit: number }) => {
      if (limit < 1 || limit > 50) throw new Error("Invalid search page size");
      return { total: 12, items: [listing] };
    });
    await expect(
      collectionService.getCollection(
        root.slug,
        marketContext,
        "fr-FR",
        PAGE_SIZES.collectionListings,
      ),
    ).resolves.toMatchObject({ listings: [listing] });
  });

  it("reads the rail from one backend projection, not a per-root fan-out", async () => {
    const collections = await collectionService.getCollections(
      marketContext,
      "en-GB",
    );
    expect(collections).toEqual([
      expect.objectContaining({
        id: root.id,
        slug: root.slug,
        title: "Electronics",
        listingCount: 12,
        itemCountLabel: "12",
        coverImageUrl: listing.coverImageUrl,
        tags: ["Phones"],
      }),
    ]);
    expect(api.collections).toHaveBeenCalledExactlyOnceWith({
      marketCode: "FR",
      locale: "en-GB",
    });
    // The regression this replaced: one taxonomy read plus one search request
    // for every root category, from the browser, on every render.
    expect(api.search).not.toHaveBeenCalled();
    expect(api.tree).not.toHaveBeenCalled();
  });

  it("does not fabricate a collection when the projection returns none", async () => {
    api.collections.mockResolvedValueOnce([]);
    await expect(
      collectionService.getCollections(marketContext, "fr-FR"),
    ).resolves.toEqual([]);
  });

  it("propagates API failures instead of returning fallback data", async () => {
    const error = new Error("API unavailable");
    api.search.mockRejectedValue(error);
    api.collections.mockRejectedValue(error);
    await expect(
      collectionService.getCollections(marketContext, "fr-FR"),
    ).rejects.toBe(error);
    await expect(
      collectionService.getCollection(root.slug, marketContext, "fr-FR", 24),
    ).rejects.toBe(error);
  });

  it("does not resolve an obsolete editorial slug absent from API taxonomy", async () => {
    await expect(
      collectionService.getCollection(
        "pepites-semaine",
        marketContext,
        "fr-FR",
        24,
      ),
    ).resolves.toBeNull();
    expect(api.search).not.toHaveBeenCalled();
  });

  it("resolves collection details from the same API inventory", async () => {
    await expect(
      collectionService.getCollection(root.slug, marketContext, "fr-FR", 24),
    ).resolves.toEqual({
      collection: expect.objectContaining({
        slug: root.slug,
        title: "Électronique",
        listingCount: 12,
      }),
      listings: [listing],
    });
    expect(api.search).toHaveBeenCalledExactlyOnceWith({
      marketCode: "FR",
      categorySlug: root.slug,
      sortBy: "date_desc",
      limit: 24,
    });
  });
});
