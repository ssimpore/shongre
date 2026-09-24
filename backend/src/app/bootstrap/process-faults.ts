import {
  errorDiagnostics,
  logger,
} from "../../infrastructure/logging/logger.js";
import { config } from "../config/index.js";

/**
 * A fault that escapes every request and job boundary leaves the process in an
 * unknown state. It is written to the structured log — Node's default report
 * is an unparseable stderr trace — and the process leaves through the same
 * graceful shutdown as SIGTERM, so in-flight work drains and the orchestrator
 * replaces the replica. Sentry's default integrations report the fault itself.
 */
export function installProcessFaultHandlers(service: "api" | "worker"): void {
  let faulted = false;
  const fail = (event: string, error: unknown) => {
    logger.error(event, {
      service,
      ...errorDiagnostics(error, { includeStack: true }),
    });
    process.exitCode = 1;
    if (faulted) return;
    faulted = true;
    // Unref'd, so it only fires if something still holds the process open
    // after the graceful shutdown deadline.
    setTimeout(() => process.exit(1), config.shutdownGraceMs + 5_000).unref();
    process.kill(process.pid, "SIGTERM");
  };
  process.on("unhandledRejection", (reason) =>
    fail("process_unhandled_rejection", reason),
  );
  process.on("uncaughtException", (error) =>
    fail("process_uncaught_exception", error),
  );
}
