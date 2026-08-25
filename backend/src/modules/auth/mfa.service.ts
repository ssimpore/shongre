import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { config } from "../../app/config/index.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

function encryptionKey() {
  return createHash("sha256").update(config.mfaEncryptionKey).digest();
}

function base32Encode(value: Buffer): string {
  let bits = 0;
  let accumulator = 0;
  let result = "";
  for (const byte of value) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  return result;
}

function base32Decode(value: string): Buffer {
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/g, "")) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret");
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret))
    .update(buffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTotpCode(secret: string, nowMs = Date.now()): string {
  return hotp(secret, Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS));
}

export function createMfaSecret(): string {
  return base32Encode(randomBytes(20));
}

export function createMfaSetup(secret: string, email: string) {
  const backupCodes = Array.from({ length: 8 }, () => {
    const value = randomBytes(5).toString("hex").toUpperCase();
    return `${value.slice(0, 5)}-${value.slice(5)}`;
  });
  const label = encodeURIComponent(`Shongre:${email}`);
  const issuer = encodeURIComponent("Shongre");
  return {
    secret,
    backupCodes,
    otpauthUri: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`,
  };
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return {
    secretCiphertext: ciphertext.toString("base64"),
    secretIv: iv.toString("base64"),
    secretAuthTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptMfaSecret(value: {
  secretCiphertext: string;
  secretIv: string;
  secretAuthTag: string;
}): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(value.secretIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.secretAuthTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.secretCiphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function verifyTotp(
  secret: string,
  code: string,
  nowMs = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
  for (const counter of [current - 1, current, current + 1]) {
    const expected = Buffer.from(hotp(secret, counter));
    const submitted = Buffer.from(code);
    if (
      submitted.length === expected.length &&
      timingSafeEqual(submitted, expected)
    )
      return counter;
  }
  return null;
}

export function hashMfaBackupCode(code: string): string {
  return createHmac("sha256", encryptionKey())
    .update(code.replace(/[-\s]/g, "").toUpperCase())
    .digest("hex");
}
