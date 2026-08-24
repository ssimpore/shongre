import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyComplianceWebhookSignature } from "../../../src/integrations/providers/compliance-webhook-signature.js";

describe("compliance webhook signature", () => {
  it("authenticates exact raw bytes and rejects stale replays", () => {
    const rawBody = '{"eventId":"evt_1"}';
    const secret = "test-compliance-webhook-secret";
    const timestamp = 1_800_000_000;
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const header = `t=${timestamp},v1=${signature}`;
    expect(
      verifyComplianceWebhookSignature({
        rawBody,
        signatureHeader: header,
        secret,
        nowSeconds: timestamp,
      }),
    ).toEqual({ ok: true });
    expect(
      verifyComplianceWebhookSignature({
        rawBody,
        signatureHeader: header,
        secret,
        nowSeconds: timestamp + 301,
      }),
    ).toEqual({ ok: false, reason: "signature timestamp outside tolerance" });
  });

  it("does not accept a re-serialized or modified body", () => {
    const secret = "test-compliance-webhook-secret";
    const timestamp = 1_800_000_000;
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.{"a":1}`)
      .digest("hex");
    expect(
      verifyComplianceWebhookSignature({
        rawBody: '{"a": 1}',
        signatureHeader: `t=${timestamp},v1=${signature}`,
        secret,
        nowSeconds: timestamp,
      }).ok,
    ).toBe(false);
  });
});
