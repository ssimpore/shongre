import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectionService } from "./collection.service";
import { PAGE_SIZES } from "../../configuration/pagination.config";

const api = vi.hoisted(() => ({ tree: vi.fn(), search: vi.fn() }));
vi.mock("../../api/client/service-registry", () => ({
  services: {
    taxonomy: { getV1Tree: api.tree },
    search: { search: api.search },
  },
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

  it("uses API root taxonomy, inventory counts and listing media", async () => {
    api.tree.mockResolvedValue({
      items: [
        root,
        {
          ...root,
          id: "phones",
          slug: "telephones",
          parentId: root.id,
          shortLabels: { "en-GB": "Phones" },
        },
      ],
    });
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
    expect(api.tree).toHaveBeenCalledWith({ marketContext, locale: "en-GB" });
    expect(api.search).toHaveBeenCalledExactlyOnceWith({
      marketCode: "FR",
      categorySlug: root.slug,
      sortBy: "date_desc",
      limit: 1,
    });
  });

  it("does not fabricate a collection when inventory or its image is absent", async () => {
    api.search.mockResolvedValueOnce({ total: 0, items: [] });
    await expect(
      collectionService.getCollections(marketContext, "fr-FR"),
    ).resolves.toEqual([]);
    api.search.mockResolvedValueOnce({
      total: 12,
      items: [{ id: "without-image" }],
    });
    await expect(
      collectionService.getCollections(marketContext, "fr-FR"),
    ).resolves.toEqual([]);
  });

  it("propagates API failures instead of returning fallback data", async () => {
    const error = new Error("API unavailable");
    api.search.mockRejectedValue(error);
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
