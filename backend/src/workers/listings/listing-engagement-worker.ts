import {
  repositories,
  type IListingRepository,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";

/**
 * Applies `listing_viewed` analytics events to the listing view counter the
 * seller workspace and the discovery quality signals read.
 *
 * The database owns the watermark and the batch bound, so this worker only has
 * to keep calling until a pass reports no work: a replica that dies mid-batch
 * loses nothing, and two replicas cannot double-count.
 */
export class ListingEngagementWorker {
  constructor(
    private readonly listings: IListingRepository = repositories.listings,
    private readonly batchSize = 5_000,
    private readonly maxBatchesPerRun = 5,
  ) {}

  async run(): Promise<{ processedEvents: number; updatedListings: number }> {
    let processedEvents = 0;
    let updatedListings = 0;
    for (let pass = 0; pass < this.maxBatchesPerRun; pass += 1) {
      const result = await this.listings.rollUpViewCounts(this.batchSize);
      processedEvents += result.processedEvents;
      updatedListings += result.updatedListings;
      if (result.processedEvents < this.batchSize) break;
    }
    if (processedEvents > 0) {
      logger.info("listing_view_rollup_completed", {
        processedEvents,
        updatedListings,
      });
    }
    return { processedEvents, updatedListings };
  }
}

export const listingEngagementWorker = new ListingEngagementWorker();
