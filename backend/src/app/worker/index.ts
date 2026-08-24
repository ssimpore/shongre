import { bootstrapApp } from "../bootstrap/index.js";
import { config } from "../config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { scheduledWorkerRuntime } from "../../workers/scheduled-worker-runtime.js";

export async function startWorker(): Promise<void> {
  await bootstrapApp();
  scheduledWorkerRuntime.start();

  let stopping = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    logger.info("worker_shutdown_started", { signal });
    const deadline = setTimeout(() => {
      logger.error("worker_shutdown_deadline_exceeded", { signal });
      process.exitCode = 1;
    }, config.shutdownGraceMs);
    deadline.unref();
    await scheduledWorkerRuntime.stop();
    clearTimeout(deadline);
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

if (
  process.env.NODE_ENV !== "test" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  startWorker().catch((error) => {
    logger.error("Fatal worker startup error", {
      error: String(error?.message || error),
    });
    process.exit(1);
  });
}
