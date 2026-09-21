import { useEffect, useMemo, useState } from "react";
import {
  CURRENCY_CONFIGURATION_REASON_MIN_LENGTH,
  EXCHANGE_RATE_COMPONENT_MIN,
  type CurrencyCatalog,
  type CurrencyDefinition,
  type ExchangeRate,
} from "@shongre/contracts/currency";
import { services } from "../../api/client/service-registry";
import { Badge, Button, Select } from "../../design-system";
import { Input, Textarea } from "../../design-system/primitives/FormField";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useTranslation } from "../../i18n/I18nProvider";
import { adminCatalogueFr } from "../../i18n/admin.catalogue.fr";

interface AdminCurrencyConfigurationPanelProps {
  catalog: CurrencyCatalog;
  onCatalogChange: (catalog: CurrencyCatalog) => void;
}

interface RateDraft {
  baseCurrency: string;
  quoteCurrency: string;
  rateNumerator: string;
  rateDenominator: string;
  source: string;
  asOf: string;
  expiresAt: string;
  enabled: boolean;
  reason: string;
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toRateDraft(
  rate: ExchangeRate | undefined,
  baseCurrency: string,
  quoteCurrency: string,
): RateDraft {
  return {
    baseCurrency,
    quoteCurrency,
    rateNumerator: rate ? String(rate.rateNumerator) : "",
    rateDenominator: rate ? String(rate.rateDenominator) : "",
    source: rate?.source ?? "",
    asOf: rate ? toLocalDateTime(rate.asOf) : "",
    expiresAt: rate ? toLocalDateTime(rate.expiresAt) : "",
    enabled: rate?.enabled ?? true,
    reason: "",
  };
}

function rateKey(baseCurrency: string, quoteCurrency: string): string {
  return `${baseCurrency}:${quoteCurrency}`;
}

export function AdminCurrencyConfigurationPanel({
  catalog,
  onCatalogChange,
}: AdminCurrencyConfigurationPanelProps) {
  const { t } = useTranslation(adminCatalogueFr);
  const { formatDateTime } = useRegionalFormatters();
  const currencyCodes = useMemo(
    () => catalog.currencies.map((currency) => currency.code),
    [catalog.currencies],
  );
  const initialBase = currencyCodes.includes("EUR")
    ? "EUR"
    : (currencyCodes[0] ?? "");
  const initialQuote = currencyCodes.includes("USD")
    ? "USD"
    : (currencyCodes.find((code) => code !== initialBase) ?? "");
  const [definitionReason, setDefinitionReason] = useState("");
  const [rateDraft, setRateDraft] = useState<RateDraft>(() =>
    toRateDraft(undefined, initialBase, initialQuote),
  );
  const [savingDefinition, setSavingDefinition] = useState<string | null>(null);
  const [savingRate, setSavingRate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ratesByPair = useMemo(
    () =>
      new Map(
        catalog.rates.map((rate) => [
          rateKey(rate.baseCurrency, rate.quoteCurrency),
          rate,
        ]),
      ),
    [catalog.rates],
  );

  useEffect(() => {
    if (
      !currencyCodes.includes(rateDraft.baseCurrency) ||
      !currencyCodes.includes(rateDraft.quoteCurrency)
    ) {
      setRateDraft(toRateDraft(undefined, initialBase, initialQuote));
    }
  }, [
    currencyCodes,
    initialBase,
    initialQuote,
    rateDraft.baseCurrency,
    rateDraft.quoteCurrency,
  ]);

  const selectRatePair = (baseCurrency: string, quoteCurrency: string) => {
    const existing = ratesByPair.get(rateKey(baseCurrency, quoteCurrency));
    setRateDraft(toRateDraft(existing, baseCurrency, quoteCurrency));
    setNotice(null);
    setError(null);
  };

  const reloadCatalog = async () => {
    const next = await services.currencies.getAdminCatalog();
    onCatalogChange(next);
    return next;
  };

  const toggleCurrency = async (currency: CurrencyDefinition) => {
    if (
      definitionReason.trim().length < CURRENCY_CONFIGURATION_REASON_MIN_LENGTH
    ) {
      return;
    }
    setSavingDefinition(currency.code);
    setNotice(null);
    setError(null);
    try {
      await services.currencies.upsertCurrency(currency.code, {
        displayName: currency.displayName,
        symbol: currency.symbol,
        minorUnitDigits: currency.minorUnitDigits,
        enabled: !currency.enabled,
        reason: definitionReason.trim(),
      });
      await reloadCatalog();
      setDefinitionReason("");
      setNotice(t("admin.currencies.currencySaved"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("admin.currencies.loadError"),
      );
    } finally {
      setSavingDefinition(null);
    }
  };

  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      rateDraft.baseCurrency === rateDraft.quoteCurrency ||
      rateDraft.reason.trim().length < CURRENCY_CONFIGURATION_REASON_MIN_LENGTH
    ) {
      return;
    }
    setSavingRate(true);
    setNotice(null);
    setError(null);
    try {
      await services.currencies.upsertExchangeRate(
        rateDraft.baseCurrency,
        rateDraft.quoteCurrency,
        {
          rateNumerator: Number(rateDraft.rateNumerator),
          rateDenominator: Number(rateDraft.rateDenominator),
          source: rateDraft.source.trim(),
          asOf: new Date(rateDraft.asOf).toISOString(),
          expiresAt: new Date(rateDraft.expiresAt).toISOString(),
          enabled: rateDraft.enabled,
          reason: rateDraft.reason.trim(),
        },
      );
      const next = await reloadCatalog();
      const saved = next.rates.find(
        (rate) =>
          rate.baseCurrency === rateDraft.baseCurrency &&
          rate.quoteCurrency === rateDraft.quoteCurrency,
      );
      setRateDraft(
        toRateDraft(saved, rateDraft.baseCurrency, rateDraft.quoteCurrency),
      );
      setNotice(t("admin.currencies.rateSaved"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("admin.currencies.loadError"),
      );
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <section className="space-y-5 rounded-card border border-border-base bg-bg-surface p-5">
      <header>
        <h2 className="text-lg font-bold text-text-main">
          {t("admin.currencies.title")}
        </h2>
        <p className="mt-1 text-sm text-text-supporting">
          {t("admin.currencies.description")}
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-control border border-success-border bg-success-surface px-3 py-2 text-sm text-success"
        >
          {notice}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-bold text-text-main">
            {t("admin.currencies.definitions")}
          </h3>
          <label className="block text-sm font-semibold text-text-main">
            {t("admin.currencies.reason")}
            <Textarea
              className="mt-1"
              value={definitionReason}
              onChange={(event) => setDefinitionReason(event.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-text-tertiary">
              {t("admin.currencies.reasonHint", {
                minimum: CURRENCY_CONFIGURATION_REASON_MIN_LENGTH,
              })}
            </span>
          </label>
          <div className="divide-y divide-border-subtle overflow-hidden rounded-control border border-border-base">
            {catalog.currencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between gap-3 bg-bg-surface px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text-main">
                    {currency.symbol} {currency.code} · {currency.displayName}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {t("admin.currencies.minorDigits")}:{" "}
                    {currency.minorUnitDigits}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={currency.enabled ? "success" : "neutral"}>
                    {t(
                      currency.enabled
                        ? "admin.currencies.enabled"
                        : "admin.currencies.disabled",
                    )}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      definitionReason.trim().length <
                        CURRENCY_CONFIGURATION_REASON_MIN_LENGTH ||
                      savingDefinition !== null
                    }
                    onClick={() => void toggleCurrency(currency)}
                  >
                    {t(
                      currency.enabled
                        ? "admin.currencies.disable"
                        : "admin.currencies.enable",
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={saveRate} className="space-y-3">
          <h3 className="font-bold text-text-main">
            {t("admin.currencies.rates")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-text-main">
              {t("admin.currencies.base")}
              <Select
                labelledByAncestor
                className="mt-1 w-full"
                value={rateDraft.baseCurrency}
                onChange={(event) =>
                  selectRatePair(event.target.value, rateDraft.quoteCurrency)
                }
              >
                {currencyCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-text-main">
              {t("admin.currencies.quote")}
              <Select
                labelledByAncestor
                className="mt-1 w-full"
                value={rateDraft.quoteCurrency}
                onChange={(event) =>
                  selectRatePair(rateDraft.baseCurrency, event.target.value)
                }
              >
                {currencyCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-text-main">
              {t("admin.currencies.numerator")}
              <Input
                className="mt-1"
                type="number"
                min={EXCHANGE_RATE_COMPONENT_MIN}
                step={EXCHANGE_RATE_COMPONENT_MIN}
                required
                value={rateDraft.rateNumerator}
                onChange={(event) =>
                  setRateDraft({
                    ...rateDraft,
                    rateNumerator: event.target.value,
                  })
                }
              />
            </label>
            <label className="text-sm font-semibold text-text-main">
              {t("admin.currencies.denominator")}
              <Input
                className="mt-1"
                type="number"
                min={EXCHANGE_RATE_COMPONENT_MIN}
                step={EXCHANGE_RATE_COMPONENT_MIN}
                required
                value={rateDraft.rateDenominator}
                onChange={(event) =>
                  setRateDraft({
                    ...rateDraft,
                    rateDenominator: event.target.value,
                  })
                }
              />
            </label>
            <label className="text-sm font-semibold text-text-main sm:col-span-2">
              {t("admin.currencies.source")}
              <Input
                className="mt-1"
                required
                value={rateDraft.source}
                onChange={(event) =>
                  setRateDraft({ ...rateDraft, source: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-semibold text-text-main">
              {t("admin.currencies.asOf")}
              <Input
                className="mt-1"
                type="datetime-local"
                required
                value={rateDraft.asOf}
                onChange={(event) =>
                  setRateDraft({ ...rateDraft, asOf: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-semibold text-text-main">
              {t("admin.currencies.expiresAt")}
              <Input
                className="mt-1"
                type="datetime-local"
                required
                value={rateDraft.expiresAt}
                onChange={(event) =>
                  setRateDraft({ ...rateDraft, expiresAt: event.target.value })
                }
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              checked={rateDraft.enabled}
              onChange={(event) =>
                setRateDraft({ ...rateDraft, enabled: event.target.checked })
              }
            />
            {t("admin.currencies.rateEnabled")}
          </label>
          <label className="block text-sm font-semibold text-text-main">
            {t("admin.currencies.reason")}
            <Textarea
              className="mt-1"
              value={rateDraft.reason}
              onChange={(event) =>
                setRateDraft({ ...rateDraft, reason: event.target.value })
              }
            />
          </label>
          {ratesByPair.get(
            rateKey(rateDraft.baseCurrency, rateDraft.quoteCurrency),
          ) ? (
            <p className="text-xs text-text-tertiary">
              {t("admin.currencies.rateExpiry", {
                expiresAt: formatDateTime(
                  ratesByPair.get(
                    rateKey(rateDraft.baseCurrency, rateDraft.quoteCurrency),
                  )?.expiresAt,
                ),
              })}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={
              savingRate ||
              rateDraft.baseCurrency === rateDraft.quoteCurrency ||
              rateDraft.reason.trim().length <
                CURRENCY_CONFIGURATION_REASON_MIN_LENGTH
            }
          >
            {t("common.save")}
          </Button>
        </form>
      </div>
    </section>
  );
}
