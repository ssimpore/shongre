import { beforeEach, describe, expect, it, vi } from "vitest";

const { inbox, dispatchStripe, dispatchCompliance } = vi.hoisted(() => ({
  inbox: {
    claim: vi.fn(),
    complete: vi.fn(),
    purgeProcessed: vi.fn(),
  },
  dispatchStripe: vi.fn(),
  dispatchCompliance: vi.fn(),
}));

vi.mock("../../src/infrastructure/queue/provider-webhook-inbox.js", () => ({
  providerWebhookInbox: inbox,
}));
vi.mock("../../src/integrations/stripe/stripe-webhook-dispatcher.js", () => ({
  stripeWebhookDispatcher: { dispatch: dispatchStripe },
}));
vi.mock("../../src/modules/compliance/compliance.service.js", () => ({
  complianceService: { handleProviderWebhook: dispatchCompliance },
}));

import { ProviderWebhookWorker } from "../../src/workers/payments/provider-webhook-worker.js";

const receipt = (provider: string, eventType: string) => ({
  provider,
  providerEventId: `${provider}-event`,
  eventType,
  payload: { id: `${provider}-event`, type: eventType },
  rawBody: JSON.stringify({ id: `${provider}-event`, type: eventType }),
  attemptCount: 1,
});

describe("provider webhook worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inbox.complete.mockResolvedValue(undefined);
    dispatchStripe.mockResolvedValue({});
    dispatchCompliance.mockResolvedValue({ duplicate: false });
  });

  it("dispatches every verified ingress through the durable inbox", async () => {
    inbox.claim.mockResolvedValue([
      receipt("stripe", "payment_intent.succeeded"),
      receipt("stripe_connect_v2", "v2.core.account.updated"),
      receipt("compliance_identity", "identity.updated"),
      receipt("compliance_payment", "account.updated"),
    ]);

    const result = await new ProviderWebhookWorker().run();

    expect(result).toEqual({ processed: 4, failed: 0 });
    expect(dispatchStripe).toHaveBeenCalledTimes(1);
    expect(dispatchCompliance).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ provider: "payment" }),
    );
    expect(dispatchCompliance).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ provider: "identity" }),
    );
    expect(dispatchCompliance).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ provider: "payment" }),
    );
    expect(inbox.complete).toHaveBeenCalledTimes(4);
  });

  it("records a retryable failure instead of acknowledging unsupported work", async () => {
    const unsupported = receipt("unknown", "unknown.event");
    inbox.claim.mockResolvedValue([unsupported]);

    await expect(new ProviderWebhookWorker().run()).resolves.toEqual({
      processed: 0,
      failed: 1,
    });
    expect(inbox.complete).toHaveBeenCalledWith(unsupported, expect.any(Error));
  });
});
