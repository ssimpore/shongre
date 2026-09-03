import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CURRENCY_CODE_LENGTH,
  CURRENCY_CONFIGURATION_REASON_MAX_LENGTH,
  CURRENCY_CONFIGURATION_REASON_MIN_LENGTH,
  CURRENCY_MINOR_UNIT_DIGITS_MAX,
  CURRENCY_MINOR_UNIT_DIGITS_MIN,
  EXCHANGE_RATE_COMPONENT_MIN,
  MARKET_CONFIGURATION_REASON_MAX_LENGTH,
  MARKET_CONFIGURATION_REASON_MIN_LENGTH,
  type CurrencyCatalog,
} from "@shongre/contracts";
import { Coins, RefreshCw } from "lucide-react";
import { Button } from "../../design-system/primitives/Button";
import { Badge } from "../../design-system/primitives/Badge";
import { Select } from "../../design-system";
import { services } from "../../api/client/service-registry";
import type { CountryMarketDefinition } from "../../configuration/market.config";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";

const inputClassName =
  "min-h-control-md w-full rounded-control border border-border-base bg-bg-surface px-3 py-2 text-xs text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function toDatetimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export const CurrencyManagementPanel: React.FC = () => {
  const { t } = useTranslation();
  const { can } = useAuth();
  const toast = useToast();
  const canConfigure = can("market.configure");
  const [catalog, setCatalog] = useState<CurrencyCatalog | null>(null);
  const [markets, setMarkets] = useState<CountryMarketDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [currencyName, setCurrencyName] = useState("Euro");
  const [currencySymbol, setCurrencySymbol] = useState("€");
  const [minorUnitDigits, setMinorUnitDigits] = useState(2);
  const [currencyEnabled, setCurrencyEnabled] = useState(true);
  const [currencyReason, setCurrencyReason] = useState("");

  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [quoteCurrency, setQuoteCurrency] = useState("CHF");
  const [rateNumerator, setRateNumerator] = useState(94);
  const [rateDenominator, setRateDenominator] = useState(100);
  const [rateSource, setRateSource] = useState("Source administrée");
  const [rateAsOf, setRateAsOf] = useState(() =>
    toDatetimeLocal(new Date().toISOString()),
  );
  const [rateExpiresAt, setRateExpiresAt] = useState(() =>
    toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString()),
  );
  const [rateEnabled, setRateEnabled] = useState(true);
  const [rateReason, setRateReason] = useState("");

  const [marketCode, setMarketCode] = useState("FR");
  const selectedMarket = useMemo(
    () => markets.find((market) => market.code === marketCode) || markets[0],
    [marketCode, markets],
  );
  const [marketDefaultCurrency, setMarketDefaultCurrency] = useState("EUR");
  const [marketCurrencies, setMarketCurrencies] = useState<string[]>(["EUR"]);
  const [marketReason, setMarketReason] = useState("");

  const load = useCallback(async (preferredMarketCode = "FR") => {
    setLoading(true);
    setError(false);
    try {
      const [nextCatalog, nextMarkets] = await Promise.all([
        services.currencies.getAdminCatalog(),
        services.markets.getAllMarkets(),
      ]);
      setCatalog(nextCatalog);
      setMarkets(nextMarkets);
      const firstMarket =
        nextMarkets.find((market) => market.code === preferredMarketCode) ||
        nextMarkets[0];
      if (firstMarket) {
        setMarketCode(firstMarket.code);
        setMarketDefaultCurrency(firstMarket.currency);
        setMarketCurrencies([...firstMarket.supportedCurrencies]);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectCurrency = (code: string) => {
    setCurrencyCode(code);
    const definition = catalog?.currencies.find(
      (currency) => currency.code === code,
    );
    if (!definition) return;
    setCurrencyName(definition.displayName);
    setCurrencySymbol(definition.symbol);
    setMinorUnitDigits(definition.minorUnitDigits);
    setCurrencyEnabled(definition.enabled);
  };

  const selectMarket = (code: string) => {
    setMarketCode(code);
    const market = markets.find((candidate) => candidate.code === code);
    if (!market) return;
    setMarketDefaultCurrency(market.currency);
    setMarketCurrencies([...market.supportedCurrencies]);
  };

  const selectRate = (rate: CurrencyCatalog["rates"][number]) => {
    setBaseCurrency(rate.baseCurrency);
    setQuoteCurrency(rate.quoteCurrency);
    setRateNumerator(rate.rateNumerator);
    setRateDenominator(rate.rateDenominator);
    setRateSource(rate.source);
    setRateAsOf(toDatetimeLocal(rate.asOf));
    setRateExpiresAt(toDatetimeLocal(rate.expiresAt));
    setRateEnabled(rate.enabled);
  };

  const saveCurrency = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await services.currencies.upsertCurrency(currencyCode, {
        displayName: currencyName,
        symbol: currencySymbol,
        minorUnitDigits,
        enabled: currencyEnabled,
        reason: currencyReason,
      });
      setCurrencyReason("");
      toast.success(t("admin.currencies.currencySaved"));
      await load(marketCode);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : t("common.error"),
      );
    } finally {
      setSaving(false);
    }
  };

  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await services.currencies.upsertExchangeRate(
        baseCurrency,
        quoteCurrency,
        {
          rateNumerator,
          rateDenominator,
          source: rateSource,
          asOf: new Date(rateAsOf).toISOString(),
          expiresAt: new Date(rateExpiresAt).toISOString(),
          enabled: rateEnabled,
          reason: rateReason,
        },
      );
      setRateReason("");
      toast.success(t("admin.currencies.rateSaved"));
      await load(marketCode);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : t("common.error"),
      );
    } finally {
      setSaving(false);
    }
  };

  const saveMarketCurrencies = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMarket) return;
    setSaving(true);
    try {
      await services.markets.updateCountryConfiguration(selectedMarket.code, {
        expectedVersion: selectedMarket.version || 1,
        reason: marketReason,
        patch: {
          currency: marketDefaultCurrency,
          supportedCurrencies: marketCurrencies,
          currencySymbol:
            catalog?.currencies.find(
              (currency) => currency.code === marketDefaultCurrency,
            )?.symbol || marketDefaultCurrency,
        },
      });
      setMarketReason("");
      toast.success(t("admin.currencies.marketChangeRequested"));
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : t("common.error"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted">{t("common.loading")}</p>;
  }
  if (error || !catalog) {
    return (
      <div className="rounded-2xl border border-danger-border bg-danger-surface p-4">
        <p className="text-sm text-danger">{t("admin.currencies.loadError")}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(marketCode)}
        >
          <RefreshCw className="h-icon-sm w-icon-sm" />
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const enabledCurrencies = catalog.currencies.filter(
    (currency) => currency.enabled,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary-border bg-primary-light/40 p-4">
        <div className="flex items-center gap-2">
          <Coins className="h-icon-lg w-icon-lg text-primary" />
          <h2 className="text-base font-bold text-text-main">
            {t("admin.currencies.title")}
          </h2>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {t("admin.currencies.description")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={saveCurrency}
          className="space-y-4 rounded-2xl border border-border-base bg-bg-surface p-4"
        >
          <h3 className="text-sm font-bold text-text-main">
            {t("admin.currencies.definitions")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {catalog.currencies.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => selectCurrency(currency.code)}
                className="rounded-control border border-border-base px-3 py-2 text-xs font-semibold hover:border-primary"
              >
                {currency.code} · {currency.symbol}{" "}
                <Badge variant={currency.enabled ? "success" : "neutral"}>
                  {currency.enabled
                    ? t("admin.currencies.enabled")
                    : t("admin.currencies.disabled")}
                </Badge>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.code")}
              <input
                className={inputClassName}
                value={currencyCode}
                maxLength={CURRENCY_CODE_LENGTH}
                onChange={(event) =>
                  setCurrencyCode(event.target.value.toUpperCase())
                }
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.name")}
              <input
                className={inputClassName}
                value={currencyName}
                onChange={(event) => setCurrencyName(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.symbol")}
              <input
                className={inputClassName}
                value={currencySymbol}
                onChange={(event) => setCurrencySymbol(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.minorDigits")}
              <input
                className={inputClassName}
                type="number"
                min={CURRENCY_MINOR_UNIT_DIGITS_MIN}
                max={CURRENCY_MINOR_UNIT_DIGITS_MAX}
                value={minorUnitDigits}
                onChange={(event) =>
                  setMinorUnitDigits(Number(event.target.value))
                }
                required
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={currencyEnabled}
              onChange={(event) => setCurrencyEnabled(event.target.checked)}
            />
            {t("admin.currencies.currencyEnabled")}
          </label>
          <label className="block space-y-1 text-xs font-semibold">
            {t("admin.currencies.reason")}
            <textarea
              className={inputClassName}
              value={currencyReason}
              minLength={CURRENCY_CONFIGURATION_REASON_MIN_LENGTH}
              maxLength={CURRENCY_CONFIGURATION_REASON_MAX_LENGTH}
              onChange={(event) => setCurrencyReason(event.target.value)}
              required
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!canConfigure || saving}
          >
            {t("common.save")}
          </Button>
        </form>

        <form
          onSubmit={saveRate}
          className="space-y-4 rounded-2xl border border-border-base bg-bg-surface p-4"
        >
          <h3 className="text-sm font-bold text-text-main">
            {t("admin.currencies.rates")}
          </h3>
          <div className="space-y-2 text-xs text-text-secondary">
            {catalog.rates.map((rate) => (
              <button
                key={`${rate.baseCurrency}/${rate.quoteCurrency}`}
                type="button"
                onClick={() => selectRate(rate)}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-control bg-bg-subtle px-3 py-2 text-left hover:bg-primary-light"
              >
                <span>
                  <span className="font-bold text-text-main">
                    {rate.baseCurrency}/{rate.quoteCurrency} ={" "}
                    {rate.rateNumerator / rate.rateDenominator}
                  </span>
                  <span className="ml-2">
                    <Badge variant={rate.enabled ? "success" : "neutral"}>
                      {rate.enabled
                        ? t("admin.currencies.enabled")
                        : t("admin.currencies.disabled")}
                    </Badge>
                  </span>
                </span>
                <span className="text-right text-micro">
                  {t("admin.currencies.rateMetadata", {
                    source: rate.source,
                    asOf: new Date(rate.asOf).toLocaleString(),
                    updatedAt: new Date(rate.updatedAt).toLocaleString(),
                  })}
                  <br />
                  {t("admin.currencies.rateExpiry", {
                    expiresAt: new Date(rate.expiresAt).toLocaleString(),
                  })}
                </span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.base")}
              <Select
                className="w-full"
                labelledByAncestor
                value={baseCurrency}
                onChange={(event) => setBaseCurrency(event.target.value)}
              >
                {catalog.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.quote")}
              <Select
                className="w-full"
                labelledByAncestor
                value={quoteCurrency}
                onChange={(event) => setQuoteCurrency(event.target.value)}
              >
                {catalog.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.numerator")}
              <input
                className={inputClassName}
                type="number"
                min={EXCHANGE_RATE_COMPONENT_MIN}
                value={rateNumerator}
                onChange={(event) =>
                  setRateNumerator(Number(event.target.value))
                }
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.denominator")}
              <input
                className={inputClassName}
                type="number"
                min={EXCHANGE_RATE_COMPONENT_MIN}
                value={rateDenominator}
                onChange={(event) =>
                  setRateDenominator(Number(event.target.value))
                }
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold sm:col-span-2">
              {t("admin.currencies.source")}
              <input
                className={inputClassName}
                value={rateSource}
                onChange={(event) => setRateSource(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.asOf")}
              <input
                className={inputClassName}
                type="datetime-local"
                value={rateAsOf}
                onChange={(event) => setRateAsOf(event.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              {t("admin.currencies.expiresAt")}
              <input
                className={inputClassName}
                type="datetime-local"
                value={rateExpiresAt}
                onChange={(event) => setRateExpiresAt(event.target.value)}
                required
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={rateEnabled}
              onChange={(event) => setRateEnabled(event.target.checked)}
            />
            {t("admin.currencies.rateEnabled")}
          </label>
          <label className="block space-y-1 text-xs font-semibold">
            {t("admin.currencies.reason")}
            <textarea
              className={inputClassName}
              value={rateReason}
              minLength={CURRENCY_CONFIGURATION_REASON_MIN_LENGTH}
              maxLength={CURRENCY_CONFIGURATION_REASON_MAX_LENGTH}
              onChange={(event) => setRateReason(event.target.value)}
              required
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!canConfigure || saving}
          >
            {t("common.save")}
          </Button>
        </form>
      </div>

      <form
        onSubmit={saveMarketCurrencies}
        className="space-y-4 rounded-2xl border border-border-base bg-bg-surface p-4"
      >
        <h3 className="text-sm font-bold text-text-main">
          {t("admin.currencies.marketDefaults")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold">
            {t("admin.currencies.market")}
            <Select
              className="w-full"
              labelledByAncestor
              value={marketCode}
              onChange={(event) => selectMarket(event.target.value)}
            >
              {markets.map((market) => (
                <option key={market.code} value={market.code}>
                  {market.name} ({market.code})
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-xs font-semibold">
            {t("admin.currencies.defaultCurrency")}
            <Select
              className="w-full"
              labelledByAncestor
              value={marketDefaultCurrency}
              onChange={(event) => {
                const code = event.target.value;
                setMarketDefaultCurrency(code);
                setMarketCurrencies((current) =>
                  current.includes(code) ? current : [...current, code],
                );
              }}
            >
              {enabledCurrencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} · {currency.displayName}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold">
            {t("admin.currencies.displayCurrencies")}
          </legend>
          <div className="flex flex-wrap gap-3">
            {enabledCurrencies.map((currency) => {
              const checked = marketCurrencies.includes(currency.code);
              const isDefault = marketDefaultCurrency === currency.code;
              return (
                <label
                  key={currency.code}
                  className="flex items-center gap-2 rounded-control border border-border-base px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isDefault}
                    onChange={(event) =>
                      setMarketCurrencies((current) =>
                        event.target.checked
                          ? [...new Set([...current, currency.code])]
                          : current.filter((code) => code !== currency.code),
                      )
                    }
                  />
                  {currency.code} · {currency.symbol}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="block space-y-1 text-xs font-semibold">
          {t("admin.currencies.reason")}
          <textarea
            className={inputClassName}
            value={marketReason}
            minLength={MARKET_CONFIGURATION_REASON_MIN_LENGTH}
            maxLength={MARKET_CONFIGURATION_REASON_MAX_LENGTH}
            onChange={(event) => setMarketReason(event.target.value)}
            required
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!canConfigure || saving || marketCurrencies.length === 0}
        >
          {t("admin.currencies.requestMarketChange")}
        </Button>
      </form>
    </div>
  );
};
