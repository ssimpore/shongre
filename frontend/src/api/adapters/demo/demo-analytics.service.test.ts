import { describe, expect, it } from "vitest";
import { analyticsProviderHealthSchema } from "@shongre/contracts/analytics";

import { demoAnalyticsService } from "./demo-analytics.service";

describe("DemoAnalyticsService", () => {
  it("exposes the marketplace overview and subscription intelligence", async () => {
    const scope = { range: "30d", marketCode: "FR" } as const;
    const [overview, monetization] = await Promise.all([
      demoAnalyticsService.getOverview(scope),
      demoAnalyticsService.getMonetization(scope),
    ]);

    expect(overview.metrics.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "visitors",
        "registrations",
        "published",
        "listing_views",
        "favorites",
        "contacts",
        "conversations",
        "transactions",
        "contact_conversion",
      ]),
    );
    expect(monetization.metrics.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["revenue", "mrr", "arr", "churn", "arpu"]),
    );
  });

  it("mirrors every provider exposed by the production health contract", async () => {
    const providers = await demoAnalyticsService.getProviderHealth();

    expect(providers.map(({ provider }) => provider)).toEqual([
      "internal",
      "posthog",
      "ga4",
      "matomo",
      "cloudflare",
      "search_console",
      "sentry",
    ]);
    for (const provider of providers) {
      expect(analyticsProviderHealthSchema.parse(provider)).toEqual(provider);
    }
  });
});
