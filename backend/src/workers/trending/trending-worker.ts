import { logger } from "../../infrastructure/logging/logger.js";
import { marketsService } from "../../modules/markets/markets.service.js";
import { trendingService } from "../../modules/trending/trending.service.js";

/**
 * Scheduled refresh entrypoint for the homepage cache.
 *
 * The API remains a read path: this worker is the place to wire Supabase
 * Queues/cron (or the deployment scheduler) so ranking work is paid once per
 * market and never by every homepage request.
 */
export class TrendingWorker {
  async refreshAllMarkets(): Promise<number> {
    const markets = await marketsService.getAllMarkets();
    let refreshed = 0;
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const market of markets.filter((item) => item.isActive !== false)) {
      await trendingService.refreshActivityWindow(
        market.code,
        windowStart.toISOString(),
        windowEnd.toISOString(),
      );
      const response = await trendingService.refreshSection({
        marketCode: market.code,
        limit: 12,
      });
      if (response.topics.length > 0) refreshed += 1;
    }

    logger.info(`Trending Worker refreshed ${refreshed} market cache(s).`);
    return refreshed;
  }
}

export const trendingWorker = new TrendingWorker();
