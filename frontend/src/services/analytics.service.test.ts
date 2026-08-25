import { beforeEach, describe, expect, it } from "vitest";
import { analyticsService } from "./analytics.service";
import { consentService } from "../domains/consent/consent.service";

describe("analyticsService", () => {
  beforeEach(() => {
    analyticsService.reset();
    consentService.clear();
  });

  it("keeps the collector behind consent", () => {
    analyticsService.track("trending_section_view", { source: "trending_now" });
    expect(analyticsService.getRecentEvents()).toHaveLength(0);
  });

  it("attaches the complete market context to every accepted event", () => {
    consentService.acceptAll();
    analyticsService.setMarketContext({
      country: "CH",
      locale: "fr-CH",
      domain: "shongre.com",
      market: "CH",
      currency: "CHF",
    });

    analyticsService.track("trending_section_view", {
      source: "trending_now",
    });

    expect(analyticsService.getRecentEvents()[0]).toMatchObject({
      country: "CH",
      locale: "fr-CH",
      domain: "shongre.com",
      market: "CH",
      currency: "CHF",
    });
  });
});
