import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  throw new Error(`[Release Manifest] ${message}`);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function fileDigest(relativePath) {
  return sha256(readFileSync(resolve(root, relativePath)));
}

function migrationState() {
  const directory = resolve(root, "backend/supabase/migrations");
  const files = readdirSync(directory)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  if (files.length === 0) fail("no source-controlled migrations found");
  const content = files
    .map(
      (file) => `${file}\0${readFileSync(resolve(directory, file), "utf8")}\0`,
    )
    .join("");
  return {
    revision: files.at(-1).replace(/\.sql$/, ""),
    digest: sha256(content),
  };
}

function image(value, name) {
  const match = /^([^@\s]+)@(sha256:[0-9a-f]{64})$/.exec(value);
  if (!match)
    fail(`${name} must be an immutable registry reference with @sha256`);
  return { reference: value, digest: match[2] };
}

function assertSha(value, name) {
  if (!/^[0-9a-f]{40}$/.test(value))
    fail(`${name} must be a full Git commit SHA`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validateManifest(manifest, expectedRelease = "") {
  if (manifest.schemaVersion !== 1) fail("unsupported schemaVersion");
  assertSha(manifest.commit, "commit");
  if (expectedRelease && manifest.commit !== expectedRelease) {
    fail(
      `manifest commit ${manifest.commit} does not match ${expectedRelease}`,
    );
  }
  image(manifest.images?.frontend?.reference || "", "frontend image");
  image(manifest.images?.backend?.reference || "", "backend image");
  if (
    manifest.images.frontend.digest !==
    manifest.images.frontend.reference.split("@")[1]
  ) {
    fail("frontend digest and reference disagree");
  }
  if (
    manifest.images.backend.digest !==
    manifest.images.backend.reference.split("@")[1]
  ) {
    fail("backend digest and reference disagree");
  }
  for (const [name, digest] of [
    ["OpenAPI", manifest.openapiDigest],
    ["migration", manifest.migrationDigest],
  ]) {
    if (!/^sha256:[0-9a-f]{64}$/.test(digest || ""))
      fail(`${name} digest is invalid`);
  }
  if (!/^\d+_.+/.test(manifest.migrationRevision || "")) {
    fail("migration revision is invalid");
  }
  return manifest;
}

const [command, ...args] = process.argv.slice(2);

if (command === "create") {
  const [output, commit, repository, frontendReference, backendReference] =
    args;
  if (!output || !repository || !frontendReference || !backendReference) {
    fail("usage: create OUTPUT COMMIT REPOSITORY FRONTEND_IMAGE BACKEND_IMAGE");
  }
  assertSha(commit, "commit");
  const migrations = migrationState();
  const manifest = {
    schemaVersion: 1,
    release: `sha-${commit}`,
    commit,
    repository,
    builtAt: process.env.RELEASE_BUILT_AT || new Date().toISOString(),
    build: {
      workflow: process.env.GITHUB_WORKFLOW || "local",
      runId: process.env.GITHUB_RUN_ID || "local",
      runAttempt: process.env.GITHUB_RUN_ATTEMPT || "1",
    },
    images: {
      frontend: image(frontendReference, "frontend image"),
      backend: image(backendReference, "backend image"),
    },
    openapiDigest: fileDigest("backend/openapi/openapi.json"),
    migrationRevision: migrations.revision,
    migrationDigest: migrations.digest,
    supplyChain: {
      sbom: "OCI-attached BuildKit SBOM attestations",
      provenance: "OCI-attached BuildKit provenance attestations",
      scanner: "Trivy 0.73.0 (HIGH,CRITICAL)",
    },
  };
  validateManifest(manifest, commit);
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o644,
  });
  console.log(`Created ${output} for ${commit}.`);
} else if (command === "validate") {
  const [input, expectedRelease = ""] = args;
  if (!input) fail("usage: validate INPUT [EXPECTED_COMMIT]");
  validateManifest(readJson(input), expectedRelease);
  console.log(`Validated ${input}.`);
} else if (command === "certify") {
  const [manifestPath, output] = args;
  if (!manifestPath || !output) fail("usage: certify MANIFEST OUTPUT");
  const manifest = validateManifest(readJson(manifestPath));
  const certification = {
    schemaVersion: 1,
    environment: "staging",
    result: "passed",
    certifiedAt: new Date().toISOString(),
    commit: manifest.commit,
    images: manifest.images,
    openapiDigest: manifest.openapiDigest,
    migrationRevision: manifest.migrationRevision,
    migrationDigest: manifest.migrationDigest,
    workflow: {
      runId: process.env.GITHUB_RUN_ID || "local",
      runAttempt: process.env.GITHUB_RUN_ATTEMPT || "1",
    },
  };
  writeFileSync(output, `${JSON.stringify(certification, null, 2)}\n`, {
    mode: 0o644,
  });
  console.log(`Created ${output}.`);
} else if (command === "verify-certification") {
  const [manifestPath, certificationPath] = args;
  if (!manifestPath || !certificationPath) {
    fail("usage: verify-certification MANIFEST CERTIFICATION");
  }
  const manifest = validateManifest(readJson(manifestPath));
  const certification = readJson(certificationPath);
  if (
    certification.schemaVersion !== 1 ||
    certification.environment !== "staging" ||
    certification.result !== "passed"
  ) {
    fail("staging certification is not a successful supported record");
  }
  for (const field of [
    "commit",
    "openapiDigest",
    "migrationRevision",
    "migrationDigest",
  ]) {
    if (certification[field] !== manifest[field])
      fail(`certification ${field} does not match manifest`);
  }
  for (const name of ["frontend", "backend"]) {
    if (
      certification.images?.[name]?.reference !==
      manifest.images[name].reference
    ) {
      fail(`certification ${name} image is not the build-once digest`);
    }
  }
  console.log(
    `Certification proves ${manifest.commit} and both exact image digests passed staging.`,
  );
} else {
  fail("expected create, validate, certify, or verify-certification");
}
