import { logger } from "../../infrastructure/logging/logger.js";
import {
  authRepository,
  type IAuthRepository,
} from "../../infrastructure/database/repositories/auth.repository.js";

const BATCH_SIZE = 5_000;
const MAXIMUM_BATCHES_PER_RUN = 20;

/** Drains lapsed limiter rows so the table tracks live windows only. */
export class AuthRateLimitRetentionWorker {
  constructor(private readonly auth: IAuthRepository = authRepository) {}

  async run(): Promise<number> {
    let purged = 0;
    for (let batch = 0; batch < MAXIMUM_BATCHES_PER_RUN; batch += 1) {
      const deleted = await this.auth.purgeExpiredRateLimits(BATCH_SIZE);
      purged += deleted;
      if (deleted < BATCH_SIZE) break;
    }
    if (purged > 0) logger.info("auth_rate_limits_purged", { purged });
    return purged;
  }
}

export const authRateLimitRetentionWorker = new AuthRateLimitRetentionWorker();
