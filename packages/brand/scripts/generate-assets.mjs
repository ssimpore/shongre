import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(packageRoot, "../..");
const sourcePath = path.join(packageRoot, "src/logos/mark.svg");
const source = await readFile(sourcePath);
const checkOnly = process.argv.includes("--check");

const transparentSplash = await sharp(source)
  .resize(320, 320)
  .extend({
    top: 96,
    bottom: 96,
    left: 96,
    right: 96,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const outputs = new Map([
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
