#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(
  path.join(tmpdir(), "shongre-runtime-hostname-check-"),
);

function run(command, args) {
  return spawnSync(command, args, {
    cwd: temporaryRoot,
    encoding: "utf8",
  });
}

try {
  mkdirSync(path.join(temporaryRoot, "scripts"), { recursive: true });
  mkdirSync(path.join(temporaryRoot, "frontend/src"), { recursive: true });
  copyFileSync(
    path.join(repositoryRoot, "scripts/check-runtime-hostnames.mjs"),
    path.join(temporaryRoot, "scripts/check-runtime-hostnames.mjs"),
  );

  assert.equal(run("git", ["init", "--quiet"]).status, 0);
  writeFileSync(
    path.join(temporaryRoot, "frontend/src/deleted.ts"),
    'export const label = "safe";\n',
  );
  assert.equal(run("git", ["add", "frontend/src/deleted.ts"]).status, 0);
  rmSync(path.join(temporaryRoot, "frontend/src/deleted.ts"));

  const deletedResult = run("node", ["scripts/check-runtime-hostnames.mjs"]);
  assert.equal(deletedResult.status, 0, deletedResult.stderr);
  assert.match(deletedResult.stdout, /0 source files scanned/);

  writeFileSync(
    path.join(temporaryRoot, "frontend/src/untracked.ts"),
    'export const origin = "https://api-dev.shongre.fr";\n',
  );
  const untrackedResult = run("node", ["scripts/check-runtime-hostnames.mjs"]);
  assert.equal(untrackedResult.status, 1);
  assert.match(untrackedResult.stderr, /frontend\/src\/untracked\.ts:1/);

  console.log(
    "Runtime hostname scanner handles deleted tracked files and scans untracked source.",
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
