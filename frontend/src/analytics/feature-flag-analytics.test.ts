import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DemoFeatureFlagService } from "../api/adapters/demo/demo-feature-flag.service";
import { consentService } from "../domains/consent/consent.service";
import { analyticsService } from "../services/analytics.service";

describe("feature flag analytics boundary", () => {
  beforeEach(() => {
    analyticsService.reset();
    consentService.acceptAll();
  });

  afterEach(() => consentService.clear());

  it("records the evaluated safe result without delegating flag authority to a vendor", async () => {
    const result = await new DemoFeatureFlagService().evaluate(
      "publication.draft_recovery_v2",
      { marketCode: "FR", anonymousId: "anonymous-test" },
    );
    expect(analyticsService.getRecentEvents().at(-1)).toMatchObject({
      name: "feature_flag_evaluated",
      payload: {
        flagKey: result.key,
        enabled: result.enabled,
        variant: result.source,
      },
    });
  });
});
