import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { PlatformRole } from './rbac.js';

/**
 * Session tokens.
 *
 * The wire format is a JWT (HS256) so that the existing frontend, which already
 * sends `Authorization: Bearer <token>`, needs no change and so a future move to
 * Supabase Auth or any standard verifier is a drop-in swap. Signing and
 * verification are done with node:crypto rather than a library because the
 * algorithm is fixed to HS256 here — which also sidesteps the `alg: none` and
 * algorithm-confusion families of JWT bugs, since we never read `alg` from the
 * token to decide how to verify it.
 */

export interface TokenClaims {
  /** Subject: the profile id. */
  sub: string;
  email: string;
  /** Role the session is acting as. Always validated against the account's granted roles. */
  role: PlatformRole;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. */
  exp: number;
  /** Token id, so individual sessions can be revoked later. */
  jti: string;
  /** Server-side session row. Absent only on legacy tokens during rollout. */
  sid?: string;
}

export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

export const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64');
}

function sign(payload: string, secret: string): string {
  return base64UrlEncode(createHmac('sha256', secret).update(payload).digest());
}

const HEADER = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

export function issueToken(
  claims: Omit<TokenClaims, 'iat' | 'exp' | 'jti'>,
  secret: string,
  ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS
): string {
  if (!secret) {
    throw new TokenError('Cannot issue a token without a signing secret.');
  }
  const now = Math.floor(Date.now() / 1000);
  const full: TokenClaims = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
    jti: randomUUID(),
  };
  const body = `${HEADER}.${base64UrlEncode(JSON.stringify(full))}`;
  return `${body}.${sign(body, secret)}`;
}

/**
 * Verifies signature and expiry, and returns the claims.
 *
 * Throws on every failure path rather than returning null, so that a caller
 * cannot accidentally treat an unverified token as anonymous-but-fine.
 */
export function verifyToken(token: string, secret: string): TokenClaims {
  if (!secret) {
    throw new TokenError('Cannot verify a token without a signing secret.');
  }
  if (typeof token !== 'string' || token.length === 0) {
    throw new TokenError('Missing token.');
  }

  const segments = token.split('.');
  if (segments.length !== 3) {
    throw new TokenError('Malformed token.');
  }

  const [header, payload, signature] = segments;
  const expected = sign(`${header}.${payload}`, secret);

  // Compare as buffers of equal length; timingSafeEqual throws on length mismatch.
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
    throw new TokenError('Invalid token signature.');
  }

  let claims: TokenClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payload).toString('utf8'));
  } catch {
    throw new TokenError('Unreadable token payload.');
  }

  if (!claims || typeof claims.sub !== 'string' || !claims.sub) {
    throw new TokenError('Token is missing a subject.');
  }
  if (typeof claims.exp !== 'number' || Number.isNaN(claims.exp)) {
    throw new TokenError('Token is missing an expiry.');
  }
  if (Math.floor(Date.now() / 1000) >= claims.exp) {
    throw new TokenError('Token has expired.');
  }

  return claims;
}

/** Extracts the raw bearer token from an Authorization header value. */
export function extractBearerToken(headerValue: string | string[] | undefined): string | null {
  if (!headerValue) return null;
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
}
