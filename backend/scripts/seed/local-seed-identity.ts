import { createHash } from "node:crypto";

/**
 * Stable UUIDs let the local scenario seed upsert the same records on every run.
 * The namespace is deliberately local-only and carries no production identity.
 */
export function localSeedUuid(scope: string, legacyId: string): string {
  const bytes = createHash("sha256")
    .update(`shongre-local-seed:${scope}:${legacyId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join("-");
}
