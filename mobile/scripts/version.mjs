#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const increment = process.argv[2];

if (!["patch", "minor", "major"].includes(increment)) {
  console.error("Usage: node mobile/scripts/version.mjs patch|minor|major");
  process.exit(2);
}

function readValue(source, name) {
  return source.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();
}

function replaceValue(source, name, value) {
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (!pattern.test(source))
    throw new Error(`${name} is missing from environment file.`);
  return source.replace(pattern, `${name}=${value}`);
}

const envPath = resolve(root, ".env");
const examplePath = resolve(root, ".env.example");
const envSource = readFileSync(envPath, "utf8");
const [major, minor, patch] = (readValue(envSource, "APP_VERSION") || "")
  .split(".")
  .map(Number);

if (![major, minor, patch].every(Number.isInteger))
  throw new Error("APP_VERSION must be semantic x.y.z.");

const next = {
  patch: [major, minor, patch + 1],
  minor: [major, minor + 1, 0],
  major: [major + 1, 0, 0],
}[increment].join(".");
const iosBuild = Number(readValue(envSource, "IOS_BUILD_NUMBER")) + 1;
const androidCode = Number(readValue(envSource, "ANDROID_VERSION_CODE")) + 1;

if (![iosBuild, androidCode].every(Number.isInteger))
  throw new Error("Native build numbers must be integers.");

for (const path of [envPath, examplePath]) {
  let source = readFileSync(path, "utf8");
  source = replaceValue(source, "APP_VERSION", next);
  source = replaceValue(source, "IOS_BUILD_NUMBER", String(iosBuild));
  source = replaceValue(source, "ANDROID_VERSION_CODE", String(androidCode));
  writeFileSync(path, source);
}

console.log(
  `Version bumped to ${next}; iOS build ${iosBuild}; Android versionCode ${androidCode}.`,
);
console.log(
  "Regenerate native projects and commit the version change before building.",
);
