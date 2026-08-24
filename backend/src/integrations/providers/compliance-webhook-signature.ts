import { createHmac, timingSafeEqual } from "node:crypto";

export type ComplianceSignatureResult =
  { ok: true } | { ok: false; reason: string };

/**
 * Provider-neutral HMAC envelope: `t=<unix seconds>,v1=<hex hmac>` where the
 * signed material is `<timestamp>.<raw request body>`.
 */
export function verifyComplianceWebhookSignature(input: {
  rawBody: string;
  signatureHeader?: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): ComplianceSignatureResult {
  if (!input.secret) return { ok: false, reason: "missing endpoint secret" };
  if (!input.signatureHeader)
    return { ok: false, reason: "missing signature header" };
  if (!input.rawBody) return { ok: false, reason: "empty request body" };
  const pairs = Object.fromEntries(
    input.signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  const timestamp = Number(pairs.t);
  if (!Number.isFinite(timestamp) || !pairs.v1)
    return { ok: false, reason: "invalid signature format" };
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > (input.toleranceSeconds ?? 300))
    return { ok: false, reason: "signature timestamp outside tolerance" };
  const expected = createHmac("sha256", input.secret)
    .update(`${pairs.t}.${input.rawBody}`, "utf8")
    .digest("hex");
  const received = Buffer.from(pairs.v1);
  const target = Buffer.from(expected);
  if (received.length !== target.length || !timingSafeEqual(received, target))
    return { ok: false, reason: "signature mismatch" };
  return { ok: true };
}
