import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runtimeFingerprint } from "./runtime-fingerprint.mjs";

test("process reuse requires matching configuration, dependencies, and migrations without retaining secret values", async () => {
  const root = await mkdtemp(join(tmpdir(), "shongre-fingerprint-"));
  try {
    const migrations = join(root, "backend/supabase/migrations");
    await mkdir(migrations, { recursive: true });
    await writeFile(
      join(root, ".env.example"),
      "APP_ENV=local\nJWT_SECRET=\nWORKER_HEALTH_FILE=\n",
    );
    await writeFile(join(root, "package-lock.json"), "{}");
    for (const directory of [
      "frontend",
      "backend",
      "mobile",
      "packages/contracts",
    ])
      await mkdir(join(root, directory), { recursive: true });
    for (const manifest of [
      "package.json",
      "frontend/package.json",
      "backend/package.json",
      "mobile/package.json",
      "packages/contracts/package.json",
    ])
      await writeFile(join(root, manifest), "{}");
    const environment = { APP_ENV: "local", JWT_SECRET: "private-value" };
    const original = runtimeFingerprint(root, environment);
    assert.match(original, /^[a-f0-9]{64}$/);
    assert.ok(!original.includes(environment.JWT_SECRET));
    assert.equal(
      runtimeFingerprint(root, {
        ...environment,
        WORKER_HEALTH_FILE: "/tmp/worker",
        npm_lifecycle_event: "dev",
      }),
      original,
    );
    assert.notEqual(
      runtimeFingerprint(root, { ...environment, JWT_SECRET: "rotated-value" }),
      original,
    );
    assert.notEqual(
      runtimeFingerprint(root, { ...environment, APP_ENV: "staging" }),
      original,
    );
    await writeFile(join(migrations, "00001_test.sql"), "SELECT 1;");
    const migrated = runtimeFingerprint(root, environment);
    assert.notEqual(migrated, original);
    await writeFile(join(root, "package-lock.json"), '{"lockfileVersion": 3}');
    const dependencies = runtimeFingerprint(root, environment);
    assert.notEqual(dependencies, migrated);
    await writeFile(
      join(root, "backend/package.json"),
      '{"scripts":{"dev":"changed-entrypoint"}}',
    );
    assert.notEqual(runtimeFingerprint(root, environment), dependencies);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
