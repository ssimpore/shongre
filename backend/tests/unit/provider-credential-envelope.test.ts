import { describe, expect, it } from "vitest";
import {
  decryptProviderCredential,
  encryptProviderCredential,
  providerCredentialHint,
} from "../../src/integrations/providers/credential-envelope.js";

describe("provider credential envelope", () => {
  const key = Buffer.alloc(32, 7);

  it("encrypts with AES-GCM and exposes only a short hint", () => {
    const secret = "sk-customer-owned-super-secret-A94D";
    const envelope = encryptProviderCredential(secret, key, "test-v1");

    expect(envelope.encryptedSecret.toString("utf8")).not.toContain(secret);
    expect(envelope.iv).toHaveLength(12);
    expect(envelope.authTag).toHaveLength(16);
    expect(envelope.credentialHint).toBe("••••A94D");
    expect(decryptProviderCredential(envelope, key)).toBe(secret);
  });

  it("rejects tampered ciphertext and invalid keys", () => {
    const envelope = encryptProviderCredential(
      "customer-secret",
      key,
      "test-v1",
    );
    const tampered = Buffer.from(envelope.encryptedSecret);
    tampered[0] ^= 1;

    expect(() =>
      decryptProviderCredential(
        { ...envelope, encryptedSecret: tampered },
        key,
      ),
    ).toThrow();
    expect(() =>
      encryptProviderCredential("secret", Buffer.alloc(16), "v1"),
    ).toThrow("32-byte key");
    expect(providerCredentialHint("  value-1234  ")).toBe("••••1234");
  });
});
