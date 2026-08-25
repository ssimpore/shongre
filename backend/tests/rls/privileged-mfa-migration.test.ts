import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00047_privileged_mfa.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("privileged MFA migration", () => {
  it("stores encrypted credentials separately from profiles", () => {
    expect(migration).toContain("auth_mfa_credentials");
    expect(migration).toContain("secret_ciphertext TEXT NOT NULL");
    expect(migration).toContain("secret_iv TEXT NOT NULL");
    expect(migration).toContain("secret_auth_tag TEXT NOT NULL");
    expect(migration).not.toContain("secret_plaintext");
  });

  it("models bounded expiring challenges and session MFA proof", () => {
    expect(migration).toContain("auth_mfa_challenges");
    expect(migration).toContain("attempts BETWEEN 0 AND 5");
    expect(migration).toContain("mfa_verified_at TIMESTAMPTZ");
    expect(migration).toContain("auth_mfa_challenges_active_idx");
  });

  it("prevents replay and keeps credentials server-only", () => {
    expect(migration).toContain("accept_auth_mfa_counter");
    expect(migration).toContain("consume_auth_mfa_backup_code");
    expect(migration).toContain("increment_auth_mfa_challenge_attempts");
    expect(migration).toContain("last_used_counter < p_counter");
    expect(migration).toContain("SET attempts = LEAST(5, attempts + 1)");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SET search_path = ''");
  });
});
