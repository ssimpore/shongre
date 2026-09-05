#!/usr/bin/env node

import { access, lstat, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  BRAND_SIGNATURE,
  BRAND_VERSION,
  brandActiveRegistryDestination,
  brandAssetMappings,
  brandConfigPath,
  brandConsumerAssets,
  brandDocumentAdapterDestination,
  brandDocumentLogoSource,
  brandGeneratedDestinations,
  brandMobileImageRegistryDestination,
  brandMobileRegistryDestination,
  brandSourceRoot,
  brandTokenAdapterDestination,
  brandTokenSource,
  brandTokenTypesDestination,
  brandWebRegistryDestination,
  generatedInventoryPath,
  repositoryRoot,
  requiredImageProperties,
  parseBrandConfig,
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
import { validateBrandKit } from "./brand-kit-validation";

const failures: string[] = [];
let orangeAssetsValidated = 0;
const prohibitedLegacyAssetPaths = [
  "frontend/public/favicon.svg",
  "mobile/assets/adaptive-icon.png",
  "mobile/assets/favicon.png",
  "mobile/assets/icon.png",
  "mobile/assets/icon.svg",
  "mobile/assets/splash.png",
  "packages/brand/src/logos/mark.svg",
] as const;

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function filesUnder(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(target) : [target];
      }),
    )
  ).flat();
}

const unmanagedAssetExtensions = /\.(?:eps|ico|jpe?g|pdf|png|svg|tiff?|webp)$/i;
const auditIgnoredDirectories = new Set([
  ".expo",
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

async function auditableAssetFiles(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const relativeDirectory = path
    .relative(repositoryRoot, directory)
    .replaceAll(path.sep, "/");
  if (
    auditIgnoredDirectories.has(path.basename(directory)) ||
    relativeDirectory === "mobile/ios" ||
    relativeDirectory === "mobile/android"
  ) {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return auditableAssetFiles(target);
        return unmanagedAssetExtensions.test(entry.name) ? [target] : [];
      }),
    )
  ).flat();
}

interface CanonicalManifestRow {
  path: string;
  bytes: number;
  mediaType: string;
  width?: number;
  height?: number;
  sha256: string;
}

async function validateCanonicalAssetManifest(): Promise<void> {
  const manifestPath = canonicalBrandPath("ASSET_MANIFEST.csv");
  const contents = await readFile(manifestPath, "utf8");
  const lines = contents.trim().split(/\r?\n/);
  const expectedHeader = "path,bytes,media_type,width_px,height_px,mode,sha256";
  if (lines.shift() !== expectedHeader) {
    throw new Error(`ASSET_MANIFEST.csv must use header ${expectedHeader}.`);
  }

  const rows = new Map<string, CanonicalManifestRow>();
  for (const [index, line] of lines.entries()) {
    const fields = line.split(",");
    if (fields.length !== 7) {
      throw new Error(
        `ASSET_MANIFEST.csv row ${index + 2} must contain exactly seven fields.`,
      );
    }
    const [relative, bytes, mediaType, width, height, , digest] = fields;
    if (
      !relative ||
      relative.startsWith("/") ||
      relative.split("/").includes("..") ||
      rows.has(relative)
    ) {
      throw new Error(
        `ASSET_MANIFEST.csv row ${index + 2} has an unsafe or duplicate path.`,
      );
    }
    const byteCount = Number(bytes);
    if (!Number.isSafeInteger(byteCount) || byteCount < 0) {
      throw new Error(
        `ASSET_MANIFEST.csv row ${index + 2} has invalid byte size ${bytes}.`,
      );
    }
    if (!mediaType || !/^[a-f\d]{64}$/i.test(digest)) {
      throw new Error(
        `ASSET_MANIFEST.csv row ${index + 2} has invalid media type or checksum.`,
      );
    }
    const parseDimension = (value: string): number | undefined => {
      if (!value) return undefined;
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error(
          `ASSET_MANIFEST.csv row ${index + 2} has invalid dimension ${value}.`,
        );
      }
      return parsed;
    };
    rows.set(relative, {
      path: relative,
      bytes: byteCount,
      mediaType,
      width: parseDimension(width),
      height: parseDimension(height),
      sha256: digest.toLowerCase(),
    });
  }

  const sourceFiles = (await filesUnder(brandSourceRoot))
    .map((file) =>
      path.relative(brandSourceRoot, file).replaceAll(path.sep, "/"),
    )
    .filter(
      (relative) =>
        relative !== "ASSET_MANIFEST.csv" && relative !== "CHECKSUMS.sha256",
    );
  for (const relative of sourceFiles) {
    const row = rows.get(relative);
    if (!row) {
      failures.push(
        `Canonical asset is absent from ASSET_MANIFEST.csv: ${relative}`,
      );
      continue;
    }
    const file = canonicalBrandPath(relative);
    const details = await stat(file);
    if (details.size !== row.bytes) {
      failures.push(
        `ASSET_MANIFEST.csv byte size is stale for ${relative}: expected ${row.bytes}, received ${details.size}.`,
      );
    }
    const digest = await sha256(file);
    if (digest !== row.sha256) {
      failures.push(`ASSET_MANIFEST.csv checksum is stale for ${relative}.`);
    }
    if ((row.width === undefined) !== (row.height === undefined)) {
      failures.push(
        `ASSET_MANIFEST.csv must provide both dimensions or neither for ${relative}.`,
      );
    } else if (row.width && row.height) {
      let actualWidth: number | undefined;
      let actualHeight: number | undefined;
      if (/\.eps$/i.test(relative)) {
        const eps = await readFile(file, "utf8");
        const bounds = eps.match(
          /^%%HiResBoundingBox:\s+\S+\s+\S+\s+(\d+)\s+(\d+)$/m,
        );
        actualWidth = bounds ? Number(bounds[1]) : undefined;
        actualHeight = bounds ? Number(bounds[2]) : undefined;
      } else if (/\.ico$/i.test(relative)) {
        const ico = await readFile(file);
        const count = ico.length >= 6 ? ico.readUInt16LE(4) : 0;
        const entries = Array.from({ length: count }, (_, index) => {
          const offset = 6 + index * 16;
          return {
            width: ico[offset] === 0 ? 256 : ico[offset],
            height: ico[offset + 1] === 0 ? 256 : ico[offset + 1],
          };
        }).filter(({ width, height }) => width && height);
        actualWidth = Math.max(0, ...entries.map(({ width }) => width));
        actualHeight = Math.max(0, ...entries.map(({ height }) => height));
      } else {
        const metadata = await sharp(file).metadata();
        actualWidth = metadata.width;
        actualHeight = metadata.height;
      }
      if (actualWidth !== row.width || actualHeight !== row.height) {
        failures.push(
          `ASSET_MANIFEST.csv dimensions are stale for ${relative}: expected ${row.width}x${row.height}, received ${actualWidth}x${actualHeight}.`,
        );
      }
    }
  }
  for (const relative of rows.keys()) {
    if (!sourceFiles.includes(relative)) {
      failures.push(
        `ASSET_MANIFEST.csv points to a missing asset: ${relative}`,
      );
    }
  }
}

async function validateAndroidAdaptiveSafeZone(source: string): Promise<void> {
  const file = canonicalBrandPath(source);
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  // Android's 108 dp adaptive canvas reserves the centered 66 dp square for
  // critical artwork. The supplied xxxhdpi layers are 432 px, so the safe
  // inset is 21 dp × 4 = 84 px on each edge.
  const safeInset = 84;
  const safeMaximum = info.width - safeInset - 1;
  if (
    maxX < 0 ||
    minX < safeInset ||
    minY < safeInset ||
    maxX > safeMaximum ||
    maxY > safeMaximum
  ) {
    failures.push(
      `${source} has critical artwork outside the Android 66 dp adaptive-icon safe zone (${minX},${minY})–(${maxX},${maxY}).`,
    );
  }
}

async function validateSquareIconCoverage(source: string): Promise<void> {
  const file = canonicalBrandPath(source);
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const artworkWidth = maxX - minX + 1;
  const artworkHeight = maxY - minY + 1;
  if (
    maxX < 0 ||
    artworkWidth / info.width < 0.75 ||
    artworkHeight / info.height < 0.75
  ) {
    failures.push(
      `${source} does not contain square standalone-icon artwork; a wordmark or horizontal logo must never be used as a favicon.`,
    );
  }
}

async function main(): Promise<void> {
  try {
    const selected = parseBrandConfig(
      await readFile(brandConfigPath, "utf8"),
    ).activeVersion;
    if (selected !== BRAND_VERSION) {
      failures.push(
        `brand/shongre/brand.config.json selects ${selected || "nothing"}; expected ${BRAND_VERSION}.`,
      );
    }
  } catch (error) {
    failures.push(
      `Unable to read brand/shongre/brand.config.json: ${(error as Error).message}`,
    );
  }

  try {
    const report = await validateBrandKit(BRAND_VERSION);
    orangeAssetsValidated = report.artworkComparisons;
  } catch (error) {
    failures.push(
      `Active brand kit is incompatible: ${(error as Error).message}`,
    );
  }

  try {
    const versionFile = await readFile(
      canonicalBrandPath("VERSION.txt"),
      "utf8",
    );
    const version = versionFile.match(/^Version:\s*v?([^\s]+)\s*$/m)?.[1];
    if (version !== BRAND_VERSION) {
      failures.push(
        `VERSION.txt identifies ${version || "no version"}; expected ${BRAND_VERSION}.`,
      );
    }
  } catch {
    failures.push(`Missing canonical brand version v${BRAND_VERSION}.`);
  }

  try {
    await validateCanonicalChecksums();
  } catch (error) {
    failures.push((error as Error).message);
  }

  try {
    const checksums = await readCanonicalChecksums();
    for (const source of [
      ...brandAssetMappings.map(({ source }) => source),
      brandDocumentLogoSource,
      brandTokenSource,
    ]) {
      if (!checksums.has(source))
        failures.push(`Runtime source is not checksummed: ${source}`);
    }
    const sourceFiles = (await filesUnder(brandSourceRoot))
      .map((file) =>
        path.relative(brandSourceRoot, file).replaceAll(path.sep, "/"),
      )
      .filter((relative) => relative !== "CHECKSUMS.sha256");
    for (const relative of sourceFiles) {
      if (!checksums.has(relative)) {
        failures.push(`Canonical brand file is not checksummed: ${relative}`);
      }
      if ((await lstat(canonicalBrandPath(relative))).isSymbolicLink()) {
        failures.push(
          `Canonical brand entry must not be a symlink: ${relative}`,
        );
      }
    }
    for (const relative of checksums.keys()) {
      if (!sourceFiles.includes(relative)) {
        failures.push(
          `Checksum points to a missing canonical file: ${relative}`,
        );
      }
    }
  } catch (error) {
    failures.push((error as Error).message);
  }

  try {
    await validateCanonicalAssetManifest();
  } catch (error) {
    failures.push((error as Error).message);
  }

  for (const directory of [
    "01_Logo",
    "02_Icon",
    "03_Web",
    "04_iOS",
    "05_Android",
    "06_Social",
    "07_Print",
    "08_Design_Tokens",
    "09_Documentation",
    "10_Previews",
  ]) {
    if (!(await exists(canonicalBrandPath(directory)))) {
      failures.push(`Canonical brand directory is missing: ${directory}`);
    }
  }

  for (const requirement of requiredImageProperties) {
    const file = canonicalBrandPath(requirement.source);
    try {
      const metadata = await sharp(file).metadata();
      if (
        metadata.width !== requirement.width ||
        metadata.height !== requirement.height
      ) {
        failures.push(
          `${requirement.source} is ${metadata.width}x${metadata.height}; expected ${requirement.width}x${requirement.height}.`,
        );
      }
      if ("opaque" in requirement && requirement.opaque && metadata.hasAlpha) {
        const { data, info } = await sharp(file)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        for (
          let index = info.channels - 1;
          index < data.length;
          index += info.channels
        ) {
          if (data[index] !== 255) {
            failures.push(`${requirement.source} must be fully opaque.`);
            break;
          }
        }
      }
    } catch (error) {
      failures.push(`${requirement.source}: ${(error as Error).message}`);
    }
  }

  for (const size of [16, 32, 48, 64, 96]) {
    const source = `03_Web/favicon/favicon-${size}x${size}.png`;
    try {
      await validateSquareIconCoverage(source);
    } catch (error) {
      failures.push(`${source}: ${(error as Error).message}`);
    }
  }

  for (const source of [
    "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png",
    "05_Android/app/src/main/res/drawable-nodpi/ic_launcher_monochrome.png",
  ]) {
    try {
      await validateAndroidAdaptiveSafeZone(source);
    } catch (error) {
      failures.push(`${source}: ${(error as Error).message}`);
    }
  }

  for (const mapping of brandAssetMappings) {
    const source = canonicalBrandPath(mapping.source);
    const destination = absoluteRepositoryPath(mapping.destination);
    try {
      if ((await sha256(source)) !== (await sha256(destination))) {
        failures.push(`Runtime mapping is stale: ${mapping.destination}`);
      }
    } catch {
      failures.push(`Runtime mapping is missing: ${mapping.destination}`);
    }
  }

  try {
    const expected = await renderBrandTokenAdapter(brandTokenSource);
    const actual = await readFile(
      absoluteRepositoryPath(brandTokenAdapterDestination),
      "utf8",
    );
    if (actual !== expected)
      failures.push(
        `Generated token adapter is stale: ${brandTokenAdapterDestination}`,
      );
  } catch (error) {
    failures.push((error as Error).message);
  }

  try {
    const expected = await renderBrandTokenTypes(brandTokenSource);
    const actual = await readFile(
      absoluteRepositoryPath(brandTokenTypesDestination),
      "utf8",
    );
    if (actual !== expected) {
      failures.push(
        `Generated token declarations are stale: ${brandTokenTypesDestination}`,
      );
    }
  } catch (error) {
    failures.push((error as Error).message);
  }

  try {
    const expected = await renderBrandDocumentAdapter(brandDocumentLogoSource);
    const actual = await readFile(
      absoluteRepositoryPath(brandDocumentAdapterDestination),
      "utf8",
    );
    if (actual !== expected) {
      failures.push(
        `Generated document adapter is stale: ${brandDocumentAdapterDestination}`,
      );
    }
  } catch (error) {
    failures.push((error as Error).message);
  }

  for (const [destination, render] of [
    [brandActiveRegistryDestination, renderBrandActiveRegistry],
    [brandWebRegistryDestination, renderBrandWebRegistry],
    [brandMobileRegistryDestination, async () => renderBrandMobileRegistry()],
    [brandMobileImageRegistryDestination, renderBrandMobileImageRegistry],
  ] as const) {
    try {
      const expected = await render();
      const actual = await readFile(
        absoluteRepositoryPath(destination),
        "utf8",
      );
      if (actual !== expected) {
        failures.push(`Generated brand registry is stale: ${destination}`);
      }
    } catch (error) {
      failures.push((error as Error).message);
    }
  }

  try {
    const inventory = JSON.parse(
      await readFile(generatedInventoryPath, "utf8"),
    ) as {
      brandVersion?: string;
      generated?: string[];
      files?: Record<string, string>;
    };
    const expected = [...brandGeneratedDestinations].sort();
    if (
      inventory.brandVersion !== BRAND_VERSION ||
      JSON.stringify(inventory.generated) !== JSON.stringify(expected)
    ) {
      failures.push("Generated brand inventory is stale.");
    } else {
      for (const relative of expected) {
        if (
          inventory.files?.[relative] !==
          (await sha256(absoluteRepositoryPath(relative)))
        ) {
          failures.push(`Generated inventory checksum is stale: ${relative}`);
        }
      }
    }
  } catch (error) {
    failures.push(
      `Generated brand inventory is invalid: ${(error as Error).message}`,
    );
  }

  const prohibitedPublicSources =
    /^(?:06_Social|07_Print|09_Documentation|10_Previews)\//;
  for (const mapping of brandAssetMappings) {
    if (mapping.public && prohibitedPublicSources.test(mapping.source)) {
      failures.push(`Non-runtime source is mapped publicly: ${mapping.source}`);
    }
  }

  const publicBrandRoot = path.join(
    repositoryRoot,
    "frontend/public/brand/shongre",
  );
  const allowedPublic = new Set(
    brandAssetMappings
      .filter(({ public: isPublic }) => isPublic)
      .map(({ destination }) => absoluteRepositoryPath(destination)),
  );
  for (const file of await filesUnder(publicBrandRoot)) {
    if (!allowedPublic.has(file)) {
      failures.push(
        `Unmanaged or non-runtime file is publicly deployed: ${path.relative(repositoryRoot, file)}`,
      );
    }
    if (/\.(?:eps|pdf|tiff?)$/i.test(file)) {
      failures.push(`Print/document asset is publicly deployed: ${file}`);
    }
  }

  const mobileBrandRoot = path.join(repositoryRoot, "mobile/assets/brand");
  const allowedMobile = new Set(
    brandAssetMappings
      .filter(({ destination }) =>
        destination.startsWith("mobile/assets/brand/"),
      )
      .map(({ destination }) => absoluteRepositoryPath(destination)),
  );
  for (const file of await filesUnder(mobileBrandRoot)) {
    if (!allowedMobile.has(file)) {
      failures.push(
        `Unmanaged file would enter the Expo brand bundle: ${path.relative(repositoryRoot, file)}`,
      );
    }
  }

  for (const relative of prohibitedLegacyAssetPaths) {
    if (await exists(absoluteRepositoryPath(relative))) {
      failures.push(`Obsolete brand asset still exists: ${relative}`);
    }
  }

  try {
    const canonicalDigests = new Set((await readCanonicalChecksums()).values());
    const approvedCopies = new Set(
      brandAssetMappings.map(({ destination }) =>
        absoluteRepositoryPath(destination),
      ),
    );
    const candidateFiles = (
      await Promise.all(
        [
          "frontend",
          "mobile",
          "backend",
          "packages",
          "docs",
          "infrastructure",
        ].map((relative) =>
          auditableAssetFiles(absoluteRepositoryPath(relative)),
        ),
      )
    ).flat();
    for (const file of candidateFiles) {
      if (approvedCopies.has(file)) continue;
      if (canonicalDigests.has(await sha256(file))) {
        failures.push(
          `Canonical brand asset has an unmanaged duplicate: ${path.relative(repositoryRoot, file)}`,
        );
      }
    }
  } catch (error) {
    failures.push(
      `Unable to audit duplicate brand assets: ${(error as Error).message}`,
    );
  }

  const sourceFiles = (
    await Promise.all(
      [
        "frontend/app",
        "frontend/src",
        "mobile/app",
        "mobile/src",
        "mobile/app.config.ts",
      ].map(async (relative) => {
        const absolute = absoluteRepositoryPath(relative);
        if (!(await exists(absolute))) return [];
        return (await stat(absolute)).isDirectory()
          ? filesUnder(absolute)
          : [absolute];
      }),
    )
  )
    .flat()
    .filter((file) => /\.(?:[cm]?[jt]sx?|css|json)$/.test(file));
  const brokenReferencePatterns = [
    "/favicon.svg",
    "assets/icon.png",
    "assets/icon.svg",
    "assets/adaptive-icon.png",
    "assets/favicon.png",
    "assets/splash.png",
    "@shongre/brand/mark.svg",
  ];
  for (const file of sourceFiles) {
    const contents = await readFile(file, "utf8");
    for (const reference of brokenReferencePatterns) {
      if (contents.includes(reference)) {
        failures.push(
          `${path.relative(repositoryRoot, file)} retains obsolete brand reference ${reference}.`,
        );
      }
    }
  }

  for (const file of sourceFiles) {
    const relative = path
      .relative(repositoryRoot, file)
      .replaceAll(path.sep, "/");
    if (
      /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relative) ||
      relative.includes(".generated.")
    ) {
      continue;
    }
    const contents = await readFile(file, "utf8");
    for (const pattern of [
      /["'`]\/brand\/shongre\/(?:icon|logo|pwa|social)\//,
      /["'`]\.\/assets\/brand\//,
    ]) {
      if (pattern.test(contents)) {
        failures.push(
          `${relative} hardcodes a generated brand path instead of consuming a governed registry.`,
        );
      }
    }
  }

  for (const jsonFile of [
    "03_Web/site.webmanifest",
    "04_iOS/AppIcon.appiconset/Contents.json",
    "08_Design_Tokens/brand-tokens.json",
    "08_Design_Tokens/ios/Colors.json",
  ]) {
    try {
      JSON.parse(await readFile(canonicalBrandPath(jsonFile), "utf8"));
    } catch (error) {
      failures.push(`${jsonFile} is invalid JSON: ${(error as Error).message}`);
    }
  }

  try {
    const tokenDocument = JSON.parse(
      await readFile(canonicalBrandPath(brandTokenSource), "utf8"),
    ) as { color?: Record<string, { value?: string }> };
    const css = await readFile(
      canonicalBrandPath("08_Design_Tokens/shongre-brand.css"),
      "utf8",
    );
    for (const name of ["orange", "ink", "white", "mist"]) {
      const value = tokenDocument.color?.[name]?.value?.toLowerCase();
      const declaration = `--shongre-${name}: ${value}`;
      if (!css.toLowerCase().includes(declaration)) {
        failures.push(`Canonical brand CSS is missing ${declaration}.`);
      }
    }
    const opens = (css.match(/{/g) || []).length;
    const closes = (css.match(/}/g) || []).length;
    if (opens !== closes)
      failures.push("Canonical brand CSS has unbalanced braces.");
  } catch (error) {
    failures.push(
      `Canonical brand CSS is invalid: ${(error as Error).message}`,
    );
  }

  for (const xmlFile of [
    "05_Android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
    "05_Android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
    "05_Android/app/src/main/res/values/colors.xml",
    "08_Design_Tokens/android/colors.xml",
  ]) {
    try {
      const xml = await readFile(canonicalBrandPath(xmlFile), "utf8");
      if (!/^<\?xml[\s\S]*<([\w-]+)[\s\S]*<\/\1>\s*$/m.test(xml)) {
        failures.push(`${xmlFile} is not a complete XML document.`);
      }
    } catch (error) {
      failures.push(`${xmlFile}: ${(error as Error).message}`);
    }
  }

  const tokenAdapter = await readFile(
    absoluteRepositoryPath(brandTokenAdapterDestination),
    "utf8",
  ).catch(() => "");
  const canonicalTokenDocument = JSON.parse(
    await readFile(canonicalBrandPath(brandTokenSource), "utf8"),
  ) as { color?: Record<string, { value?: string }> };
  for (const expected of [
    ...["orange", "ink", "white", "mist"].map(
      (name) => canonicalTokenDocument.color?.[name]?.value ?? "",
    ),
  ]) {
    if (!tokenAdapter.includes(expected))
      failures.push(`Generated token adapter is missing ${expected}.`);
  }

  const themeSource = await readFile(
    path.join(repositoryRoot, "packages/design-tokens/src/theme.ts"),
    "utf8",
  );
  if (!themeSource.includes('from "./brand.generated.js"')) {
    failures.push(
      "The design system does not consume the generated brand tokens.",
    );
  }
  for (const duplicated of ["orange", "ink", "white", "mist"].map(
    (name) => canonicalTokenDocument.color?.[name]?.value ?? "",
  )) {
    if (themeSource.toUpperCase().includes(duplicated.toUpperCase())) {
      failures.push(`theme.ts duplicates canonical brand value ${duplicated}.`);
    }
  }

  const logoComponent = await readFile(
    path.join(
      repositoryRoot,
      "frontend/src/design-system/primitives/BrandLogo.tsx",
    ),
    "utf8",
  ).catch(() => "");
  for (const approved of [
    '"primary"',
    '"reverse"',
    '"mono-ink"',
    '"mono-white"',
    '"mono-orange"',
    '"horizontal"',
    '"stacked"',
    '"wordmark"',
  ]) {
    if (!logoComponent.includes(approved)) {
      failures.push(`BrandLogo is missing approved value ${approved}.`);
    }
  }
  if (/BrandLogoProps[^}]+(?:className|style|color)\??:/s.test(logoComponent)) {
    failures.push("BrandLogo exposes an arbitrary visual override.");
  }
  for (const requiredHeaderPrimitive of [
    "BrandHeaderSignature",
    "BrandHeaderSignatureVariant",
    "data-brand-signature={variant}",
    "marketLabel?: string",
    "data-brand-market-label",
    "rounded-sm",
    'from "@shongre/brand/web"',
    "webBrandAssets.icon.primary",
    "webBrandAssets.logo",
  ]) {
    if (!logoComponent.includes(requiredHeaderPrimitive)) {
      failures.push(
        `The governed header signature is missing ${requiredHeaderPrimitive}.`,
      );
    }
  }
  for (const headerConsumer of [
    "frontend/src/app/layouts/Header.tsx",
    "frontend/src/app/layouts/FocusedLayout.tsx",
    "frontend/src/app/layouts/ProductHeader.tsx",
    "frontend/src/features/global/GlobalGatewayPage.tsx",
    "frontend/src/features/global/MarketLaunchPage.tsx",
    "frontend/src/features/solutions/SolutionsLayout.tsx",
  ]) {
    const source = await readFile(
      path.join(repositoryRoot, headerConsumer),
      "utf8",
    );
    if (!source.includes("BrandHeaderSignature")) {
      failures.push(
        `${headerConsumer} bypasses the governed header signature.`,
      );
    }
  }

  const footerSource = await readFile(
    path.join(repositoryRoot, "frontend/src/app/layouts/Footer.tsx"),
    "utf8",
  ).catch(() => "");
  for (const requiredFooterSignature of [
    '<BrandHeaderSignature variant="reverse"',
    "decorative",
  ]) {
    if (!footerSource.includes(requiredFooterSignature)) {
      failures.push(
        `The dark footer signature is missing ${requiredFooterSignature}.`,
      );
    }
  }

  for (const [configuration, references] of Object.entries({
    "frontend/app/layout.tsx": [
      "webBrandAssets.favicon",
      "webBrandAssets.manifest",
      "DEFAULT_SHARE_IMAGE_PATH",
    ],
    "frontend/src/services/seo.service.ts": [
      "webBrandAssets.social.openGraphLight.src",
    ],
    "frontend/app/manifest.ts": ["webBrandAssets.pwa.icons"],
    "frontend/app/og/solutions/[slug]/route.tsx": [
      "webBrandAssets.logo.header.primary480.src",
    ],
    "frontend/src/platform/seo/not-found-presentation.ts": [
      "webBrandAssets.icon.primary",
      "webBrandAssets.logo.wordmark.primary",
    ],
    "frontend/src/platform/seo/discovery-structured-data.ts": [
      "webBrandAssets.icon.structuredData.src",
    ],
    "mobile/app.config.ts": [
      'from "./brand-assets.generated.json"',
      "mobileBrandAssets.cacheKey",
      "mobileBrandAssets.expo.appIcon",
      "mobileBrandAssets.expo.adaptiveForeground",
      "mobileBrandAssets.expo.adaptiveBackground",
      "mobileBrandAssets.expo.adaptiveMonochrome",
    ],
    "mobile/src/components/BrandLogo.tsx": [
      'from "../brand-images.generated"',
      "mobileBrandImages[variant]",
    ],
    "mobile/plugins/with-brand-assets.cjs": [
      'require("../brand-assets.generated.json")',
      "mobileBrandAssets.native.iosAppIconSet",
      "mobileBrandAssets.native.androidResources",
    ],
    "backend/src/modules/business-rules/business-rules.service.ts": [
      'from "@shongre/brand/document"',
    ],
    "frontend/src/api/adapters/demo/demo-business-rules.service.ts": [
      'from "@shongre/brand/document"',
    ],
  })) {
    const contents = await readFile(
      absoluteRepositoryPath(configuration),
      "utf8",
    ).catch(() => "");
    for (const reference of references) {
      if (!contents.includes(reference)) {
        failures.push(
          `${configuration} is missing runtime reference ${reference}.`,
        );
      }
    }
  }

  const brandIndex = await readFile(
    absoluteRepositoryPath("packages/brand/src/index.ts"),
    "utf8",
  ).catch(() => "");
  if (brandIndex.includes("document.generated")) {
    failures.push(
      "The main brand entry point re-exports embedded document artwork; use the document subpath to protect client bundles.",
    );
  }

  const webMetadataSource = await readFile(
    path.join(repositoryRoot, "frontend/app/layout.tsx"),
    "utf8",
  );
  const iconMetadata = webMetadataSource.slice(
    webMetadataSource.indexOf("icons:"),
    webMetadataSource.indexOf("manifest:"),
  );
  if (
    /wordmark|horizontal|header-primary|brand\/shongre\/logo/i.test(
      iconMetadata,
    )
  ) {
    failures.push(
      "Web favicon metadata references a wordmark or full logo instead of standalone icon artwork.",
    );
  }

  for (const dockerfile of ["backend/Dockerfile", "frontend/Dockerfile"]) {
    const contents = await readFile(
      absoluteRepositoryPath(dockerfile),
      "utf8",
    ).catch(() => "");
    if (/^COPY\s+(?:\.\s+\.|brand(?:\/|\s))/m.test(contents)) {
      failures.push(
        `${dockerfile} may copy the canonical brand kit into an image.`,
      );
    }
  }
  const dockerignore = await readFile(
    absoluteRepositoryPath(".dockerignore"),
    "utf8",
  ).catch(() => "");
  if (!/^\/brand\/$/m.test(dockerignore)) {
    failures.push(".dockerignore does not exclude the canonical brand kit.");
  }
  if (/^\/frontend\/public\/brand\/$/m.test(dockerignore)) {
    failures.push(
      ".dockerignore excludes synchronized Web runtime brand assets.",
    );
  }

  if (failures.length) {
    process.stderr.write(
      `Brand asset validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`,
    );
    process.exit(1);
  }

  process.stdout.write(
    `SHONGRE. v${BRAND_VERSION} validated (${brandAssetMappings.length} runtime mappings; ${orangeAssetsValidated} orange artwork comparisons).\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Brand validation failed: ${(error as Error).message}\n`,
  );
  process.exit(1);
});
