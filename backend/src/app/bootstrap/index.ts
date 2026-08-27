import { logger } from "../../infrastructure/logging/logger.js";
import { db } from "../../infrastructure/database/db-client.js";
import { seedDemoCredentials } from "./seed-demo-credentials.js";
import { config } from "../config/index.js";
import { initializeSentry } from "../../infrastructure/observability/sentry.js";

export async function bootstrapApp(): Promise<void> {
  initializeSentry();
  logger.info("Bootstrapping Shongre Backend Services...");

  // Demo personas must never be materialized by a production process.
  if (config.dataMode === "demo") await seedDemoCredentials();

  // Check database connectivity
  const dbOk = await db.healthCheck();
  if (dbOk) {
    logger.info("Database connection established successfully");
  } else {
    if (config.nodeEnv === "production") {
      throw new Error("Database readiness check failed during startup");
    }
    logger.warn(
      "Database health check was non-blocking or offline; proceeding in resilient mode",
    );
  }

  logger.info("Backend bootstrap complete");
}
