import { describe, expect, it } from "vitest";
import { COUNTRY_REGISTRY, getDefaultCountryConfig } from "@shongre/contracts";
import { resolveInitialMarketSelection } from "./market-selection.preference";

describe("manual market selection precedence", () => {
  const defaultCode = getDefaultCountryConfig().code;
  const alternative = COUNTRY_REGISTRY.find(
    (country) => country.code !== defaultCode,
  )!;

  it("keeps a valid manual country ahead of request and automatic state", () => {
    expect(
      resolveInitialMarketSelection({
        manualCountryCode: alternative.code,
        requestCountryCode: defaultCode,
        defaultCountryCode: defaultCode,
      }),
    ).toBe(alternative.code);
  });

  it("returns to request context after the manual override is reset", () => {
    expect(
      resolveInitialMarketSelection({
        manualCountryCode: null,
        requestCountryCode: alternative.code,
        defaultCountryCode: defaultCode,
      }),
    ).toBe(alternative.code);
  });

  it("ignores invalid persisted configuration", () => {
    expect(
      resolveInitialMarketSelection({
        manualCountryCode: "ZZ",
        requestCountryCode: alternative.code,
        defaultCountryCode: defaultCode,
      }),
    ).toBe(alternative.code);
  });
});
