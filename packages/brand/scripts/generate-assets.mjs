import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { themeColors } from "../../design-tokens/src/theme.ts";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(packageRoot, "../..");
const sourcePath = path.join(packageRoot, "src/logos/mark.svg");
const checkOnly = process.argv.includes("--check");

const source = Buffer.from(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">',
    `  <rect width="1024" height="1024" rx="224" fill="${themeColors.primary}"/>`,
    `  <path d="M640 336c0-82-66-132-180-132-130 0-196 66-196 148 0 148 354 82 354 246 0 98-80 148-194 148-130 0-196-82-196-164h130c0 41 33 74 74 74 49 0 82-25 82-58 0-131-344-82-344-262 0-132 114-214 290-214 180 0 278 82 278 214z" fill="${themeColors.white}"/>`,
    `  <circle cx="782" cy="734" r="72" fill="${themeColors.white}"/>`,
    "</svg>",
    "",
  ].join("\n"),
);

const transparentSplash = await sharp(source)
  .resize(320, 320)
  .extend({
    top: 96,
    bottom: 96,
    left: 96,
    right: 96,
    background: themeColors.transparent,
  })
  .png()
  .toBuffer();

const outputs = new Map([
  [sourcePath, source],
  [path.join(repositoryRoot, "frontend/public/favicon.svg"), source],
  [path.join(repositoryRoot, "mobile/assets/icon.svg"), source],
  [
    path.join(repositoryRoot, "mobile/assets/icon.png"),
    await sharp(source).resize(1024, 1024).png().toBuffer(),
  ],
  [
    path.join(repositoryRoot, "mobile/assets/adaptive-icon.png"),
    await sharp(source).resize(1024, 1024).png().toBuffer(),
  ],
  [
    path.join(repositoryRoot, "mobile/assets/favicon.png"),
    await sharp(source).resize(64, 64).png().toBuffer(),
  ],
  [path.join(repositoryRoot, "mobile/assets/splash.png"), transparentSplash],
]);

const stale = [];
for (const [target, contents] of outputs) {
  let matches = false;
  try {
    await access(target, constants.R_OK);
    matches = (await readFile(target)).equals(contents);
  } catch {
    matches = false;
  }

  if (matches) continue;
  if (checkOnly) {
    stale.push(path.relative(repositoryRoot, target));
    continue;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
  process.stdout.write(`Generated ${path.relative(repositoryRoot, target)}\n`);
}

if (stale.length) {
  throw new Error(
    `Brand assets are stale:\n${stale.map((entry) => `- ${entry}`).join("\n")}\nRun npm run assets -w @shongre/brand.`,
  );
}

if (checkOnly)
  process.stdout.write("Brand asset adapters match the canonical mark.\n");
