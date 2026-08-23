import {
  repositories,
  CANONICAL_DEMO_USERS,
} from "../../infrastructure/database/repositories/index.js";
import { hashPassword } from "../../shared/auth/password.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { config } from "../config/index.js";

/**
 * The shared password for the seeded demo personas.
 *
 * Overridable so a shared staging environment does not run on a password
 * documented in the repository.
 */
export const DEMO_ACCOUNT_PASSWORD =
  process.env.DEMO_ACCOUNT_PASSWORD || "ShongreDemo2024!";

/**
 * Gives the canonical demo personas a real password hash.
 *
 * Login now verifies credentials, so the seeded accounts need credentials to
 * verify against or demo mode would have no way in. This runs only outside
 * production: seeding known-password accounts into a production database would
 * hand out working logins, including the admin persona.
 */
export async function seedDemoCredentials(): Promise<void> {
  if (config.nodeEnv === "production") {
    logger.info("Skipping demo credential seeding in production");
    return;
  }

  const hash = await hashPassword(DEMO_ACCOUNT_PASSWORD);
  let seeded = 0;

  for (const user of Object.values(CANONICAL_DEMO_USERS)) {
    try {
      const existing = await repositories.users.findCredentialByUserId(user.id);
      if (existing) continue;
      await repositories.users.saveCredential({
        userId: user.id,
        passwordHash: hash,
      });
      seeded += 1;
    } catch (err: any) {
      // Non-fatal: in database mode the profiles may not be provisioned yet.
      // The server should still start so migrations and seeds can be run.
      logger.debug(`Could not seed credential for ${user.id}: ${err.message}`);
    }
  }

  if (seeded > 0) {
    logger.info(`Seeded credentials for ${seeded} demo account(s)`);
  }
}
