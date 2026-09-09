#!/usr/bin/env node

import {
  access,
  copyFile,
  lstat,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  BRAND_VERSION,
  brandActiveRegistryDestination,
  brandAssetMappings,
  brandDocumentAdapterDestination,
  brandDocumentLogoSource,
  brandDocumentReverseLogoSource,
  brandMobileImageRegistryDestination,
  brandMobileRegistryDestination,
  brandGeneratedDestinations,
  brandSourceRoot,
  brandTokenAdapterDestination,
  brandTokenSource,
  brandTokenTypesDestination,
  brandWebRegistryDestination,
  generatedInventoryPath,
  repositoryRoot,
} from "./brand-assets.config";
import {
  absoluteRepositoryPath,
  canonicalBrandPath,
  readCanonicalChecksums,
  renderBrandDocumentAdapter,
  renderBrandActiveRegistry,
  renderBrandMobileImageRegistry,
  renderBrandMobileRegistry,
  renderBrandTokenAdapter,
  renderBrandTokenTypes,
  renderBrandWebRegistry,
  sha256,
  validateCanonicalChecksums,
} from "./brand-assets.lib";

interface GeneratedInventory {
  version: number;
  brandVersion: string;
  generated: string[];
}

async function previousGeneratedPaths(): Promise<string[]> {
  try {
    const value = JSON.parse(
      await readFile(generatedInventoryPath, "utf8"),
    ) as GeneratedInventory;
    return Array.isArray(value.generated) ? value.generated : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function removeManagedFile(relative: string): Promise<void> {
  try {
    await unlink(absoluteRepositoryPath(relative));
    process.stdout.write(`Removed obsolete generated asset ${relative}\n`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function preflightBrandSources(): Promise<void> {
  const requiredSources = new Set([
    ...brandAssetMappings.map(({ source }) => source),
    brandDocumentLogoSource,
    brandDocumentReverseLogoSource,
    brandTokenSource,
  ]);
  const destinations = new Set<string>();
  const checksums = await readCanonicalChecksums();

  for (const { destination } of brandAssetMappings) {
    if (destinations.has(destination)) {
      throw new Error(`Duplicate runtime brand destination: ${destination}`);
    }
    destinations.add(destination);
    absoluteRepositoryPath(destination);
  }

  for (const source of requiredSources) {
    const file = canonicalBrandPath(source);
    if (!checksums.has(source)) {
      throw new Error(
        `Required runtime brand source is not checksummed: ${source}`,
      );
    }
    try {
      await access(file);
      if ((await lstat(file)).isSymbolicLink()) {
        throw new Error(
          `Canonical brand source must not be a symlink: ${source}`,
        );
      }
    } catch (error) {
      if ((error as Error).message.includes("must not be a symlink")) {
        throw error;
      }
      throw new Error(`Required runtime brand source is missing: ${source}`);
    }
  }
}

async function main(): Promise<void> {
  await validateCanonicalChecksums();
  await preflightBrandSources();

  const generated = [...brandGeneratedDestinations].sort();
  const generatedSet = new Set(generated);

  for (const relative of await previousGeneratedPaths()) {
    if (!generatedSet.has(relative)) await removeManagedFile(relative);
  }
  for (const mapping of brandAssetMappings) {
    const source = canonicalBrandPath(mapping.source);
    const destination = absoluteRepositoryPath(mapping.destination);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }

  const tokenAdapter = await renderBrandTokenAdapter(brandTokenSource);
  const tokenDestination = absoluteRepositoryPath(brandTokenAdapterDestination);
  await mkdir(path.dirname(tokenDestination), { recursive: true });
  await writeFile(tokenDestination, tokenAdapter, "utf8");

  const tokenTypes = await renderBrandTokenTypes(brandTokenSource);
  const tokenTypesDestination = absoluteRepositoryPath(
    brandTokenTypesDestination,
  );
  await mkdir(path.dirname(tokenTypesDestination), { recursive: true });
  await writeFile(tokenTypesDestination, tokenTypes, "utf8");

  const documentAdapter = await renderBrandDocumentAdapter(
    brandDocumentLogoSource,
    brandDocumentReverseLogoSource,
  );
  const documentDestination = absoluteRepositoryPath(
    brandDocumentAdapterDestination,
  );
  await mkdir(path.dirname(documentDestination), { recursive: true });
  await writeFile(documentDestination, documentAdapter, "utf8");

  const activeRegistry = await renderBrandActiveRegistry();
  const activeRegistryDestination = absoluteRepositoryPath(
    brandActiveRegistryDestination,
  );
  await mkdir(path.dirname(activeRegistryDestination), { recursive: true });
  await writeFile(activeRegistryDestination, activeRegistry, "utf8");

  const webRegistry = await renderBrandWebRegistry();
  const webRegistryDestination = absoluteRepositoryPath(
    brandWebRegistryDestination,
  );
  await mkdir(path.dirname(webRegistryDestination), { recursive: true });
  await writeFile(webRegistryDestination, webRegistry, "utf8");

  const mobileRegistry = renderBrandMobileRegistry();
  const mobileRegistryDestination = absoluteRepositoryPath(
    brandMobileRegistryDestination,
  );
  await mkdir(path.dirname(mobileRegistryDestination), { recursive: true });
  await writeFile(mobileRegistryDestination, mobileRegistry, "utf8");

  const mobileImageRegistry = await renderBrandMobileImageRegistry();
  const mobileImageRegistryDestination = absoluteRepositoryPath(
    brandMobileImageRegistryDestination,
  );
  await mkdir(path.dirname(mobileImageRegistryDestination), {
    recursive: true,
  });
  await writeFile(mobileImageRegistryDestination, mobileImageRegistry, "utf8");

  const inventory = {
    notice:
      "GENERATED by scripts/sync-brand-assets.ts. Do not edit mapped files manually.",
    version: 1,
    brandVersion: BRAND_VERSION,
    source: path.relative(repositoryRoot, brandSourceRoot),
    generated,
    files: Object.fromEntries(
      await Promise.all(
        generated.map(async (relative) => [
          relative,
          await sha256(absoluteRepositoryPath(relative)),
        ]),
      ),
    ),
  };
  await mkdir(path.dirname(generatedInventoryPath), { recursive: true });
  await writeFile(
    generatedInventoryPath,
    `${JSON.stringify(inventory, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `Synchronized ${generated.length} runtime brand assets from SHONGRE. v${BRAND_VERSION}.\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Brand synchronization failed: ${(error as Error).message}\n`,
  );
  process.exit(1);
});
