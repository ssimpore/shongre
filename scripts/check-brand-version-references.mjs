#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".runtime",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const checkedExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const explicitFiles = new Set(["AGENTS.md", "Makefile", "README.md"]);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    const relative = path.relative(root, target).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (
        ignoredDirectories.has(entry.name) ||
        /^brand\/shongre\/v\d+\.\d+\.\d+$/.test(relative)
      ) {
        continue;
      }
      files.push(...(await filesUnder(target)));
      continue;
    }
    if (
      (checkedExtensions.has(path.extname(entry.name)) ||
        explicitFiles.has(relative)) &&
      !entry.name.includes(".generated.") &&
      relative !== "package-lock.json" &&
      relative !== "brand/shongre/brand.config.json" &&
      relative !== "scripts/check-brand-version-references.mjs"
    ) {
      files.push(target);
    }
  }
  return files;
}

const failures = [];
for (const file of await filesUnder(root)) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const contents = await readFile(file, "utf8");
  const forbidden = [
    ["legacy selector", /\bACTIVE_VERSION\b/],
    ["authored versioned brand path", /brand\/shongre\/v\d+\.\d+\.\d+/],
    [
      "hardcoded favicon brand cache version",
      /favicon[^\s"'`]*\?v=\d+\.\d+\.\d+/,
    ],
  ];
  for (const [label, pattern] of forbidden) {
    if (pattern.test(contents)) failures.push(`${relative}: ${label}`);
  }
}

if (failures.length) {
  throw new Error(
    `Authored brand-version references bypass brand.config.json:\n${failures.join("\n")}`,
  );
}

process.stdout.write(
  "No authored brand version, versioned canonical path, or legacy selector bypasses brand.config.json.\n",
);
