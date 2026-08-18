import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Stripe webhook signature verification.
 *
 * The endpoint previously accepted any POST body and returned {received:true},
 * which made it an unauthenticated write path into payment state: anyone who
 * knew the URL could announce that an order had been paid. Stripe signs the
 * raw request body with the endpoint secret, and that signature is the only
 * thing distinguishing a real event from a forged one.
 *
 * Implemented directly rather than via stripe.webhooks.constructEvent so that
 * verification works identically in demo mode, where the Stripe SDK is not
 * configured, and so it stays unit-testable without network or SDK state.
 */

export interface StripeSignatureInput {
  /** The exact bytes received, not a re-serialization of the parsed JSON. */
  payload: string;
  signatureHeader: string | undefined;
  secret: string;
  /** Maximum accepted age of the signed timestamp. Stripe's own default is 5 minutes. */
  toleranceSeconds?: number;
  /** Injectable for tests. */
  nowSeconds?: number;
}

export type StripeSignatureResult = { ok: true } | { ok: false; reason: string };

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Parses the Stripe-Signature header, which looks like:
 *   t=1614556800,v1=5257a869e7...,v1=...
 * Multiple v1 entries occur during secret rotation; any one matching is valid.
 */
function parseSignatureHeader(header: string): { timestamp: string | null; signatures: string[] } {
  const parts = header.split(',');
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') signatures.push(value);
  }

  return { timestamp, signatures };
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyStripeSignature(input: StripeSignatureInput): StripeSignatureResult {
  const { payload, signatureHeader, secret } = input;
  const tolerance = input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!secret) return { ok: false, reason: 'no endpoint secret configured' };
  if (!signatureHeader) return { ok: false, reason: 'missing Stripe-Signature header' };
  if (typeof payload !== 'string' || payload.length === 0) {
    return { ok: false, reason: 'empty request body' };
  }

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  if (!timestamp) return { ok: false, reason: 'signature header has no timestamp' };
  if (signatures.length === 0) return { ok: false, reason: 'signature header has no v1 signature' };

  const timestampSeconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: 'signature timestamp is not a number' };
  }

  // The timestamp is part of the signed material, so an attacker cannot edit it
  // without invalidating the signature. Checking it bounds how long a captured
  // legitimate event stays replayable.
  if (Math.abs(now - timestampSeconds) > tolerance) {
    return { ok: false, reason: 'signature timestamp outside tolerance window' };
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');

  for (const candidate of signatures) {
    if (constantTimeEquals(candidate, expected)) return { ok: true };
  }

  return { ok: false, reason: 'no signature matched' };
}

/** Produces a valid header for the given payload. Used by tests. */
export function buildStripeSignatureHeader(payload: string, secret: string, timestampSeconds: number): string {
  const signature = createHmac('sha256', secret).update(`${timestampSeconds}.${payload}`, 'utf8').digest('hex');
  return `t=${timestampSeconds},v1=${signature}`;
}
