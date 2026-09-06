import { describe, expect, it } from "vitest";
import { INITIAL_LISTINGS } from "../../mocks/initialDemoData";
import { toDemoDiscoveryDocument } from "./discovery.mapper";

describe("demo discovery mapping", () => {
  it("uses the ISO currency exponent when adapting legacy major units", () => {
    const document = toDemoDiscoveryDocument({
      ...INITIAL_LISTINGS[0],
      price: 12_500,
      currency: "XOF",
      marketCode: "SN",
      marketCodes: ["SN"],
    });

    expect(document.priceMinor).toBe(12_500);
    expect(document.currency).toBe("XOF");
  });

  it("does not promote a creation timestamp into a publication timestamp", () => {
    const document = toDemoDiscoveryDocument({
      ...INITIAL_LISTINGS[0],
      publishedAt: undefined,
    });

    expect(document.createdAt).toBe(INITIAL_LISTINGS[0].createdAt);
    expect(document.publishedAt).toBeUndefined();
  });
});
