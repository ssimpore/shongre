import { createHash } from "node:crypto";
import { lstat, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  BRAND_SIGNATURE,
  brandAssetMappings,
  brandDocumentLogoSource,
  brandSourceRootForVersion,
  brandTokenSource,
  normalizeBrandVersion,
  repositoryRoot,
  requiredImageProperties,
} from "./brand-assets.config";

const requiredDirectories = [
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
] as const;

const requiredJsonFiles = [
  "03_Web/site.webmanifest",
  "04_iOS/AppIcon.appiconset/Contents.json",
  "08_Design_Tokens/brand-tokens.json",
  "08_Design_Tokens/ios/Colors.json",
] as const;

const requiredXmlFiles = [
  "05_Android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "05_Android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
  "05_Android/app/src/main/res/values/colors.xml",
  "08_Design_Tokens/android/colors.xml",
] as const;

interface ManifestRow {
  bytes: number;
  mediaType: string;
  width?: number;
  height?: number;
  sha256: string;
}

export interface BrandKitValidationReport {
  version: string;
  sourceRoot: string;
  checksummedFiles: number;
  manifestAssets: number;
  requiredRuntimeSources: number;
  artworkComparisons: number;
}

const canonicalOrangeArtwork = [
  "01_Logo/Master/shongre-logo-horizontal-primary.png",
  "01_Logo/Master/shongre-logo-stacked-primary.png",
  "01_Logo/Master/shongre-wordmark-primary.png",
  "01_Logo/Color_Variants/shongre-logo-horizontal-mono-orange.png",
  "02_Icon/Master/shongre-icon-primary.png",
  "02_Icon/Color_Variants/shongre-icon-mono-orange.png",
  "03_Web/header/shongre-header-logo-240w.png",
  "03_Web/header/shongre-header-logo-480w.png",
  "03_Web/header/shongre-header-logo-960w.png",
  "03_Web/favicon/favicon-16x16.png",
  "03_Web/favicon/favicon-32x32.png",
  "03_Web/favicon/favicon-48x48.png",
  "03_Web/favicon/favicon-64x64.png",
  "03_Web/favicon/favicon-96x96.png",
  "03_Web/apple-touch-icon.png",
  "03_Web/pwa/icon-192x192.png",
  "03_Web/pwa/icon-512x512.png",
  "03_Web/pwa/icon-maskable-192x192.png",
  "03_Web/pwa/icon-maskable-512x512.png",
  "04_iOS/AppIcon.appiconset/AppIcon-1024.png",
  "05_Android/play-store/play-store-icon-512.png",
] as const;

async function validateCanonicalOrangeArtwork(
  sourceRoot: string,
  canonical: string,
): Promise<number> {
  const target = [1, 3, 5].map((index) =>
    Number.parseInt(canonical.slice(index, index + 2), 16),
  );
  const targetKey = target.join(",");
  let validated = 0;
  for (const source of canonicalOrangeArtwork) {
    const { data, info } = await sharp(safeBrandPath(sourceRoot, source))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const orangePixels = new Map<string, number>();
    let canonicalPixelCount = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];
      if (
        alpha < 250 ||
        red < 180 ||
        green < 30 ||
        green > 180 ||
        blue > 100 ||
        red <= green * 1.4
      ) {
        continue;
      }
      const key = `${red},${green},${blue}`;
      orangePixels.set(key, (orangePixels.get(key) ?? 0) + 1);
      if (key === targetKey) canonicalPixelCount += 1;
    }
    const dominant = [...orangePixels].sort(
      ([, first], [, second]) => second - first,
    )[0];
    if (!dominant || canonicalPixelCount === 0) {
      throw new Error(
        `${source} does not contain the canonical opaque color.orange artwork.`,
      );
    }
    const tolerance = source.endsWith("favicon-16x16.png") ? 1 : 0;
    const channelDelta = dominant[0]
      .split(",")
      .reduce(
        (sum, channel, index) =>
          sum + Math.abs(Number(channel) - target[index]),
        0,
      );
    if (dominant[0] !== targetKey && channelDelta > tolerance) {
      throw new Error(
        `${source} uses rgb(${dominant[0]}) as its dominant opaque orange; expected ${canonical}.`,
      );
    }
    validated += 1;
  }
  return validated;
}

function safeBrandPath(sourceRoot: string, relative: string): string {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    throw new Error(`Unsafe brand-kit path: ${relative}`);
  }
  const target = path.resolve(sourceRoot, relative);
  if (!target.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error(
      `Brand-kit path escapes its version directory: ${relative}`,
    );
  }
  return target;
}

async function digest(file: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(directory, entry.name);
        const details = await lstat(target);
        if (details.isSymbolicLink()) {
          throw new Error(
            `Canonical brand kits must not contain symlinks: ${target}`,
          );
        }
        return entry.isDirectory() ? filesUnder(target) : [target];
      }),
    )
  ).flat();
}

async function readChecksums(sourceRoot: string): Promise<Map<string, string>> {
  const contents = await readFile(
    safeBrandPath(sourceRoot, "CHECKSUMS.sha256"),
    "utf8",
  );
  const checksums = new Map<string, string>();
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = line.match(/^([a-f\d]{64})\s+\*?(.+)$/i);
    if (!match) {
      throw new Error(`CHECKSUMS.sha256 line ${index + 1} is invalid.`);
    }
    const relative = match[2].replaceAll("\\", "/");
    safeBrandPath(sourceRoot, relative);
    if (checksums.has(relative)) {
      throw new Error(`CHECKSUMS.sha256 repeats ${relative}.`);
    }
    checksums.set(relative, match[1].toLowerCase());
  }
  if (checksums.size === 0) {
    throw new Error("CHECKSUMS.sha256 contains no entries.");
  }
  return checksums;
}

function parseDimension(value: string, row: number): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`ASSET_MANIFEST.csv row ${row} has invalid dimensions.`);
  }
  return parsed;
}

async function readManifest(
  sourceRoot: string,
): Promise<Map<string, ManifestRow>> {
  const contents = await readFile(
    safeBrandPath(sourceRoot, "ASSET_MANIFEST.csv"),
    "utf8",
  );
  const lines = contents.trim().split(/\r?\n/);
  const expectedHeader = "path,bytes,media_type,width_px,height_px,mode,sha256";
  if (lines.shift() !== expectedHeader) {
    throw new Error(`ASSET_MANIFEST.csv must use header ${expectedHeader}.`);
  }
  const rows = new Map<string, ManifestRow>();
  for (const [index, line] of lines.entries()) {
    const rowNumber = index + 2;
    const fields = line.split(",");
    if (fields.length !== 7) {
      throw new Error(
        `ASSET_MANIFEST.csv row ${rowNumber} must have seven fields.`,
      );
    }
    const [relative, rawBytes, mediaType, rawWidth, rawHeight, , checksum] =
      fields;
    safeBrandPath(sourceRoot, relative);
    const bytes = Number(rawBytes);
    if (
      rows.has(relative) ||
      !Number.isSafeInteger(bytes) ||
      bytes < 0 ||
      !mediaType ||
      !/^[a-f\d]{64}$/i.test(checksum)
    ) {
      throw new Error(`ASSET_MANIFEST.csv row ${rowNumber} is invalid.`);
    }
    const width = parseDimension(rawWidth, rowNumber);
    const height = parseDimension(rawHeight, rowNumber);
    if ((width === undefined) !== (height === undefined)) {
      throw new Error(
        `ASSET_MANIFEST.csv row ${rowNumber} needs both dimensions or neither.`,
      );
    }
    rows.set(relative, {
      bytes,
      mediaType,
      width,
      height,
      sha256: checksum.toLowerCase(),
    });
  }
  return rows;
}

async function imageDimensions(
  file: string,
  relative: string,
): Promise<{ width?: number; height?: number }> {
  if (/\.eps$/i.test(relative)) {
    const bounds = (await readFile(file, "utf8")).match(
      /^%%HiResBoundingBox:\s+\S+\s+\S+\s+(\d+)\s+(\d+)$/m,
    );
    return {
      width: bounds ? Number(bounds[1]) : undefined,
      height: bounds ? Number(bounds[2]) : undefined,
    };
  }
  if (/\.ico$/i.test(relative)) {
    const ico = await readFile(file);
    const count = ico.length >= 6 ? ico.readUInt16LE(4) : 0;
    const entries = Array.from({ length: count }, (_, index) => {
      const offset = 6 + index * 16;
      return {
        width: ico[offset] === 0 ? 256 : ico[offset],
        height: ico[offset + 1] === 0 ? 256 : ico[offset + 1],
      };
    }).filter(({ width, height }) => width && height);
    return {
      width: Math.max(0, ...entries.map(({ width }) => width)),
      height: Math.max(0, ...entries.map(({ height }) => height)),
    };
  }
  const metadata = await sharp(file).metadata();
  return { width: metadata.width, height: metadata.height };
}

async function assertOpaque(file: string, relative: string): Promise<void> {
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
      throw new Error(`${relative} must be fully opaque.`);
    }
  }
}

export async function validateBrandKit(
  requestedVersion: string,
  root = repositoryRoot,
): Promise<BrandKitValidationReport> {
  const version = normalizeBrandVersion(requestedVersion);
  const sourceRoot = brandSourceRootForVersion(version, root);
  const sourceDetails = await lstat(sourceRoot).catch(() => null);
  if (!sourceDetails?.isDirectory() || sourceDetails.isSymbolicLink()) {
    throw new Error(`Canonical brand kit v${version} does not exist.`);
  }

  for (const directory of requiredDirectories) {
    const details = await lstat(safeBrandPath(sourceRoot, directory)).catch(
      () => null,
    );
    if (!details?.isDirectory() || details.isSymbolicLink()) {
      throw new Error(`Canonical brand directory is missing: ${directory}`);
    }
  }

  const versionDocument = await readFile(
    safeBrandPath(sourceRoot, "VERSION.txt"),
    "utf8",
  );
  const declaredVersion = versionDocument.match(
    /^Version:\s*v?([^\s]+)\s*$/m,
  )?.[1];
  if (declaredVersion !== version) {
    throw new Error(
      `VERSION.txt identifies ${declaredVersion ?? "no version"}; expected ${version}.`,
    );
  }

  const checksums = await readChecksums(sourceRoot);
  const allFiles = (await filesUnder(sourceRoot)).map((file) =>
    path.relative(sourceRoot, file).replaceAll(path.sep, "/"),
  );
  const checksummedFiles = allFiles.filter(
    (relative) => relative !== "CHECKSUMS.sha256",
  );
  for (const relative of checksummedFiles) {
    const expected = checksums.get(relative);
    if (!expected) {
      throw new Error(`Canonical brand file is not checksummed: ${relative}`);
    }
    const actual = await digest(safeBrandPath(sourceRoot, relative));
    if (actual !== expected) {
      throw new Error(
        `Brand source checksum mismatch for ${relative}: expected ${expected}, received ${actual}.`,
      );
    }
  }
  for (const relative of checksums.keys()) {
    if (!checksummedFiles.includes(relative)) {
      throw new Error(`Checksum points to a missing file: ${relative}`);
    }
  }

  const runtimeSources = new Set([
    ...brandAssetMappings.map(({ source }) => source),
    brandDocumentLogoSource,
    brandTokenSource,
  ]);
  for (const relative of runtimeSources) {
    if (!checksums.has(relative)) {
      throw new Error(
        `Required runtime source is not checksummed: ${relative}`,
      );
    }
  }

  const tokens = JSON.parse(
    await readFile(safeBrandPath(sourceRoot, brandTokenSource), "utf8"),
  ) as {
    brand?: { signature?: unknown; version?: unknown };
    color?: Record<string, { value?: unknown; type?: unknown }>;
  };
  if (
    tokens.brand?.signature !== BRAND_SIGNATURE ||
    tokens.brand.version !== version
  ) {
    throw new Error(
      `Brand tokens must identify ${BRAND_SIGNATURE} v${version}.`,
    );
  }
  for (const name of ["orange", "ink", "white", "mist", "border", "muted"]) {
    const token = tokens.color?.[name];
    if (
      token?.type !== "color" ||
      !/^#[A-F\d]{6}$/i.test(String(token.value))
    ) {
      throw new Error(`Brand token color.${name} is missing or invalid.`);
    }
  }
  const palette = Object.fromEntries(
    Object.entries(tokens.color ?? {}).map(([name, token]) => [
      name,
      String(token.value).toUpperCase(),
    ]),
  );
  const artworkComparisons = await validateCanonicalOrangeArtwork(
    sourceRoot,
    palette.orange,
  );

  const css = (
    await readFile(
      safeBrandPath(sourceRoot, "08_Design_Tokens/shongre-brand.css"),
      "utf8",
    )
  ).toLowerCase();
  for (const name of ["orange", "ink", "white", "mist", "border", "muted"]) {
    if (!css.includes(`--shongre-${name}: ${palette[name].toLowerCase()}`)) {
      throw new Error(`Canonical brand CSS conflicts with color.${name}.`);
    }
  }

  const iosColors = JSON.parse(
    await readFile(
      safeBrandPath(sourceRoot, "08_Design_Tokens/ios/Colors.json"),
      "utf8",
    ),
  ) as Record<string, { hex?: string }>;
  for (const [tokenName, iosName] of [
    ["orange", "shongreOrange"],
    ["ink", "shongreInk"],
    ["white", "shongreWhite"],
    ["mist", "shongreMist"],
  ] as const) {
    if (iosColors[iosName]?.hex?.toUpperCase() !== palette[tokenName]) {
      throw new Error(`iOS ${iosName} conflicts with color.${tokenName}.`);
    }
  }

  const androidColors = await readFile(
    safeBrandPath(sourceRoot, "08_Design_Tokens/android/colors.xml"),
    "utf8",
  );
  for (const name of ["orange", "ink", "white", "mist", "border", "muted"]) {
    if (
      !androidColors.includes(
        `<color name="shongre_${name}">${palette[name]}</color>`,
      )
    ) {
      throw new Error(`Android design tokens conflict with color.${name}.`);
    }
  }
  const launcherColors = await readFile(
    safeBrandPath(sourceRoot, "05_Android/app/src/main/res/values/colors.xml"),
    "utf8",
  );
  if (
    !launcherColors.includes(
      `<color name="ic_launcher_background">${palette.orange}</color>`,
    )
  ) {
    throw new Error("Android launcher background conflicts with color.orange.");
  }
  const sourceManifest = JSON.parse(
    await readFile(
      safeBrandPath(sourceRoot, "03_Web/site.webmanifest"),
      "utf8",
    ),
  ) as { theme_color?: string; background_color?: string };
  if (
    sourceManifest.theme_color?.toUpperCase() !== palette.orange ||
    sourceManifest.background_color?.toUpperCase() !== palette.white
  ) {
    throw new Error(
      "Source Web manifest conflicts with canonical brand tokens.",
    );
  }

  for (const relative of requiredJsonFiles) {
    try {
      JSON.parse(await readFile(safeBrandPath(sourceRoot, relative), "utf8"));
    } catch (error) {
      throw new Error(
        `${relative} is invalid JSON: ${(error as Error).message}`,
      );
    }
  }
  for (const relative of requiredXmlFiles) {
    const xml = await readFile(safeBrandPath(sourceRoot, relative), "utf8");
    if (!/^<\?xml[\s\S]*<([\w-]+)[\s\S]*<\/\1>\s*$/m.test(xml)) {
      throw new Error(`${relative} is not a complete XML document.`);
    }
  }

  const manifest = await readManifest(sourceRoot);
  const manifestFiles = checksummedFiles.filter(
    (relative) =>
      relative !== "ASSET_MANIFEST.csv" && relative !== "CHECKSUMS.sha256",
  );
  for (const relative of manifestFiles) {
    const row = manifest.get(relative);
    if (!row) {
      throw new Error(
        `Canonical asset is absent from ASSET_MANIFEST.csv: ${relative}`,
      );
    }
    const file = safeBrandPath(sourceRoot, relative);
    const details = await stat(file);
    if (details.size !== row.bytes || (await digest(file)) !== row.sha256) {
      throw new Error(`ASSET_MANIFEST.csv is stale for ${relative}.`);
    }
    if (row.width && row.height) {
      const actual = await imageDimensions(file, relative);
      if (actual.width !== row.width || actual.height !== row.height) {
        throw new Error(
          `ASSET_MANIFEST.csv dimensions are stale for ${relative}.`,
        );
      }
    }
  }
  for (const relative of manifest.keys()) {
    if (!manifestFiles.includes(relative)) {
      throw new Error(
        `ASSET_MANIFEST.csv points to a missing file: ${relative}`,
      );
    }
  }

  for (const requirement of requiredImageProperties) {
    const file = safeBrandPath(sourceRoot, requirement.source);
    const metadata = await sharp(file).metadata();
    if (
      metadata.width !== requirement.width ||
      metadata.height !== requirement.height
    ) {
      throw new Error(
        `${requirement.source} is ${metadata.width}x${metadata.height}; expected ${requirement.width}x${requirement.height}.`,
      );
    }
    if ("opaque" in requirement && requirement.opaque) {
      await assertOpaque(file, requirement.source);
    }
  }

  return {
    version,
    sourceRoot,
    checksummedFiles: checksums.size,
    manifestAssets: manifest.size,
    requiredRuntimeSources: runtimeSources.size,
    artworkComparisons,
  };
}
