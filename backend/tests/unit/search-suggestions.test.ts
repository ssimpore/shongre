import { describe, expect, it } from "vitest";
import { UnifiedDiscoveryService } from "../../src/modules/discovery/discovery.service.js";
import { DemoDiscoveryConfigurationRepository } from "../../src/infrastructure/database/repositories/discovery-configuration.repository.js";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import { requireApiMarketContext } from "../../src/modules/markets/request-market-context.js";
import type { Listing } from "../../src/shared/types/index.js";

function catalogue(
  entries: Array<Partial<Listing> & { id: string }>,
): DemoListingRepository {
  return new DemoListingRepository(
    Object.fromEntries(
      entries.map((entry) => [
        entry.id,
        {
          ...CANONICAL_DEMO_LISTINGS.list_1,
          marketCode: "FR",
          marketPublications: undefined,
          ...entry,
        } as Listing,
      ]),
    ),
  );
}

const service = (repository: DemoListingRepository) =>
  new UnifiedDiscoveryService(
    repository,
    new DemoDiscoveryConfigurationRepository(),
  );

const france = requireApiMarketContext("FR");

describe("search suggestions", () => {
  const repository = catalogue([
    { id: "a", title: "Vélo gravel Canyon Grizl", brand: "Canyon" },
    { id: "b", title: "Vélo électrique urbain Cowboy", brand: "Cowboy" },
    { id: "c", title: "Apple iPhone 15 Pro 128 Go", brand: "Apple" },
    { id: "d", title: "Vélo enfant 16 pouces" },
    { id: "e", title: "Canapé velours vert", status: "sold" },
    { id: "be", title: "Vélo cargo Bruxelles", marketCode: "BE" },
  ]);

  it("completes the last word from the market's catalogue, most common first", async () => {
    const result = await service(repository).suggest({
      marketContext: france,
      query: "vel",
      locale: "fr-FR",
    });
    const terms = result.items.filter((item) => item.kind === "term");
    expect(terms.map((item) => item.query)).toEqual(["vélo"]);
    expect(terms[0]).toMatchObject({ listingCount: 3 });
  });

  it("keeps the words before the one being typed", async () => {
    const result = await service(repository).suggest({
      marketContext: france,
      query: "iphone 15 pr",
      locale: "fr-FR",
    });
    expect(
      result.items.filter((item) => item.kind === "term").map((i) => i.query),
    ).toEqual(["iphone 15 pro"]);
  });

  it("completes a misspelt word to a word the catalogue contains", async () => {
    const result = await service(repository).suggest({
      marketContext: france,
      query: "ipone",
      locale: "fr-FR",
    });
    expect(
      result.items.filter((item) => item.kind === "term").map((i) => i.query),
    ).toEqual(["iphone"]);
  });

  it("offers published categories whose label starts with the text", async () => {
    const result = await service(repository).suggest({
      marketContext: france,
      query: "véhi",
      locale: "fr-FR",
    });
    const categories = result.items.filter((item) => item.kind === "category");
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toMatchObject({
      categorySlug: "vehicules",
      label: "Véhicules",
    });
    expect(categories[0]).toHaveProperty("iconName");
    // Categories lead so a visitor who typed a rayon reaches it in one move.
    expect(result.items[0].kind).toBe("category");
  });

  it("never suggests across markets or from unpublished listings", async () => {
    const result = await service(repository).suggest({
      marketContext: france,
      query: "ca",
      locale: "fr-FR",
    });
    const terms = result.items
      .filter((item) => item.kind === "term")
      .map((item) => item.query);
    expect(terms).toContain("canyon");
    expect(terms).not.toContain("cargo");
    expect(terms).not.toContain("canapé");
  });

  it("answers nothing for an empty query", async () => {
    await expect(
      service(repository).suggest({
        marketContext: france,
        query: "   ",
        locale: "fr-FR",
      }),
    ).resolves.toEqual({ items: [] });
  });
});

describe("did you mean", () => {
  const repository = catalogue([
    { id: "a", title: "Vélo gravel Canyon Grizl", brand: "Canyon" },
    { id: "c", title: "Apple iPhone 15 Pro 128 Go", brand: "Apple" },
  ]);

  it("proposes the nearest known spelling when a query finds nothing", async () => {
    const result = await service(repository).search({
      marketCode: "FR",
      query: "ipone 15",
    });
    expect(result.items).toEqual([]);
    expect(result.didYouMean).toBe("iphone 15");
  });

  it("offers nothing when the query matched or cannot be corrected", async () => {
    const matched = await service(repository).search({
      marketCode: "FR",
      query: "iphone",
    });
    expect(matched.items).toHaveLength(1);
    expect(matched.didYouMean).toBeUndefined();

    const hopeless = await service(repository).search({
      marketCode: "FR",
      query: "xqzwv",
    });
    expect(hopeless.items).toEqual([]);
    expect(hopeless.didYouMean).toBeUndefined();
  });

  it("does not second-guess a query whose only unknown word is a stopword", async () => {
    const result = await service(repository).search({
      marketCode: "FR",
      query: "trottinette avec",
    });
    expect(result.didYouMean).toBeUndefined();
  });
});
