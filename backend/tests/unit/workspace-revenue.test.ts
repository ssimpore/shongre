import { describe, expect, it } from "vitest";
import {
  revenueByCurrency,
  DemoWorkspaceRepository,
} from "../../src/infrastructure/database/repositories/workspace.repository.js";
import { CANONICAL_DEMO_LISTINGS } from "../../src/infrastructure/database/repositories/listing.repository.js";
import { WorkspaceService } from "../../src/modules/workspace/workspace.service.js";

describe("workspace revenue projection", () => {
  it("returns public listing projections rather than private repository fields", async () => {
    const repository = new DemoWorkspaceRepository();
    const snapshot = await repository.getProAnalytics("seller");
    repository.getProAnalytics = async () => ({
      ...snapshot,
      topListings: [{ ...CANONICAL_DEMO_LISTINGS.list_1, safetyRiskScore: 75 }],
    });
    const result = await new WorkspaceService(repository).getProAnalytics(
      "seller",
    );
    expect(result.topListings[0].id).toBe("list_1");
    expect(result.topListings[0]).not.toHaveProperty("safetyRiskScore");
  });
  it("preserves currencies and authoritative minor amounts without implying conversion", () => {
    expect(
      revenueByCurrency([
        { currency: "EUR", itemAmount: 999, itemAmountMinor: 1234 },
        { currency: "EUR", itemAmount: 0.01 },
        { currency: "XOF", itemAmount: 250 },
      ]),
    ).toEqual([
      { currency: "EUR", amountMinor: 1235 },
      { currency: "XOF", amountMinor: 250 },
    ]);
  });
  it("does not invent revenue for an empty period and rejects invalid totals", () => {
    expect(revenueByCurrency([])).toEqual([]);
    expect(() =>
      revenueByCurrency([{ currency: "EUR", itemAmount: NaN }]),
    ).toThrow();
    expect(() =>
      revenueByCurrency([
        { currency: "EUR", itemAmount: 1, itemAmountMinor: -1 },
      ]),
    ).toThrow();
  });
});
