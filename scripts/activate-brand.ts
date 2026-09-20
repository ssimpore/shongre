#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdir,
  readFile,
  rename,
  rm,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { absoluteRepositoryPath } from "./brand-assets.lib";
import {
  brandConfigPath,
  brandGeneratedDestinations,
  generatedInventoryPath,
  normalizeBrandVersion,
  readBrandConfig,
  renderBrandConfig,
  repositoryRoot,
} from "./brand-assets.config";
import { validateBrandKit } from "./brand-kit-validation";

interface Snapshot {
  path: string;
  contents: Buffer | null;
}

function usage(): never {
  throw new Error(
    "Usage: npm run brand:activate -- <vX.Y.Z|X.Y.Z> [--validate-only]",
  );
}

async function readIfPresent(file: string): Promise<Buffer | null> {
  try {
    return await readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicWrite(
  file: string,
  contents: Buffer | string,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.brand-activation.tmp`;
  await writeFile(temporary, contents);
  await rename(temporary, file);
}

async function managedPaths(): Promise<string[]> {
  const paths = new Set<string>([
    ...brandGeneratedDestinations,
    path.relative(repositoryRoot, generatedInventoryPath),
  ]);
  try {
    const inventory = JSON.parse(
      await readFile(generatedInventoryPath, "utf8"),
    ) as { generated?: unknown };
    if (Array.isArray(inventory.generated)) {
      for (const entry of inventory.generated) {
        if (typeof entry === "string") paths.add(entry);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return [...paths].sort();
}

async function snapshotManagedState(): Promise<Snapshot[]> {
  return Promise.all(
    (await managedPaths()).map(async (relative) => {
      const file = absoluteRepositoryPath(relative);
      return { path: file, contents: await readIfPresent(file) };
    }),
  );
}

async function restoreManagedState(snapshots: Snapshot[]): Promise<void> {
  for (const snapshot of snapshots) {
    if (snapshot.contents === null) {
      await unlink(snapshot.path).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    } else {
      await atomicWrite(snapshot.path, snapshot.contents);
    }
  }
}

function run(command: string, args: string[], label: string): void {
  process.stdout.write(`\n${label}\n`);
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const requested = arguments_.find((argument) => !argument.startsWith("--"));
  if (
    !requested ||
    arguments_.some(
      (argument) => ![requested, "--validate-only"].includes(argument),
    )
  ) {
    usage();
  }
  const targetVersion = normalizeBrandVersion(requested);
  const report = await validateBrandKit(targetVersion);
  process.stdout.write(
    `Validated SHONGRE. v${report.version}: ${report.checksummedFiles} checksums, ${report.manifestAssets} manifest assets, ${report.requiredRuntimeSources} runtime sources.\n`,
  );
  if (arguments_.includes("--validate-only")) return;

  const currentConfig = readBrandConfig();
  const previousVersion = currentConfig.activeVersion;
  const lockRoot = path.join(repositoryRoot, ".runtime");
  const lockDirectory = path.join(lockRoot, "brand-activation.lock");
  await mkdir(lockRoot, { recursive: true });
  try {
    await mkdir(lockDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("Another brand activation is already running.");
    }
    throw error;
  }

  const configSnapshot = await readFile(brandConfigPath);
  const generatedSnapshots = await snapshotManagedState();
  let activated = false;
  try {
    await atomicWrite(brandConfigPath, renderBrandConfig(targetVersion));
    run("npm", ["run", "brand:sync"], "Synchronizing staged runtime assets");
    run("npm", ["run", "brand:check"], "Checking synchronized brand state");
    run(
      "make",
      ["brand-activation-check"],
      "Running activation quality, accessibility, visual, and production gates",
    );
    activated = true;
    process.stdout.write(
      `\nActivated SHONGRE. v${targetVersion} (previously v${previousVersion}). Runtime URLs now use cache key shongre-${targetVersion}.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `\nActivation failed; restoring SHONGRE. v${previousVersion}.\n`,
    );
    await atomicWrite(brandConfigPath, configSnapshot);
    await restoreManagedState(generatedSnapshots);
    await rm(path.join(repositoryRoot, "frontend", ".next"), {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    }).catch((cacheError: NodeJS.ErrnoException) => {
      process.stderr.write(
        `Could not fully clear the disposable Next.js cache during rollback (${cacheError.code ?? "unknown"}); canonical generated files will still be restored and verified.\n`,
      );
    });
    run(
      "npm",
      ["run", "build", "--workspace=@shongre/design-tokens"],
      "Regenerating restored derived design tokens",
    );
    run("npm", ["run", "brand:check"], "Verifying restored brand state");
    throw error;
  } finally {
    await rmdir(lockDirectory).catch(() => undefined);
  }

  if (!activated) {
    throw new Error("Brand activation did not complete.");
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Brand activation failed: ${(error as Error).message}\n`,
  );
  process.exit(1);
});
