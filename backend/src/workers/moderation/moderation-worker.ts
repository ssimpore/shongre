import { logger } from "../../infrastructure/logging/logger.js";
import { providers } from "../../integrations/providers/provider-container.js";

export class ModerationWorker {
  async evaluateListing(
    listingId: string,
    title: string,
    description: string,
    price: number,
  ) {
    logger.info("Running automated listing moderation screening", {
      listingId,
    });
    const assessment = await providers.ai.analyzeListingContent(
      title,
      description,
      price,
    );
    return assessment;
  }
}

export const moderationWorker = new ModerationWorker();
