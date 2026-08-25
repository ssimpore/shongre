import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00055_provider_credential_rotation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("provider credential rotation migration", () => {
  it("revokes and installs encrypted material atomically with concurrency", () => {
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("PROVIDER_CONNECTION_CONFLICT");
    expect(migration).toContain("SET revoked_at = now()");
    expect(migration).toContain("decode(p_encrypted_secret_base64, 'base64')");
    expect(migration).toContain("status = 'DRAFT'");
  });

  it("is callable only by the service role", () => {
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
