import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";

interface Heartbeat {
  pid: number;
  environmentId: string;
  updatedAt: number;
}

export async function workerIsHealthy(
  path: string,
  environmentId: string,
  now = Date.now(),
): Promise<boolean> {
  try {
    const heartbeat = JSON.parse(await readFile(path, "utf8")) as Heartbeat;
    if (
      !Number.isInteger(heartbeat.pid) ||
      heartbeat.pid <= 0 ||
      heartbeat.environmentId !== environmentId ||
      !Number.isFinite(heartbeat.updatedAt)
    )
      return false;
    const age = now - heartbeat.updatedAt;
    if (
      age < 0 ||
      age > SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.worker.heartbeatMaximumAgeMs
    )
      return false;
    process.kill(heartbeat.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Refreshed only after successful database coordination, not by an idle timer. */
export class WorkerHeartbeat {
  private lastWrite = 0;
  private pending: Promise<void> | undefined;
  constructor(
    private readonly path: string,
    private readonly environmentId: string,
  ) {}

  touch(): Promise<void> {
    if (this.pending) return this.pending;
    if (
      Date.now() - this.lastWrite <
      SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.worker.heartbeatMinimumIntervalMs
    )
      return Promise.resolve();
    const temporary = `${this.path}.${process.pid}.tmp`;
    this.pending = (async () => {
      const updatedAt = Date.now();
      try {
        await writeFile(
          temporary,
          JSON.stringify({
            pid: process.pid,
            environmentId: this.environmentId,
            updatedAt,
          }),
          { mode: 0o600 },
        );
        await rename(temporary, this.path);
        this.lastWrite = updatedAt;
      } finally {
        await rm(temporary, { force: true });
        this.pending = undefined;
      }
    })();
    return this.pending;
  }

  async stop(): Promise<void> {
    await this.pending;
    const heartbeat = await readFile(this.path, "utf8")
      .then((text) => JSON.parse(text) as Heartbeat)
      .catch(() => null);
    if (
      heartbeat?.pid === process.pid &&
      heartbeat.environmentId === this.environmentId
    )
      await rm(this.path, { force: true });
  }
}
