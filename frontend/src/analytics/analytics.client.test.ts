import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "./analytics.client";
import { consentService } from "../domains/consent/consent.service";
import {
  allCategories,
  defaultCategories,
} from "../domains/consent/consent.service";

describe("AnalyticsClient", () => {
  beforeEach(() => {
    analyticsClient.clearMemory();
    analyticsClient.resetIdentity();
    consentService.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not collect before consent or contact the backend in demo mode", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await analyticsClient.applyConsent(defaultCategories());
    analyticsClient.track("page_viewed", { path: "/" });
    await Promise.resolve();
    expect(analyticsClient.recentEvents()).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("collects provider-neutral events after consent and stops after withdrawal", async () => {
    consentService.acceptAll();
    await analyticsClient.applyConsent(allCategories());
    analyticsClient.track("page_viewed", { path: "/search?q=secret" });
    expect(analyticsClient.recentEvents()).toHaveLength(1);
    expect(analyticsClient.recentEvents()[0]?.properties).toEqual({
      path: "/search",
    });

    consentService.rejectOptional();
    await analyticsClient.applyConsent(defaultCategories());
    analyticsClient.track("page_viewed", { path: "/after-withdrawal" });
    expect(analyticsClient.recentEvents()).toHaveLength(1);
  });

  it("honors a browser Do Not Track signal", async () => {
    vi.stubGlobal("navigator", { doNotTrack: "1" });
    consentService.acceptAll();
    await analyticsClient.applyConsent(allCategories());
    analyticsClient.track("page_viewed", { path: "/" });
    expect(analyticsClient.recentEvents()).toEqual([]);
  });
});
