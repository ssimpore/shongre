import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

export function resolveWorkerHealthFile(): string {
  const configured = process.env.WORKER_HEALTH_FILE;
  if (configured && !isAbsolute(configured))
    throw new Error("WORKER_HEALTH_FILE must be an absolute path");
  return configured || join(tmpdir(), "shongre-worker-health.json");
}

export function resolveWorkerGroups(): string[] {
  const groups = (process.env.WORKER_GROUPS || "all")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = new Set([
    "all",
    "analytics",
    "marketing",
    "crm",
    "communications",
    "commercial",
    "payments",
    "finance",
    "lifecycle",
  ]);
  if (
    !groups.length ||
    groups.some((group) => !allowed.has(group)) ||
    (groups.includes("all") && groups.length > 1)
  ) {
    throw new Error(
      "[Config Error] WORKER_GROUPS must select all or known worker groups.",
    );
  }
  return [...new Set(groups)];
}
