import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatRelativeTime,
  normalizeSearchFilters,
} from "../src";

describe("cross-platform shared logic", () => {
  it("formats authoritative minor units without floating point drift", () => {
    expect(
      formatMoney({ amountMinor: 299, currency: "EUR" }, "fr-FR"),
    ).toContain("2,99");
  });

  it("normalizes the same search model for Web and native", () => {
    expect(
      normalizeSearchFilters({ query: " vélo ", marketCode: "FR" }),
    ).toMatchObject({ query: "vélo", sort: "relevance" });
  });

  it("formats deterministic relative dates when a reference is supplied", () => {
    expect(
      formatRelativeTime("2026-08-20T10:00:00Z", {
        referenceDate: "2026-08-21T10:00:00Z",
        locale: "fr-FR",
      }),
    ).toBe("hier");
  });
});
