import React, { useMemo } from "react";
import { Check, Building2, Coins, Languages } from "lucide-react";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { AVAILABLE_LANGUAGES } from "../../design-system/primitives/LanguageSelector";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  formatCurrencySymbol,
  getCurrencyDisplayName,
} from "../../utilities/formatters";
import { CountryFlag } from "../../design-system/primitives/CountryFlag";

export const PreferencesModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeMarket,
    availableCurrencies,
    selectableCountries,
    setMarket,
    manualMarketSelection,
    resetManualMarketSelection,
    isDetectingMarket,
    currentCurrency,
    currencyCatalogStatus,
    currencyConversionIssue,
    setCurrency,
    currentLocale,
    setLocale,
    isPreferencesModalOpen,
    closePreferencesModal,
  } = useMarketLocation();

  const handleMarketChange = (marketCode: string) => {
    setMarket(marketCode);
    closePreferencesModal();
  };

  const currencies = useMemo(() => {
    return availableCurrencies.map((currency) => ({
      code: currency.code,
      label:
        currency.displayName ||
        getCurrencyDisplayName(currency.code, currentLocale),
      symbol:
        currency.symbol || formatCurrencySymbol(currency.code, currentLocale),
    }));
  }, [availableCurrencies, currentLocale]);

  return (
    <Modal
      isOpen={isPreferencesModalOpen}
      onClose={closePreferencesModal}
      title={t("shell.preferencesModal.preferencesRegionales")}
      description={t(
        "shell.preferencesModal.personnalisezVotrePaysDeNavigation",
      )}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Country / Market Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-strong uppercase tracking-wider">
            <Building2 className="w-icon-sm h-icon-sm text-primary" />
            <span>{t("shell.preferencesModal.marchePays")}</span>
          </div>
          <div
            className="grid grid-cols-1 gap-2"
            role="radiogroup"
            aria-label={t("shell.preferencesModal.marchePays")}
          >
            {selectableCountries.map((m) => {
              const isSelected = activeMarket.code === m.code;
              return (
                <button
                  key={m.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleMarketChange(m.code)}
                  className={`flex min-h-control-touch items-center justify-between gap-3 rounded-control border px-3 py-2 text-left motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? "border-primary bg-primary-light text-text-main font-semibold ring-1 ring-primary"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle text-text-strong font-medium"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap">
                    <CountryFlag countryCode={m.code} size="lg" />
                    <span className="truncate text-sm">{m.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="shrink-0 text-micro font-normal text-text-tertiary">
                      {m.code}
                    </span>
                    {isSelected ? (
                      <Check className="h-icon-md w-icon-md shrink-0 text-primary" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          {manualMarketSelection ? (
            <div className="flex flex-col gap-2 rounded-control bg-bg-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-text-secondary">
                {t("shell.preferencesModal.manualSelectionActive")}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetManualMarketSelection}
                disabled={isDetectingMarket}
                className="shrink-0"
              >
                {isDetectingMarket
                  ? t("common.loading")
                  : t("shell.preferencesModal.resetManualSelection")}
              </Button>
            </div>
          ) : null}
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-strong uppercase tracking-wider">
            <Languages className="w-icon-sm h-icon-sm text-primary" />
            <span>{t("shell.preferencesModal.langueDeLInterface")}</span>
          </div>
          <div
            className="grid grid-cols-1 gap-2"
            role="radiogroup"
            aria-label={t("shell.preferencesModal.langueDeLInterface")}
          >
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected =
                currentLocale === lang.code ||
                currentLocale.startsWith(lang.code.slice(0, 2));
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setLocale(lang.code)}
                  className={`flex min-h-control-touch items-center justify-between gap-3 rounded-control border px-3 py-2 text-left motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? "border-primary bg-primary-light text-text-main font-semibold ring-1 ring-primary"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle text-text-strong font-medium"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap">
                    <CountryFlag countryCode={lang.countryCode} />
                    <span className="truncate text-sm">{lang.nativeName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="shrink-0 text-micro font-normal uppercase text-text-tertiary">
                      {lang.code.slice(0, 2)}
                    </span>
                    {isSelected ? (
                      <Check className="h-icon-md w-icon-md shrink-0 text-primary" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-strong uppercase tracking-wider">
            <Coins className="w-icon-sm h-icon-sm text-primary" />
            <span>{t("shell.preferencesModal.deviseAffichage")}</span>
          </div>
          <div
            className="grid grid-cols-1 gap-2"
            role="radiogroup"
            aria-label={t("shell.preferencesModal.deviseAffichage")}
          >
            {currencies.map((c) => {
              const isSelected = currentCurrency === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setCurrency(c.code)}
                  className={`flex min-h-control-touch items-center justify-between gap-3 rounded-control border px-3 py-2 text-left motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? "border-primary bg-primary-light text-text-main font-semibold ring-1 ring-primary"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle text-text-strong font-medium"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-2 whitespace-nowrap">
                    <span className="shrink-0 text-sm font-bold">
                      {c.symbol === c.code ? c.code : c.symbol + " " + c.code}
                    </span>
                    <span className="truncate text-xs font-normal text-text-tertiary">
                      {c.label}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check className="h-icon-md w-icon-md shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
          {currencyCatalogStatus === "loading" ? (
            <p className="text-micro text-text-muted">
              {t("shell.preferencesModal.currencyRatesLoading")}
            </p>
          ) : currencyCatalogStatus === "error" || currencyConversionIssue ? (
            <p className="rounded-control border border-warning-border bg-warning-surface px-3 py-2 text-micro text-warning">
              {t("shell.preferencesModal.currencyConversionUnavailable")}
            </p>
          ) : (
            <p className="text-micro text-text-muted">
              {t("shell.preferencesModal.currencyEstimateNotice")}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button variant="primary" size="sm" onClick={closePreferencesModal}>
            {t("shell.preferencesModal.validerLesPreferences")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
