import { AppError } from "../../../shared/errors/app-error.js";
import { errorDiagnostics, logger } from "../../logging/logger.js";

/** Fail closed when a database-mode repository cannot answer authoritatively. */
export function databaseFailure(
  operation: string,
  originalError?: unknown,
): never {
  // A repository that rethrows through a second guard hands this its own
  // AppError; the first call already logged the underlying cause.
  if (originalError instanceof AppError) throw originalError;
  // 22P02: the caller supplied a value that cannot even be parsed as the
  // column's type. A malformed identifier names a row that cannot exist, so
  // it is an absent resource; any other unparseable value (an enum or number
  // filter) is a bad request. Neither is an unavailable service.
  const provider = originalError as {
    code?: unknown;
    message?: unknown;
  } | null;
  if (provider?.code === "22P02") {
    const identifier = /type uuid/i.test(String(provider.message ?? ""));
    logger.warn("Database repository rejected a malformed value", {
      operation,
      errorCode: "22P02",
    });
    throw new AppError(
      identifier
        ? {
            code: "NOT_FOUND",
            message: "Ressource introuvable.",
            originalError,
          }
        : {
            code: "BAD_REQUEST",
            message: "Un paramètre de la requête est invalide.",
            originalError,
          },
    );
  }
  logger.error("Database repository operation failed", {
    operation,
    ...errorDiagnostics(originalError),
  });
  throw new AppError({
    code: "NETWORK_ERROR",
    statusCode: 503,
    message: "Le service de données est temporairement indisponible.",
    originalError,
  });
}
