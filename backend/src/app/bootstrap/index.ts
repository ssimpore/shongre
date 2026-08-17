import { logger } from '../../infrastructure/logging/logger.js';
import { db } from '../../infrastructure/database/db-client.js';
import { lifecycleWorker } from '../../workers/lifecycle/lifecycle-worker.js';

export async function bootstrapApp(): Promise<void> {
  logger.info('Bootstrapping Shongre Backend Services...');

  // Check database connectivity
  const dbOk = await db.healthCheck();
  if (dbOk) {
    logger.info('Database connection established successfully');
  } else {
    logger.warn('Database health check was non-blocking or offline; proceeding in resilient mode');
  }

  // Schedule background workers (every 1 hour in production, once at startup)
  setInterval(() => {
    lifecycleWorker.runExpiredListingsCleanup().catch((err) => {
      logger.error(`Periodic lifecycle worker failed: ${err.message}`);
    });
    lifecycleWorker.runBoostsExpiration().catch((err) => {
      logger.error(`Periodic boosts expiration worker failed: ${err.message}`);
    });
  }, 60 * 60 * 1000);

  logger.info('Backend bootstrap complete');
}
