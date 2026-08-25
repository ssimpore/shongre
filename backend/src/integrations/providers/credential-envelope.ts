import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface ProviderCredentialEnvelope {
  encryptedSecret: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: string;
  credentialHint: string;
}

function validateKey(key: Buffer) {
  if (key.length !== 32) {
    throw new Error("Provider credential encryption requires a 32-byte key.");
  }
}

export function providerCredentialHint(secret: string): string {
  const suffix = secret.replace(/\s+/g, "").slice(-4).toUpperCase();
  return suffix ? `••••${suffix}` : "••••";
}

export function encryptProviderCredential(
  secret: string,
  key: Buffer,
  keyVersion: string,
): ProviderCredentialEnvelope {
  validateKey(key);
  if (!secret || secret.length > 16_384) {
    throw new Error(
      "Provider credential must contain between 1 and 16384 characters.",
    );
  }
  if (!keyVersion.trim())
    throw new Error("Provider credential key version is required.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encryptedSecret = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedSecret,
    iv,
    authTag: cipher.getAuthTag(),
    keyVersion,
    credentialHint: providerCredentialHint(secret),
  };
}

export function decryptProviderCredential(
  envelope: Pick<
    ProviderCredentialEnvelope,
    "encryptedSecret" | "iv" | "authTag"
  >,
  key: Buffer,
): string {
  validateKey(key);
  const decipher = createDecipheriv("aes-256-gcm", key, envelope.iv);
  decipher.setAuthTag(envelope.authTag);
  return Buffer.concat([
    decipher.update(envelope.encryptedSecret),
    decipher.final(),
  ]).toString("utf8");
}
