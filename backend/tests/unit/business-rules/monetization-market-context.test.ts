import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import {
  requireCatalogForMarketContext,
  requireMonetizationMarketContext,
} from "../../../src/modules/business-rules/monetization-market-context.js";

const infrastructure = {
  franceDomain: "shongre.fr",
  globalDomain: "shongre.com",
  canonicalProtocol: "https" as const,
};
const market = (hostname: string, pathname: string) =>
  resolveMarketContext({ hostname, pathname, infrastructure });

describe("monetization market context", () => {
  it.each([
    ["shongre.fr", "/", "FR", "fr-FR", "EUR"],
    ["shongre.com", "/be", "BE", "fr-BE", "EUR"],
    ["shongre.com", "/ch", "CH", "fr-CH", "CHF"],
  ])(
    "resolves %s%s without conflating locale and currency",
    (hostname, pathname, countryCode, locale, currency) => {
      expect(
        requireMonetizationMarketContext(market(hostname, pathname)),
      ).toMatchObject({
        countryCode,
        locale,
        currency,
      });
    },
  );

  it.each(["/sn", "/bf"])(
    "denies paid operations for the coming-soon context %s",
    (pathname) => {
      expect(() =>
        requireMonetizationMarketContext(
          market("shongre.com", pathname),
          "paid",
        ),
      ).toThrowError(expect.objectContaining({ code: "CONFLICT" }));
    },
  );

  it("rejects a host/market mismatch and stale or wrong-currency evidence", () => {
    const france = market("shongre.fr", "/");
    const mismatch = { ...france, countryCode: "CH" };
    expect(() => requireMonetizationMarketContext(mismatch)).toThrow();
    expect(() =>
      requireCatalogForMarketContext(
        { ...structuredClone(BASELINE_MONETIZATION_CATALOG), stale: true },
        france,
        "paid",
      ),
    ).toThrowError(expect.objectContaining({ code: "CONFLICT" }));
    expect(() =>
      requireCatalogForMarketContext(
        {
          ...structuredClone(BASELINE_MONETIZATION_CATALOG),
          currency: "CHF",
        },
        france,
      ),
    ).toThrowError(expect.objectContaining({ code: "CONFLICT" }));
  });
});
