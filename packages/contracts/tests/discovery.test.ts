import { describe, expect, it } from "vitest";
import {
  DISCOVERY_CONFIGURATION_CONSTRAINTS,
  discoveryChangeReasonSchema,
  discoveryConfigurationSchema,
} from "../src/schemas/discovery";

const configuration = {
  version: "test-v1",
  marketCode: "FR",
  context: "search" as const,
  weights: {
    relevance: 0.3,
    category: 0.12,
    location: 0.08,
    quality: 0.16,
    freshness: 0.12,
    trust: 0.12,
    price: 0.06,
    personalization: 0.04,
  },
  freshnessHalfLifeDays: 30,
  diversity: {
    maxConsecutivePerPublisher: 2,
    maxFirstPageSharePerPublisher: 0.35,
    maxSponsoredPerPublisher: 1,
    minimumRelevanceRatio: 0.72,
  },
  sponsored: {
    positions: [2, 7, 13],
    maxPerPage: 3,
    maxShare: 0.2,
    minimumRelevance: 0.25,
    minimumOrganicResults: 4,
  },
};

describe("discovery configuration", () => {
  it("accepts the safe default policy", () => {
    expect(discoveryConfigurationSchema.safeParse(configuration).success).toBe(
      true,
    );
  });

  it("rejects paid-share and weight configurations that can crowd out organics", () => {
    const result = discoveryConfigurationSchema.safeParse({
      ...configuration,
      weights: { ...configuration.weights, relevance: 0.6 },
      sponsored: { ...configuration.sponsored, maxShare: 0.75 },
    });
    expect(result.success).toBe(false);
  });

  it("shares the auditable change-reason constraint with every consumer", () => {
    expect(discoveryChangeReasonSchema.safeParse("short").success).toBe(false);
    expect(
      discoveryChangeReasonSchema.safeParse(
        "x".repeat(DISCOVERY_CONFIGURATION_CONSTRAINTS.changeReason.minLength),
      ).success,
    ).toBe(true);
  });
});
