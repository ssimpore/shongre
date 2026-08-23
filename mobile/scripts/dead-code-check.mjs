#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(mobileRoot, "src");
const entryRoots = [join(mobileRoot, "app"), join(mobileRoot, "tests")];
const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (extensions.includes(extname(path))) files.push(path);
  }
  return files;
}

function resolveModule(specifier, importer) {
  let candidate;
  if (specifier.startsWith("@/")) {
    candidate = join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    candidate = resolve(dirname(importer), specifier);
  } else {
    return null;
  }
  const candidates = [
    candidate,
    ...extensions.map((extension) => `${candidate}${extension}`),
    ...extensions.map((extension) => join(candidate, `index${extension}`)),
  ];
  return (
    candidates.find((path) => existsSync(path) && statSync(path).isFile()) ||
    null
  );
}

function importsOf(file) {
  const source = readFileSync(file, "utf8");
  const matches = source.matchAll(
    /(?:\bimport\s+(?:[^"']+?\s+from\s+)?|\bexport\s+[^"']+?\s+from\s+|\bimport\s*\()\s*["']([^"']+)["']/g,
  );
  return [...matches]
    .map((match) => resolveModule(match[1], file))
    .filter(Boolean);
}

const reachable = new Set();
const queue = entryRoots.flatMap((directory) => walk(directory));
while (queue.length) {
  const file = queue.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  queue.push(...importsOf(file));
}

const dead = walk(sourceRoot).filter((file) => !reachable.has(file));
if (dead.length) {
  console.error("Unreachable mobile source files:");
  for (const file of dead) console.error(`- ${relative(mobileRoot, file)}`);
  process.exit(1);
}

console.log(
  `Mobile source graph is clean: ${walk(sourceRoot).length} files reachable from Expo routes and tests.`,
);
