import type { CurrencyCatalog } from "../schemas/currency";

const DEMO_GENERATED_AT = "2026-09-01T00:00:00.000Z";
const DEMO_EXPIRES_AT = "2099-12-31T23:59:59.000Z";

/**
 * Deterministic display-only rates shared by the Web and backend demo modes.
 * They never represent a provider quote or authorize a payment amount.
 */
export const DETERMINISTIC_DEMO_CURRENCY_CATALOG: CurrencyCatalog = {
  generatedAt: DEMO_GENERATED_AT,
  currencies: [
    {
      code: "EUR",
      displayName: "Euro",
      symbol: "€",
      minorUnitDigits: 2,
      enabled: true,
      version: 1,
      createdAt: DEMO_GENERATED_AT,
      updatedAt: DEMO_GENERATED_AT,
    },
    {
      code: "CHF",
      displayName: "Franc suisse",
      symbol: "CHF",
      minorUnitDigits: 2,
      enabled: true,
      version: 1,
      createdAt: DEMO_GENERATED_AT,
      updatedAt: DEMO_GENERATED_AT,
    },
    {
      code: "XOF",
      displayName: "Franc CFA BCEAO",
      symbol: "F CFA",
      minorUnitDigits: 0,
      enabled: true,
      version: 1,
      createdAt: DEMO_GENERATED_AT,
      updatedAt: DEMO_GENERATED_AT,
    },
  ],
  rates: [
    {
      baseCurrency: "EUR",
      quoteCurrency: "CHF",
      rateNumerator: 94,
      rateDenominator: 100,
      source: "Scénario démo Shongre",
      asOf: DEMO_GENERATED_AT,
      expiresAt: DEMO_EXPIRES_AT,
      enabled: true,
      version: 1,
      createdAt: DEMO_GENERATED_AT,
      updatedAt: DEMO_GENERATED_AT,
    },
    {
      baseCurrency: "EUR",
      quoteCurrency: "XOF",
      rateNumerator: 655_957,
      rateDenominator: 1_000,
      source: "Parité institutionnelle EUR/XOF",
      asOf: DEMO_GENERATED_AT,
      expiresAt: DEMO_EXPIRES_AT,
      enabled: true,
      version: 1,
      createdAt: DEMO_GENERATED_AT,
      updatedAt: DEMO_GENERATED_AT,
    },
  ],
};
