import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import type { CredentialKind } from "@shongre/contracts/digital-products";

export interface DigitalSecretField {
  kind: CredentialKind;
  label: string;
  value: string;
}

export interface DigitalSecretPayload {
  destinationUrl?: string;
  fields: DigitalSecretField[];
  instructions?: string;
}

export interface DigitalSecretEnvelope {
  encryptedPayload: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: string;
  credentialHint: string;
  fingerprint: string;
}

function validateKey(key: Buffer): void {
  if (key.length !== 32) {
    throw new Error("Digital fulfillment encryption requires a 32-byte key.");
  }
}

function canonicalPayload(payload: DigitalSecretPayload): string {
  if (
    !payload.destinationUrl &&
    payload.fields.length === 0 &&
    !payload.instructions
  ) {
    throw new Error("A digital fulfillment secret cannot be empty.");
  }
  if (payload.fields.length > 30) {
    throw new Error("A digital fulfillment secret supports at most 30 fields.");
  }
  for (const field of payload.fields) {
    if (!field.label.trim() || !field.value || field.value.length > 16_384) {
      throw new Error("Digital fulfillment secret fields are invalid.");
    }
  }
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > 64 * 1024) {
    throw new Error("Digital fulfillment secret is too large.");
  }
  return serialized;
}

function hintFor(payload: DigitalSecretPayload): string {
  if (payload.destinationUrl) {
    try {
      return new URL(payload.destinationUrl).hostname.toLowerCase();
    } catch {
      return "Accès protégé";
    }
  }
  return payload.fields.length === 1
    ? `${payload.fields[0].label}: ••••`
    : `${payload.fields.length} éléments protégés`;
}

export function encryptDigitalSecret(
  payload: DigitalSecretPayload,
  key: Buffer,
  keyVersion: string,
): DigitalSecretEnvelope {
  validateKey(key);
  if (!keyVersion.trim())
    throw new Error("Digital fulfillment key version is required.");
  const plaintext = canonicalPayload(payload);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(
    Buffer.from(`shongre:digital-fulfillment:${keyVersion}`, "utf8"),
  );
  const encryptedPayload = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedPayload,
    iv,
    authTag: cipher.getAuthTag(),
    keyVersion,
    credentialHint: hintFor(payload),
    fingerprint: createHmac("sha256", key).update(plaintext).digest("hex"),
  };
}

export function decryptDigitalSecret(
  envelope: Pick<
    DigitalSecretEnvelope,
    "encryptedPayload" | "iv" | "authTag" | "keyVersion"
  >,
  key: Buffer,
): DigitalSecretPayload {
  validateKey(key);
  const decipher = createDecipheriv("aes-256-gcm", key, envelope.iv);
  decipher.setAAD(
    Buffer.from(`shongre:digital-fulfillment:${envelope.keyVersion}`, "utf8"),
  );
  decipher.setAuthTag(envelope.authTag);
  const payload = Buffer.concat([
    decipher.update(envelope.encryptedPayload),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(payload) as DigitalSecretPayload;
}

export function maskDigitalSecret(payload: DigitalSecretPayload) {
  return payload.fields.map((field) => ({
    kind: field.kind,
    label: field.label,
    maskedValue: "••••••••",
    revealed: false,
  }));
}
