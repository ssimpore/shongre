import { AppError } from "../../../shared/errors/app-error.js";
import { logger } from "../../logging/logger.js";

/** Fail closed when a database-mode repository cannot answer authoritatively. */
export function databaseFailure(
  operation: string,
  originalError?: unknown,
): never {
  logger.error("Database repository operation failed", { operation });
  throw new AppError({
    code: "NETWORK_ERROR",
    statusCode: 503,
    message: "Le service de données est temporairement indisponible.",
    originalError,
  });
}
