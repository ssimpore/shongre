import { workerIsHealthy } from "../../src/infrastructure/observability/worker-heartbeat.js";
import { resolveWorkerHealthFile } from "../../src/app/config/worker.config.js";

const environmentId = process.env.ENVIRONMENT_ID;
const path = resolveWorkerHealthFile();
if (!environmentId || !(await workerIsHealthy(path, environmentId))) {
  console.error(
    "Worker heartbeat is missing, stale, or belongs to another environment/process.",
  );
  process.exitCode = 1;
}
