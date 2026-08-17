import { logger } from '../../infrastructure/logging/logger.js';
import { geminiClient } from '../../integrations/ai/gemini-client.js';

export class ModerationWorker {
  async evaluateListing(listingId: string, title: string, description: string, price: number) {
    logger.info(`Running AI Moderation screening for listing ${listingId}`);
    const assessment = await geminiClient.analyzeListingContent(title, description, price);
    return assessment;
  }
}

export const moderationWorker = new ModerationWorker();
