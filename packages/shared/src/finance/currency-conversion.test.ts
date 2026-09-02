import { describe, expect, it } from "vitest";
import {
  DETERMINISTIC_DEMO_CURRENCY_CATALOG,
  type CurrencyCatalog,
} from "@shongre/contracts";
import { convertMoney, CurrencyConversionError } from "./currency-conversion";

const NOW = new Date("2026-09-02T12:00:00.000Z");

describe("currency conversion", () => {
  it("converts authoritative minor units without overwriting the original", () => {
    const original = { amountMinor: 129_000, currency: "EUR" };
    const projection = convertMoney(
      original,
      "CHF",
      DETERMINISTIC_DEMO_CURRENCY_CATALOG,
      NOW,
    );

    expect(projection).toMatchObject({
      original,
      display: { amountMinor: 121_260, currency: "CHF" },
      converted: true,
      estimated: true,
      rateSource: "Scénario démo Shongre",
    });
    expect(original).toEqual({ amountMinor: 129_000, currency: "EUR" });
  });

  it("uses inverse and indirect paths with each currency's minor-unit precision", () => {
    expect(
      convertMoney(
        { amountMinor: 94, currency: "CHF" },
        "EUR",
        DETERMINISTIC_DEMO_CURRENCY_CATALOG,
        NOW,
      ).display,
    ).toEqual({ amountMinor: 100, currency: "EUR" });

    expect(
      convertMoney(
        { amountMinor: 656, currency: "XOF" },
        "CHF",
        DETERMINISTIC_DEMO_CURRENCY_CATALOG,
        NOW,
      ).display,
    ).toEqual({ amountMinor: 94, currency: "CHF" });
  });

  it("rounds positive and negative half units consistently", () => {
    const catalog: CurrencyCatalog = {
      ...DETERMINISTIC_DEMO_CURRENCY_CATALOG,
      rates: [
        {
          ...DETERMINISTIC_DEMO_CURRENCY_CATALOG.rates[0]!,
          rateNumerator: 1,
          rateDenominator: 2,
        },
      ],
    };
    expect(
      convertMoney({ amountMinor: 1, currency: "EUR" }, "CHF", catalog, NOW)
        .display.amountMinor,
    ).toBe(1);
    expect(
      convertMoney({ amountMinor: -1, currency: "EUR" }, "CHF", catalog, NOW)
        .display.amountMinor,
    ).toBe(-1);
  });

  it("fails closed for invalid, stale, missing, disabled, and unsafe conversions", () => {
    const invalidCatalog: CurrencyCatalog = {
      ...DETERMINISTIC_DEMO_CURRENCY_CATALOG,
      rates: [
        {
          ...DETERMINISTIC_DEMO_CURRENCY_CATALOG.rates[0]!,
          rateDenominator: 0,
        },
      ],
    };
    expect(() =>
      convertMoney(
        { amountMinor: 100, currency: "EUR" },
        "CHF",
        invalidCatalog,
        NOW,
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_RATE" }));

    const staleCatalog: CurrencyCatalog = {
      ...DETERMINISTIC_DEMO_CURRENCY_CATALOG,
      rates: DETERMINISTIC_DEMO_CURRENCY_CATALOG.rates.map((rate) => ({
        ...rate,
        expiresAt: "2026-09-02T00:00:00.000Z",
      })),
    };
    expect(() =>
      convertMoney(
        { amountMinor: 100, currency: "EUR" },
        "CHF",
        staleCatalog,
        NOW,
      ),
    ).toThrowError(expect.objectContaining({ code: "STALE_RATE" }));

    const missingCatalog = {
      ...DETERMINISTIC_DEMO_CURRENCY_CATALOG,
      rates: [],
    };
    expect(() =>
      convertMoney(
        { amountMinor: 100, currency: "EUR" },
        "CHF",
        missingCatalog,
        NOW,
      ),
    ).toThrowError(expect.objectContaining({ code: "MISSING_RATE" }));

    const disabledCatalog: CurrencyCatalog = {
      ...DETERMINISTIC_DEMO_CURRENCY_CATALOG,
      currencies: DETERMINISTIC_DEMO_CURRENCY_CATALOG.currencies.map(
        (currency) =>
          currency.code === "CHF" ? { ...currency, enabled: false } : currency,
      ),
    };
    expect(() =>
      convertMoney(
        { amountMinor: 100, currency: "EUR" },
        "CHF",
        disabledCatalog,
        NOW,
      ),
    ).toThrowError(expect.objectContaining({ code: "DISABLED_CURRENCY" }));

    expect(() =>
      convertMoney(
        { amountMinor: Number.MAX_SAFE_INTEGER + 1, currency: "EUR" },
        "CHF",
        DETERMINISTIC_DEMO_CURRENCY_CATALOG,
        NOW,
      ),
    ).toThrow(CurrencyConversionError);
  });

  it("does not call a same-currency amount an estimate", () => {
    expect(
      convertMoney(
        { amountMinor: 0, currency: "EUR" },
        "EUR",
        DETERMINISTIC_DEMO_CURRENCY_CATALOG,
        NOW,
      ),
    ).toMatchObject({
      display: { amountMinor: 0, currency: "EUR" },
      converted: false,
      estimated: false,
    });
  });
});
