#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const required = [
  "APPLE_TEAM_ID",
  "IOS_BUNDLE_IDENTIFIER",
  "ANDROID_PACKAGE_NAME",
  "ANDROID_SHA256_CERT_FINGERPRINT",
];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(
    `Cannot render association files; missing ${missing.join(", ")}.`,
  );
  process.exit(1);
}

const outputRoot = resolve(root, "frontend/public/.well-known");
mkdirSync(outputRoot, { recursive: true });

const replacements = {
  APPLE_APP_ID: `${process.env.APPLE_TEAM_ID}.${process.env.IOS_BUNDLE_IDENTIFIER}`,
  ANDROID_PACKAGE_NAME: process.env.ANDROID_PACKAGE_NAME,
  ANDROID_SHA256_CERT_FINGERPRINT: process.env.ANDROID_SHA256_CERT_FINGERPRINT,
};

function render(templateName, outputName) {
  let source = readFileSync(
    resolve(root, "infrastructure/templates", templateName),
    "utf8",
  );
  for (const [name, value] of Object.entries(replacements))
    source = source.replaceAll(`{{${name}}}`, value);
  JSON.parse(source);
  writeFileSync(resolve(outputRoot, outputName), source);
}

render(
  "apple-app-site-association.json.template",
  "apple-app-site-association",
);
render("assetlinks.json.template", "assetlinks.json");
console.log(
  `Rendered association files in ${outputRoot}. Deploy them over HTTPS, then rerun make deep-links-check.`,
);
