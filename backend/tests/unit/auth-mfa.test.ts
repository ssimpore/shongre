import { describe, expect, it } from "vitest";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import {
  createMfaSecret,
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpCode,
  hashMfaBackupCode,
  verifyTotp,
} from "../../src/modules/auth/mfa.service.js";

describe("server MFA primitives", () => {
  it("encrypts TOTP secrets with authenticated encryption", () => {
    const secret = createMfaSecret();
    const encrypted = encryptMfaSecret(secret);
    expect(encrypted.secretCiphertext).not.toContain(secret);
    expect(decryptMfaSecret(encrypted)).toBe(secret);
  });

  it("accepts the current TOTP window and rejects malformed codes", () => {
    const secret = createMfaSecret();
    const now = Date.parse("2026-08-25T12:00:00.000Z");
    const code = generateTotpCode(secret, now);
    expect(verifyTotp(secret, code, now)).not.toBeNull();
    expect(verifyTotp(secret, "12345", now)).toBeNull();
  });

  it("consumes recovery codes once and rejects replayed TOTP counters", async () => {
    const repository = new DemoAuthRepository();
    const secret = createMfaSecret();
    const recoveryHash = hashMfaBackupCode("ABCDE-12345");
    await repository.saveMfaCredential({
      userId: "staff-1",
      ...encryptMfaSecret(secret),
      backupCodeHashes: [recoveryHash],
      enabledAt: "2026-08-25T00:00:00.000Z",
      disabledAt: null,
      lastUsedCounter: null,
    });
    expect(await repository.consumeMfaBackupCode("staff-1", recoveryHash)).toBe(
      true,
    );
    expect(await repository.consumeMfaBackupCode("staff-1", recoveryHash)).toBe(
      false,
    );
    expect(await repository.acceptMfaCounter("staff-1", 100)).toBe(true);
    expect(await repository.acceptMfaCounter("staff-1", 100)).toBe(false);
  });

  it("expires and consumes login challenges", async () => {
    const repository = new DemoAuthRepository();
    await repository.createMfaChallenge({
      userId: "staff-1",
      tokenHash: "a".repeat(64),
      expiresAt: "2026-08-25T12:05:00.000Z",
    });
    const challenge = await repository.findMfaChallenge("a".repeat(64));
    expect(challenge?.attempts).toBe(0);
    await repository.incrementMfaChallengeAttempts(challenge!.id);
    expect((await repository.findMfaChallenge("a".repeat(64)))?.attempts).toBe(
      1,
    );
    await repository.consumeMfaChallenge(challenge!.id);
    expect(
      (await repository.findMfaChallenge("a".repeat(64)))?.consumedAt,
    ).not.toBeNull();
  });
});
