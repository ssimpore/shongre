import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const directory = mkdtempSync(resolve(tmpdir(), "shongre-release-"));
const output = resolve(directory, "release.json");
const certification = resolve(directory, "certification.json");
const sha = "a".repeat(40);
const frontend = `ghcr.io/example/shongre-frontend@sha256:${"b".repeat(64)}`;
const backend = `ghcr.io/example/shongre-backend@sha256:${"c".repeat(64)}`;

function run(args, expectedStatus = 0) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/release-manifest.mjs"), ...args],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== expectedStatus) {
    throw new Error(
      result.stderr || result.stdout || `unexpected status ${result.status}`,
    );
  }
}

try {
  run(["create", output, sha, "example/shongre", frontend, backend]);
  run(["validate", output, sha]);
  run(["certify", output, certification]);
  run(["verify-certification", output, certification]);
  const manifest = JSON.parse(readFileSync(output, "utf8"));
  if (
    manifest.images.frontend.reference !== frontend ||
    manifest.images.backend.reference !== backend
  ) {
    throw new Error("manifest did not retain exact image digests");
  }
  const invalid = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/release-manifest.mjs"),
      "validate",
      output,
      "d".repeat(40),
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (invalid.status === 0) throw new Error("mismatched release was accepted");
  console.log("Release manifest build-once invariants passed.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
