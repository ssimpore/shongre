import { describe, expect, it } from "vitest";
import { resolveGenericListingPrice } from "./listing-price.presentation";

describe("generic listing price presentation", () => {
  it.each([
    [
      "donation",
      {
        price: 0,
        currency: "EUR",
        isFreeDonation: true,
      },
      "free",
      undefined,
    ],
    [
      "request price",
      {
        price: 0,
        currency: "EUR",
        isFreeDonation: false,
        priceType: "on_request",
      },
      "on_request",
      undefined,
    ],
    [
      "undisclosed salary",
      {
        price: 0,
        currency: "EUR",
        isFreeDonation: false,
        pricePresentation: {
          kind: "salary" as const,
          visibility: "undisclosed" as const,
          currency: "EUR",
        },
      },
      "unpriced",
      "Salary not disclosed",
    ],
  ] as const)(
    "keeps the %s semantic state instead of formatting a synthetic zero",
    (_name, input, kind, label) => {
      expect(resolveGenericListingPrice(input, "en-GB")).toMatchObject({
        kind,
        ...(label ? { label } : {}),
      });
    },
  );

  it("formats a recurring public price from its authoritative semantic currency", () => {
    const price = resolveGenericListingPrice(
      {
        price: 0,
        currency: "EUR",
        isFreeDonation: false,
        pricePresentation: {
          kind: "rent",
          visibility: "public",
          minimumAmountMinor: 245_00,
          maximumAmountMinor: 245_00,
          currency: "CHF",
          period: "month",
        },
      },
      "de-CH",
    );

    expect(price.kind).toBe("amount");
    expect(price.money).toEqual({ amountMinor: 245_00, currency: "CHF" });
    expect(price.label).toContain("CHF");
    expect(price.label).toContain("/ Monat");
  });

  it("uses the currency's real minor-unit exponent for ordinary amounts", () => {
    expect(
      resolveGenericListingPrice(
        {
          price: 12_500,
          currency: "XOF",
          isFreeDonation: false,
        },
        "fr-SN",
      ).money,
    ).toEqual({ amountMinor: 12_500, currency: "XOF" });
  });

  it("hides an ordinary amount when its source currency is unknown", () => {
    expect(
      resolveGenericListingPrice(
        {
          price: 250,
          isFreeDonation: false,
        },
        "fr-FR",
      ),
    ).toEqual({ kind: "unpriced" });
  });
});
