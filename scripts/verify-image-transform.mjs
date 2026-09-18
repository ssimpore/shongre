#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import { buildSizedImageUrl } from "@shongre/shared/responsive-image";

/**
 * Proves the storage image transformer before `PUBLIC_MEDIA_IMAGE_TRANSFORM`
 * is switched to `supabase_render` in an environment.
 *
 * The Web and mobile clients build a width ladder for every marketplace photo
 * once that flag is on. A transformer that is not provisioned answers those
 * requests with an error, and an error is a broken photo on every card, so the
 * flag must never be flipped on a guess. This script fetches one public object
 * both ways — the original and the same object through the render endpoint at
 * a fixed width — and requires the rendered answer to be an image whose
 * decoded width matches the request and whose payload is smaller than the
 * original. It writes the evidence `make production-release-check` requires
 * whenever the flag is on.
 */

const EVIDENCE_REQUEST_TIMEOUT_MS =
  SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.operations.evidenceRequestTimeoutMs;
export const IMAGE_TRANSFORM_EVIDENCE_VERSION = 1;
/** A card-sized request, well inside every provider's allowed range. */
const SAMPLE_WIDTH = 320;
const PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";

function publicObjectUrl(value, allowInsecure) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "IMAGE_TRANSFORM_SAMPLE_URL must be an absolute public storage object URL",
    );
  }
  if (!allowInsecure && url.protocol !== "https:") {
    throw new Error("IMAGE_TRANSFORM_SAMPLE_URL must use HTTPS");
  }
  if (!url.pathname.includes(PUBLIC_OBJECT_SEGMENT)) {
    throw new Error(
      `IMAGE_TRANSFORM_SAMPLE_URL must point at a ${PUBLIC_OBJECT_SEGMENT} object`,
    );
  }
  if (url.username || url.password || url.search) {
    throw new Error(
      "IMAGE_TRANSFORM_SAMPLE_URL must carry no credentials or query string",
    );
  }
  return url;
}

/**
 * Decoded pixel width of the formats a storage transformer can emit. Returns
 * null for anything else, which the caller treats as "not an image".
 */
export function imageWidth(bytes) {
  const view = Buffer.from(bytes);
  // PNG: IHDR is always the first chunk, width at byte 16.
  if (
    view.length >= 24 &&
    view
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return view.readUInt32BE(16);
  }
  // GIF: logical screen width, little-endian, after the 6-byte signature.
  if (view.length >= 10 && /^GIF8[79]a$/.test(view.toString("latin1", 0, 6))) {
    return view.readUInt16LE(6);
  }
  // WebP: RIFF container, one of three bitstream chunks.
  if (
    view.length >= 30 &&
    view.toString("latin1", 0, 4) === "RIFF" &&
    view.toString("latin1", 8, 12) === "WEBP"
  ) {
    const chunk = view.toString("latin1", 12, 16);
    if (chunk === "VP8 ") return view.readUInt16LE(26) & 0x3fff;
    if (chunk === "VP8L") return (view.readUInt32LE(21) & 0x3fff) + 1;
    if (chunk === "VP8X") return (view.readUIntLE(24, 3) & 0xffffff) + 1;
    return null;
  }
  // JPEG: walk the markers to the first start-of-frame.
  if (view.length >= 4 && view[0] === 0xff && view[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < view.length) {
      if (view[offset] !== 0xff) return null;
      const marker = view[offset + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = view.readUInt16BE(offset + 2);
      const startOfFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (startOfFrame) return view.readUInt16BE(offset + 7);
      offset += 2 + length;
    }
    return null;
  }
  return null;
}

async function fetchImage(url, label, timeoutMs) {
  const response = await fetch(url, {
    headers: { Accept: "image/webp,image/*;q=0.9,*/*;q=0.1" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const contentType = (response.headers.get("content-type") || "")
    .split(";")[0]
    .trim();
  const bytes = Buffer.from(await response.arrayBuffer());
  const observation = {
    status: response.status,
    contentType,
    bytes: bytes.length,
    width: imageWidth(bytes),
  };
  if (!response.ok) {
    throw new EvidenceError(
      `${label} answered HTTP ${response.status}`,
      observation,
    );
  }
  if (!contentType.startsWith("image/") || observation.width === null) {
    throw new EvidenceError(`${label} is not a decodable image`, observation);
  }
  return observation;
}

class EvidenceError extends Error {
  constructor(message, observation) {
    super(message);
    this.observation = observation;
  }
}

export async function verifyImageTransform(overrides = {}) {
  const allowInsecure = Boolean(overrides.allowInsecure);
  const sample = publicObjectUrl(
    overrides.sampleUrl || process.env.IMAGE_TRANSFORM_SAMPLE_URL || "",
    allowInsecure,
  );
  const environment =
    overrides.environment || process.env.IMAGE_TRANSFORM_ENVIRONMENT || "";
  if (!/^(development|staging|production)$/.test(environment)) {
    throw new Error(
      "IMAGE_TRANSFORM_ENVIRONMENT must name the hosted environment being proven",
    );
  }
  const timeoutMs = Number(
    overrides.timeoutMs ||
      process.env.IMAGE_TRANSFORM_TIMEOUT_MS ||
      EVIDENCE_REQUEST_TIMEOUT_MS,
  );
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("IMAGE_TRANSFORM_TIMEOUT_MS must be a positive integer");
  }
  const rendered = buildSizedImageUrl(sample.href, SAMPLE_WIDTH, {
    transformMode: "supabase_render",
  });
  if (!rendered) {
    throw new Error("the sample object is not a transformable storage object");
  }

  const evidence = {
    schemaVersion: IMAGE_TRANSFORM_EVIDENCE_VERSION,
    environment,
    transformMode: "supabase_render",
    sampleUrl: sample.href,
    requestedWidth: SAMPLE_WIDTH,
    verifiedAt: new Date().toISOString(),
    result: "FAIL",
    original: null,
    transformed: null,
    failure: null,
  };
  try {
    evidence.original = await fetchImage(
      sample,
      "the original object",
      timeoutMs,
    );
    evidence.transformed = await fetchImage(
      new URL(rendered),
      "the rendered object",
      timeoutMs,
    );
    if (
      evidence.original.width <= SAMPLE_WIDTH ||
      evidence.original.bytes === 0
    ) {
      throw new EvidenceError(
        `the sample object must be wider than ${SAMPLE_WIDTH}px so a resize is observable`,
        evidence.original,
      );
    }
    if (evidence.transformed.width !== SAMPLE_WIDTH) {
      throw new EvidenceError(
        `the rendered object is ${evidence.transformed.width}px wide, not ${SAMPLE_WIDTH}px: the transformer passed the original through`,
        evidence.transformed,
      );
    }
    if (evidence.transformed.bytes >= evidence.original.bytes) {
      throw new EvidenceError(
        "the rendered object is not smaller than the original",
        evidence.transformed,
      );
    }
    evidence.result = "PASS";
  } catch (error) {
    evidence.failure = error instanceof Error ? error.message : String(error);
    if (error instanceof EvidenceError) {
      if (!evidence.original) evidence.original = error.observation;
      else if (!evidence.transformed) evidence.transformed = error.observation;
    }
  }

  const evidencePath =
    overrides.evidencePath || process.env.IMAGE_TRANSFORM_EVIDENCE_FILE;
  if (evidencePath) {
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
  }
  if (evidence.result !== "PASS") {
    throw new Error(
      `Storage image transformer is not proven for ${environment}: ${evidence.failure}. Keep PUBLIC_MEDIA_IMAGE_TRANSFORM=disabled there.`,
    );
  }
  return evidence;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  verifyImageTransform()
    .then((evidence) => {
      console.log(
        `Storage image transformer proven for ${evidence.environment}: ${evidence.original.width}px/${evidence.original.bytes} B → ${evidence.transformed.width}px/${evidence.transformed.bytes} B (${evidence.transformed.contentType}).`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
