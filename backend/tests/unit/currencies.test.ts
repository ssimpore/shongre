import { describe, expect, it } from "vitest";
import {
  DemoCurrencyRepository,
  DemoMarketRepository,
} from "../../src/infrastructure/database/repositories/index.js";
import { CurrenciesService } from "../../src/modules/currencies/currencies.service.js";
import { MarketsService } from "../../src/modules/markets/markets.service.js";

const ACTOR = "00000000-0000-4000-8000-000000000001";

describe("currency administration", () => {
  it("exposes only enabled definitions and rates publicly", async () => {
    const currencies = new DemoCurrencyRepository();
    const markets = new DemoMarketRepository();
    const service = new CurrenciesService(currencies, markets);
    await currencies.upsertCurrency(
      "USD",
      {
        displayName: "Dollar américain",
        symbol: "$",
        minorUnitDigits: 2,
        enabled: false,
        reason: "Création désactivée pour validation",
      },
      ACTOR,
    );

    expect((await service.getPublicCatalog()).currencies).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "USD" })]),
    );
    expect((await service.getAdminCatalog()).currencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "USD" })]),
    );
  });

  it("prevents disabling a currency referenced by a market", async () => {
    const service = new CurrenciesService(
      new DemoCurrencyRepository(),
      new DemoMarketRepository(),
    );
    await expect(
      service.upsertCurrency(
        "EUR",
        {
          displayName: "Euro",
          symbol: "€",
          minorUnitDigits: 2,
          enabled: false,
          reason: "Désactivation volontaire de contrôle",
        },
        ACTOR,
      ),
    ).rejects.toThrow(/FR/);
  });

  it("rejects unknown pairs and invalid active-rate dates", async () => {
    const service = new CurrenciesService(
      new DemoCurrencyRepository(),
      new DemoMarketRepository(),
    );
    await expect(
      service.upsertExchangeRate(
        "EUR",
        "USD",
        {
          rateNumerator: 11,
          rateDenominator: 10,
          source: "Test",
          asOf: "2026-09-01T00:00:00.000Z",
          expiresAt: "2099-09-03T00:00:00.000Z",
          enabled: true,
          reason: "Paire inconnue refusée par le service",
        },
        ACTOR,
      ),
    ).rejects.toThrow(/exister/);
    await expect(
      service.upsertExchangeRate(
        "EUR",
        "CHF",
        {
          rateNumerator: 94,
          rateDenominator: 100,
          source: "Test",
          asOf: "2020-01-01T00:00:00.000Z",
          expiresAt: "2020-01-02T00:00:00.000Z",
          enabled: true,
          reason: "Taux expiré refusé par le service",
        },
        ACTOR,
      ),
    ).rejects.toThrow(/expiré/);
    await expect(
      service.upsertExchangeRate(
        "EUR",
        "CHF",
        {
          rateNumerator: 94,
          rateDenominator: 100,
          source: "Test",
          asOf: "2099-01-01T00:00:00.000Z",
          expiresAt: "2099-01-02T00:00:00.000Z",
          enabled: true,
          reason: "Taux futur refusé par le service",
        },
        ACTOR,
      ),
    ).rejects.toThrow(/future/);
  });

  it("rejects a disabled default or display currency in market governance", async () => {
    const currencyRepo = new DemoCurrencyRepository();
    await currencyRepo.upsertCurrency(
      "CHF",
      {
        displayName: "Franc suisse",
        symbol: "CHF",
        minorUnitDigits: 2,
        enabled: false,
        reason: "Désactivation de test du franc suisse",
      },
      ACTOR,
    );
    const service = new MarketsService(
      new DemoMarketRepository(),
      currencyRepo,
    );
    await expect(
      service.updateCountryConfiguration(
        "CH",
        {
          expectedVersion: 1,
          reason: "Validation des devises du marché suisse",
          patch: { supportedCurrencies: ["CHF", "EUR"] },
        },
        ACTOR,
      ),
    ).rejects.toThrow(/désactivées/);
  });
});
