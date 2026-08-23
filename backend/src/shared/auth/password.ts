import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * Password hashing for Shongre accounts.
 *
 * scrypt is used rather than bcrypt/argon2 because it ships in Node's standard
 * library: authentication must not be blocked on adding a native dependency,
 * and scrypt is memory-hard, which is the property that matters against
 * offline cracking of a leaked profile table.
 *
 * Stored format is self-describing so the parameters can be raised later
 * without invalidating existing hashes:
 *
 *   scrypt$<keylen>$<salt-hex>$<hash-hex>
 */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = "scrypt";

/**
 * Minimum length accepted at registration. Enforced server-side, never only in
 * the form.
 *
 * 8 matches what the registration screens already validate and NIST 800-63B,
 * which recommends a length floor and explicitly advises against composition
 * rules (forced symbols/digits) since they push users toward predictable
 * substitutions.
 */
export const MIN_PASSWORD_LENGTH = 8;

export class WeakPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeakPasswordError";
  }
}

/**
 * Rejects the passwords that show up first in every credential-stuffing list.
 * Deliberately minimal: length is the property that actually correlates with
 * resistance, and a large blocklist belongs in a dedicated service.
 */
export function assertPasswordAcceptable(password: string): void {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(
      `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    );
  }
  if (/^\d+$/.test(password)) {
    throw new WeakPasswordError(
      "Le mot de passe ne peut pas être uniquement numérique.",
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordAcceptable(password);
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${PREFIX}$${KEY_LENGTH}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Constant-time verification.
 *
 * Returns false rather than throwing on a malformed or absent stored hash so
 * that callers cannot distinguish "no such account" from "wrong password" by
 * catching an exception — that distinction is what turns a login form into a
 * user enumeration oracle.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (!storedHash || typeof password !== "string" || password.length === 0)
    return false;

  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;

  const keylen = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(keylen) || keylen <= 0 || keylen > 512) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2], "hex");
    expected = Buffer.from(parts[3], "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length !== keylen) return false;

  const derived = await scrypt(password, salt, keylen);
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

/**
 * Burns roughly the same CPU as a real verification.
 *
 * Called on the "account does not exist" branch of login so that a missing
 * account and a wrong password take comparable time. Without this, response
 * latency alone reveals which email addresses are registered.
 */
export async function simulatePasswordVerification(): Promise<void> {
  await scrypt("timing-equalizer", randomBytes(SALT_LENGTH), KEY_LENGTH);
}
