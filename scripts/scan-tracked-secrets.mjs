#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";

const ownPath = "scripts/scan-tracked-secrets.mjs";
const files = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)
  .filter((file) => file !== ownPath && !file.endsWith("package-lock.json"));

const patterns = [
  [
    "Stripe live secret",
    new RegExp(["sk", "live"].join("_") + "_[A-Za-z0-9]{16,}", "g"),
  ],
  ["Stripe webhook secret", new RegExp("wh" + "sec_[A-Za-z0-9]{16,}", "g")],
  ["GitHub token", new RegExp("gh" + "[opsu]_[A-Za-z0-9]{30,}", "g")],
  ["AWS access key", new RegExp("AKIA[0-9A-Z]{16}", "g")],
  [
    "Private key",
    new RegExp("-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", "g"),
  ],
];

const findings = [];
for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\0")) continue;
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${label}: ${file}`);
  }
}

if (findings.length) {
  console.error("Potential production secrets were found in tracked files:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed for ${files.length} tracked files.`);
}
