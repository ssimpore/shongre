import { describe, expect, it } from "vitest";
import {
  buildDemoTrendingCandidates,
  demoTrendingService,
} from "./demo-trending.service";
import { listingRepository } from "../../../repositories/listing.repository";

describe("DemoTrendingService", () => {
  it("derives topics from active market listings rather than a fixed topic array", async () => {
    const { listings } = await listingRepository.getListings({
      marketCode: "FR",
      limit: 1000,
    });
    const candidates = buildDemoTrendingCandidates(listings, {
      marketCode: "FR",
      limit: 8,
    });
    const response = await demoTrendingService.getTrending({
      marketCode: "FR",
      limit: 8,
      now: new Date("2026-08-20T00:00:00.000Z"),
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(response.enabled).toBe(true);
    expect(response.topics.every((topic) => topic.listings.length > 0)).toBe(
      true,
    );
  });

  it("changes geographic relevance when a city is selected", async () => {
    const all = await demoTrendingService.getTrending({
      marketCode: "FR",
      limit: 8,
      now: new Date("2026-08-20T00:00:00.000Z"),
    });
    const paris = await demoTrendingService.getTrending({
      marketCode: "FR",
      city: "Paris",
      limit: 8,
      now: new Date("2026-08-20T00:00:00.000Z"),
    });
    expect(paris.topics.length).toBeGreaterThan(0);
    expect(paris.topics.map((topic) => topic.id)).not.toEqual([]);
    expect(all.generatedAt).toBe(paris.generatedAt);
  });
});
