import { describe, expect, it } from "vitest";
import { DemoMarketingService } from "./demo-marketing.service";

describe("DemoMarketingService", () => {
  it("returns deterministic marketing dashboards and campaign inventory", async () => {
    const first = new DemoMarketingService();
    const second = new DemoMarketingService();
    expect(await first.getDashboard()).toEqual(await second.getDashboard());
    expect(await first.listCampaigns()).toEqual(await second.listCampaigns());
  });

  it("models public double opt-in without browser storage", async () => {
    const service = new DemoMarketingService();
    const receipt = await service.subscribePublic({
      email: "reader@example.fr",
      marketCode: "FR",
      locale: "fr-FR",
      topics: ["editorial"],
      source: "FOOTER",
      consentGiven: true,
    });
    expect(receipt.status).toBe("PENDING_CONFIRMATION");

    const confirmed = await service.confirmPublic("demo-confirm-pending-example-fr-00000000000000000000");
    expect(confirmed.status).toBe("SUBSCRIBED");
  });

  it("uses scoped preference and unsubscribe tokens", async () => {
    const service = new DemoMarketingService();
    const preferenceToken = "demo-preferences-camille-example-fr-0000000000000000";
    const unsubscribeToken = "demo-unsubscribe-camille-example-fr-0000000000000000";
    const updated = await service.updatePublicPreferences({ token: preferenceToken, topics: ["new_features"] });
    expect(updated.topics).toEqual(["new_features"]);

    await service.unsubscribePublic(unsubscribeToken);
    expect((await service.listProfiles({ query: "camille@example.fr" })).items[0].status).toBe("UNSUBSCRIBED");
    expect(await service.listSuppressions()).toHaveLength(1);
  });

  it("keeps signed-in account preferences behind account-scoped methods", async () => {
    const service = new DemoMarketingService();
    const identity = { userId: "user-camille", email: "camille@example.fr", marketCode: "FR" };
    expect((await service.getAccountSubscription(identity))?.status).toBe("SUBSCRIBED");
    expect((await service.updateAccountPreferences({ ...identity, topics: ["local_trends"] })).topics).toEqual(["local_trends"]);
    expect((await service.unsubscribeAccount(identity)).status).toBe("UNSUBSCRIBED");
    expect((await service.subscribeAccount({ ...identity, topics: ["editorial"], consentGiven: true })).status).toBe("PENDING");
  });

  it("blocks campaigns missing a legal unsubscribe block", async () => {
    const service = new DemoMarketingService();
    const campaign = await service.createCampaign({
      name: "Invalid campaign",
      subject: "Missing legal footer",
      content: { blocks: [{ id: "copy", type: "PARAGRAPH", text: "Bonjour" }] },
      audience: { includeListIds: ["12000000-0000-4000-8000-000000000001"], includeSegmentIds: [], includeProfileIds: [], excludeListIds: [], excludeSegmentIds: [], excludeProfileIds: [] },
      senderIdentityId: "16000000-0000-4000-8000-000000000001",
    });
    const preflight = await service.preflight(campaign.id);
    expect(preflight.canSend).toBe(false);
    expect(preflight.blockers.map((item) => item.code)).toContain("UNSUBSCRIBE_REQUIRED");
  });
});
