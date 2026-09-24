import { describe, expect, it, vi } from "vitest";
import { SearchVocabularyWorker } from "../../src/workers/search/search-vocabulary-worker.js";
import type {
  IListingRepository,
  IMarketRepository,
} from "../../src/infrastructure/database/repositories/index.js";

function worker(refresh: (marketCode: string) => Promise<number>) {
  const markets = {
    getAll: async () => [
      { code: "FR", isActive: true },
      { code: "BE", isActive: true },
      { code: "SN", isActive: false },
    ],
  } as unknown as IMarketRepository;
  const listings = {
    refreshSearchVocabulary: vi.fn(refresh),
  } as unknown as IListingRepository;
  return {
    run: () => new SearchVocabularyWorker(listings, markets).run(),
    listings,
  };
}

describe("search vocabulary worker", () => {
  it("rebuilds every active market", async () => {
    const { run, listings } = worker(async () => 12);
    await expect(run()).resolves.toEqual({ refreshedMarkets: 2, terms: 24 });
    expect(listings.refreshSearchVocabulary).toHaveBeenCalledTimes(2);
  });

  it("attempts every market before failing the run for the one that broke", async () => {
    const { run, listings } = worker(async (marketCode) => {
      if (marketCode === "FR") throw new Error("statement timeout");
      return 7;
    });
    await expect(run()).rejects.toThrow(
      "Search vocabulary refresh failed for FR.",
    );
    expect(listings.refreshSearchVocabulary).toHaveBeenCalledWith("BE");
  });
});
