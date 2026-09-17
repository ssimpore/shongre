import {
  repositories,
  type IListingRepository,
  type IMarketRepository,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";

/**
 * Rebuilds each active market's search vocabulary (migration 00142), which
 * backs `GET /listings/suggestions` and the "did you mean" correction.
 *
 * A full rebuild per market is deliberate: the vocabulary is a small
 * projection of titles, brands and models, and rebuilding it is cheaper and
 * simpler than tracking which words each publication change added or removed.
 * Markets are refreshed one at a time so a failure in one cannot block the
 * others.
 */
export class SearchVocabularyWorker {
  constructor(
    private readonly listings: IListingRepository = repositories.listings,
    private readonly markets: IMarketRepository = repositories.markets,
  ) {}

  async run(): Promise<{ refreshedMarkets: number; terms: number }> {
    const markets = (await this.markets.getAll()).filter(
      (market) => market.isActive,
    );
    let refreshedMarkets = 0;
    let terms = 0;
    for (const market of markets) {
      try {
        terms += await this.listings.refreshSearchVocabulary(market.code);
        refreshedMarkets += 1;
      } catch (error) {
        logger.error("search_vocabulary_refresh_failed", {
          marketCode: market.code,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
    logger.info("search_vocabulary_refresh_completed", {
      refreshedMarkets,
      terms,
    });
    return { refreshedMarkets, terms };
  }
}

export const searchVocabularyWorker = new SearchVocabularyWorker();
