import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMarketingProviderWebhookSignature } from "../../src/integrations/providers/gateways/remote-capability-gateways.js";

describe("Marketing provider webhook signatures", () => {
  const raw = JSON.stringify({ event: "delivered", messageId: "message-1" });
  const secret = "test-only-webhook-secret";
  const timestamp = "1787688000";
  const nowMs = Number(timestamp) * 1_000;
  const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");

  it("accepts a current HMAC using constant-time comparison", () => {
    expect(() => verifyMarketingProviderWebhookSignature(raw, {
      "x-shongre-timestamp": timestamp,
      "x-shongre-signature": `sha256=${signature}`,
    }, { secret, nowMs })).not.toThrow();
  });

  it("rejects tampering and replay outside the five-minute window", () => {
    expect(() => verifyMarketingProviderWebhookSignature(`${raw}x`, {
      "x-shongre-timestamp": timestamp,
      "x-shongre-signature": signature,
    }, { secret, nowMs })).toThrow();
    expect(() => verifyMarketingProviderWebhookSignature(raw, {
      "x-shongre-timestamp": timestamp,
      "x-shongre-signature": signature,
    }, { secret, nowMs: nowMs + 301_000 })).toThrow();
  });
});
