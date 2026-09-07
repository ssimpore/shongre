import { describe, expect, it } from "vitest";
import type { MarketScopedSearchFilters } from "../contracts/search.contract";
import {
  canonicalSearchGetParams,
  canonicalSearchKey,
  normalizeSearchFilters,
} from "./normalized-search";

describe("normalized search filters", () => {
  it("deduplicates equivalent filters independent of collection order", () => {
    const left = {
      marketCode: " fr ",
      conditions: ["good", "very_good", "good"],
      attributes: { z: ["b", "a"], a: true },
    } satisfies MarketScopedSearchFilters;
    const right = {
      marketCode: "FR",
      attributes: { a: true, z: ["a", "b"] },
      conditions: ["very_good", "good"],
    } satisfies MarketScopedSearchFilters;

    expect(canonicalSearchKey(left)).toEqual(canonicalSearchKey(right));
    expect(normalizeSearchFilters(left)).toEqual({
      marketCode: "FR",
      conditions: ["good", "very_good"],
      attributes: { a: true, z: ["a", "b"] },
    });
  });

  it("creates lexically ordered canonical GET parameters", () => {
    expect(
      Object.keys(
        canonicalSearchGetParams({
          marketCode: "FR",
          query: "vélo",
          city: "Lyon",
          page: 2,
        }),
      ),
    ).toEqual(["city", "marketCode", "page", "query"]);
  });
});
