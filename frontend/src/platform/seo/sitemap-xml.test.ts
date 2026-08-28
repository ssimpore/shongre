import { describe, expect, it } from "vitest";
import {
  parseShardId,
  partitionSitemapGroups,
  renderSitemapIndex,
  renderUrlSet,
  sitemapNeedsIndex,
} from "./sitemap-xml";

describe("sitemap XML and sharding", () => {
  it("escapes URLs, emits substantive lastmod, and omits ignored hints", () => {
    const xml = renderUrlSet([
      {
        url: "https://shongre.fr/recherche?category=maison&city=Lyon",
        lastModified: "2026-08-28T10:00:00+02:00",
      },
    ]);
    expect(xml).toContain(
      "https://shongre.fr/recherche?category=maison&amp;city=Lyon",
    );
    expect(xml).toContain("<lastmod>2026-08-28T08:00:00.000Z</lastmod>");
    expect(xml).not.toContain("<priority>");
    expect(xml).not.toContain("<changefreq>");
  });

  it("creates deterministic shards before the 50,000 URL limit", () => {
    const entries = Array.from({ length: 50_001 }, (_, index) => ({
      url: `https://shongre.fr/annonce/${String(index).padStart(5, "0")}`,
    }));
    const groups = [{ id: "listings", entries: [...entries].reverse() }];
    expect(sitemapNeedsIndex(groups)).toBe(true);
    const shards = partitionSitemapGroups(groups);
    expect(shards).toHaveLength(2);
    expect(shards[0].entries).toHaveLength(50_000);
    expect(shards[0].entries[0].url).toBe("https://shongre.fr/annonce/00000");
    expect(shards[1].entries).toHaveLength(1);
  });

  it("renders escaped same-host sitemap index locations", () => {
    expect(
      renderSitemapIndex([
        "https://shongre.com/be/sitemaps/listings-0.xml?source=a&b=c",
      ]),
    ).toContain("?source=a&amp;b=c");
  });

  it("parses only bounded canonical shard identifiers", () => {
    expect(parseShardId("listings-12.xml")).toEqual({
      id: "listings",
      page: 12,
    });
    expect(parseShardId("listings-12")).toBeNull();
    expect(parseShardId("../listings-1.xml")).toBeNull();
    expect(parseShardId("listings")).toBeNull();
  });
});
