import { logger } from "../../infrastructure/logging/logger.js";
import { db } from "../../infrastructure/database/db-client.js";
import { lifecycleWorker } from "../../workers/lifecycle/lifecycle-worker.js";
import { seedDemoCredentials } from "./seed-demo-credentials.js";
import { providerDataDeletionWorker } from "../../workers/auth/provider-data-deletion-worker.js";
import { commercialConfigurationWorker } from "../../workers/monetization/commercial-configuration-worker.js";
import { monetizationLifecycleWorker } from "../../workers/monetization/monetization-lifecycle-worker.js";

export async function bootstrapApp(): Promise<void> {
  logger.info("Bootstrapping Shongre Backend Services...");

  // Demo personas need password hashes now that login actually verifies them.
  await seedDemoCredentials();

  // Check database connectivity
  const dbOk = await db.healthCheck();
  if (dbOk) {
    logger.info("Database connection established successfully");
  } else {
    logger.warn(
      "Database health check was non-blocking or offline; proceeding in resilient mode",
    );
  }

  // Schedule background workers (every 1 hour in production, once at startup)
  await providerDataDeletionWorker.run().catch((err) => {
    logger.error(
      `Provider data-deletion worker failed at startup: ${err.message}`,
    );
  });
  await commercialConfigurationWorker.run().catch((err) => {
    logger.error(
      `Commercial configuration worker failed at startup: ${err.message}`,
    );
  });
  await monetizationLifecycleWorker.run().catch((err) => {
    logger.error(
      `Monetization lifecycle worker failed at startup: ${err.message}`,
    );
  });
  setInterval(() => {
    commercialConfigurationWorker.run().catch((err) => {
      logger.error(`Commercial configuration worker failed: ${err.message}`);
    });
  }, 60 * 1000);
  setInterval(
    () => {
      monetizationLifecycleWorker.run().catch((err) => {
        logger.error(`Monetization lifecycle worker failed: ${err.message}`);
      });
    },
    5 * 60 * 1000,
  );
  setInterval(
    () => {
      lifecycleWorker.runExpiredListingsCleanup().catch((err) => {
        logger.error(`Periodic lifecycle worker failed: ${err.message}`);
      });
      lifecycleWorker.runBoostsExpiration().catch((err) => {
        logger.error(
          `Periodic boosts expiration worker failed: ${err.message}`,
        );
      });
      providerDataDeletionWorker.run().catch((err) => {
        logger.error(
          `Periodic provider data-deletion worker failed: ${err.message}`,
        );
      });
    },
    60 * 60 * 1000,
  );

  logger.info("Backend bootstrap complete");
}
