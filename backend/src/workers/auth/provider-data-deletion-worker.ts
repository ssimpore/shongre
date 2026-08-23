import { logger } from "../../infrastructure/logging/logger.js";
import { facebookDataDeletionService } from "../../modules/auth/facebook-data-deletion.service.js";

export class ProviderDataDeletionWorker {
  async run(): Promise<{ completed: number; pending: number }> {
    const result = await facebookDataDeletionService.processQueued();
    if (result.completed || result.pending) {
      logger.info(
        `Provider data-deletion worker completed ${result.completed}; ${result.pending} remain queued.`,
      );
    }
    return result;
  }
}

export const providerDataDeletionWorker = new ProviderDataDeletionWorker();
