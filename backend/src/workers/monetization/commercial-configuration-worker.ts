import { logger } from '../../infrastructure/logging/logger.js';
import { businessRulesService } from '../../modules/business-rules/business-rules.service.js';

export class CommercialConfigurationWorker {
  async run() {
    const activated = await businessRulesService.activateScheduledConfigurations();
    if (activated > 0) {
      logger.info('Commercial configuration schedules activated', { activated });
    }
    return { activated };
  }
}

export const commercialConfigurationWorker = new CommercialConfigurationWorker();
