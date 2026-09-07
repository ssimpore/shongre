import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WorkerHeartbeat,
  workerIsHealthy,
} from "../../src/infrastructure/observability/worker-heartbeat.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("worker dependency heartbeat", () => {
  it("checks process, freshness and environment, and disappears on clean shutdown", async () => {
    const directory = await mkdtemp(join(tmpdir(), "shongre-heartbeat-"));
    directories.push(directory);
    const path = join(directory, "health.json");
    const heartbeat = new WorkerHeartbeat(path, "test-environment");
    await expect(workerIsHealthy(path, "test-environment")).resolves.toBe(
      false,
    );
    await Promise.all([heartbeat.touch(), heartbeat.touch()]);
    await expect(workerIsHealthy(path, "test-environment")).resolves.toBe(true);
    await expect(workerIsHealthy(path, "other-environment")).resolves.toBe(
      false,
    );
    const timestamp = JSON.parse(await readFile(path, "utf8")).updatedAt;
    await expect(
      workerIsHealthy(path, "test-environment", timestamp + 180_001),
    ).resolves.toBe(false);
    await expect(
      workerIsHealthy(path, "test-environment", timestamp - 1),
    ).resolves.toBe(false);
    await heartbeat.stop();
    await expect(workerIsHealthy(path, "test-environment")).resolves.toBe(
      false,
    );
  });

  it("rejects malformed health files and does not delete another worker's evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "shongre-heartbeat-"));
    directories.push(directory);
    const path = join(directory, "health.json");
    await writeFile(path, "invalid json");
    await expect(workerIsHealthy(path, "test-environment")).resolves.toBe(
      false,
    );
    const other = JSON.stringify({
      pid: process.pid,
      environmentId: "other",
      updatedAt: Date.now(),
    });
    await writeFile(path, other);
    await new WorkerHeartbeat(path, "test-environment").stop();
    await expect(readFile(path, "utf8")).resolves.toBe(other);
  });
});
