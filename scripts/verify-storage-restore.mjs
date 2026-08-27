#!/usr/bin/env node

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function signedUrl(value, name, allowInsecure) {
  const url = new URL(value);
  if (!allowInsecure && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS`);
  }
  return url;
}

async function requireResponse(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`);
  }
  return response;
}

export async function verifyStorageRestore(overrides = {}) {
  const allowInsecure = Boolean(overrides.allowInsecure);
  const source = signedUrl(
    overrides.sourceUrl || process.env.STORAGE_BACKUP_DOWNLOAD_URL || "",
    "STORAGE_BACKUP_DOWNLOAD_URL",
    allowInsecure,
  );
  const upload = signedUrl(
    overrides.uploadUrl || process.env.STORAGE_RESTORE_UPLOAD_URL || "",
    "STORAGE_RESTORE_UPLOAD_URL",
    allowInsecure,
  );
  const restored = signedUrl(
    overrides.restoredUrl || process.env.STORAGE_RESTORE_DOWNLOAD_URL || "",
    "STORAGE_RESTORE_DOWNLOAD_URL",
    allowInsecure,
  );
  const deleteValue =
    overrides.deleteUrl || process.env.STORAGE_RESTORE_DELETE_URL || "";
  const deleteUrl = deleteValue
    ? signedUrl(deleteValue, "STORAGE_RESTORE_DELETE_URL", allowInsecure)
    : undefined;
  const targetId =
    overrides.targetId || process.env.STORAGE_RESTORE_TARGET_ID || "";
  if (!/(restore|dr[_-]?test)/i.test(targetId)) {
    throw new Error(
      "STORAGE_RESTORE_TARGET_ID must identify an isolated restore or dr_test target",
    );
  }
  const maxBytes = Number(
    overrides.maxBytes || process.env.STORAGE_RESTORE_MAX_BYTES || 33_554_432,
  );
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("STORAGE_RESTORE_MAX_BYTES must be a positive integer");
  }

  const startedAt = performance.now();
  const sourceResponse = await requireResponse(
    await fetch(source, { signal: AbortSignal.timeout(30_000) }),
    "storage backup download",
  );
  const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
  if (sourceBytes.length === 0 || sourceBytes.length > maxBytes) {
    throw new Error(`storage restore fixture must contain 1-${maxBytes} bytes`);
  }
  await requireResponse(
    await fetch(upload, {
      method: "PUT",
      headers: {
        "Content-Type":
          sourceResponse.headers.get("content-type") ||
          "application/octet-stream",
      },
      body: sourceBytes,
      signal: AbortSignal.timeout(30_000),
    }),
    "storage restore upload",
  );
  const restoredResponse = await requireResponse(
    await fetch(restored, { signal: AbortSignal.timeout(30_000) }),
    "restored storage download",
  );
  const restoredBytes = Buffer.from(await restoredResponse.arrayBuffer());
  const sourceSha256 = digest(sourceBytes);
  const restoredSha256 = digest(restoredBytes);
  if (sourceSha256 !== restoredSha256) {
    throw new Error("restored storage fixture checksum does not match backup");
  }

  let cleanup = "NOT_REQUESTED";
  if (deleteUrl) {
    await requireResponse(
      await fetch(deleteUrl, {
        method: "DELETE",
        signal: AbortSignal.timeout(30_000),
      }),
      "restore fixture cleanup",
    );
    cleanup = "PASS";
  }
  const evidence = {
    schemaVersion: 1,
    result: "PASS",
    scope: "MARKET_SCOPED",
    marketCode: (
      overrides.marketCode ||
      process.env.STORAGE_RESTORE_MARKET ||
      "FR"
    ).toUpperCase(),
    targetId,
    verifiedAt: new Date().toISOString(),
    bytes: sourceBytes.length,
    sha256: sourceSha256,
    durationMs: Math.round(performance.now() - startedAt),
    cleanup,
  };
  if (!/^[A-Z]{2}$/.test(evidence.marketCode)) {
    throw new Error("STORAGE_RESTORE_MARKET must be a two-letter market code");
  }
  const evidencePath =
    overrides.evidencePath || process.env.STORAGE_RESTORE_EVIDENCE_FILE;
  if (evidencePath) {
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
  }
  return evidence;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  verifyStorageRestore()
    .then((evidence) => {
      console.log(
        `Storage restore passed for ${evidence.marketCode}; checksum ${evidence.sha256}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
