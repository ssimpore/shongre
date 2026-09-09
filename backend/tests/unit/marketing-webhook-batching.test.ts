import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL(
    "../../src/modules/marketing/marketing-provider-webhook.service.ts",
    import.meta.url,
  ),
  "utf8",
);

/**
 * A provider may deliver up to a thousand normalized events in one webhook
 * request. The handler used to resolve each event's recipient — and, failing
 * that, its automation message — inside the loop, so a full delivery meant two
 * thousand sequential database round-trips before any per-event work began.
 * That is enough to exceed a provider's webhook timeout, which earns a retry of
 * work that has already partly run.
 *
 * Both lookups are now resolved for the whole batch up front. These assertions
 * pin that shape: the marker of the regression is a `.maybeSingle()` recipient
 * or automation-message read sitting inside the event loop.
 */
describe("marketing provider webhook batching", () => {
  const loopStart = source.indexOf("for (const event of batch)");
  const loopBody = source.slice(loopStart);

  it("resolves recipients and automation messages before the event loop", () => {
    expect(loopStart).toBeGreaterThan(-1);
    const preamble = source.slice(0, loopStart);
    expect(preamble).toContain('.in("provider_message_id", messageIds)');
    expect(preamble).toContain('.in("provider_message_id", unmatched)');
    expect(preamble).toContain("recipientsByMessageId");
    expect(preamble).toContain("automationMessagesByMessageId");
  });

  it("issues no per-event recipient or automation-message read", () => {
    for (const table of [
      "marketing_campaign_recipients",
      "marketing_automation_messages",
    ]) {
      const perEventRead = new RegExp(
        `from\\("${table}"\\)[\\s\\S]{0,400}?\\.maybeSingle\\(\\)`,
      );
      expect(
        perEventRead.test(loopBody),
        `${table} is still read one event at a time inside the loop`,
      ).toBe(false);
    }
  });

  it("keeps the batch explicitly bounded", () => {
    expect(source).toContain("const MAX_EVENTS_PER_DELIVERY = 1_000;");
    expect(source).toContain("events.slice(0, MAX_EVENTS_PER_DELIVERY)");
  });

  it("still verifies signatures, deduplicates and queues secondary work", () => {
    // Batching must not have removed the guarantees around it.
    expect(source).toContain("marketing_provider_webhook_receipts");
    expect(source).toContain("duplicate: true");
    expect(source).toContain("enqueueMarketingWebhookEvent");
  });
});
