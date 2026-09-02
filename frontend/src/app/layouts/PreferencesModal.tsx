import React, { useMemo } from "react";
import { Check, Building2, Coins, Languages } from "lucide-react";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { SUPPORTED_LANGUAGES } from "../../design-system/primitives/LanguageSelector";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  formatCurrencySymbol,
  getCurrencyDisplayName,
} from "../../utilities/formatters";

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
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Country / Market Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Building2 className="w-icon-sm h-icon-sm text-primary" />
            <span>{t("shell.preferencesModal.marchePays")}</span>
          </div>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
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
                  className={`flex min-h-control-touch items-center justify-between gap-2 rounded-control border px-2.5 py-2 text-left motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? "border-primary bg-primary-light text-primary font-bold ring-1 ring-primary"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle text-stone-800 font-medium"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap">
                    <span className="shrink-0 text-lg leading-none">
                      {m.flag}
                    </span>
                    <span className="truncate text-xs">{m.name}</span>
                    <span className="shrink-0 text-micro font-normal text-stone-500">
                      {m.code}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check className="w-icon-md h-icon-md text-primary shrink-0" />
                  ) : null}
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

        {/* Currency Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Coins className="w-icon-sm h-icon-sm text-primary" />
            <span>{t("shell.preferencesModal.deviseAffichage")}</span>
          </div>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
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
                  className={`flex min-h-control-touch items-center justify-between gap-2 rounded-control border px-2.5 py-2 text-left motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? "border-primary bg-primary-light text-primary font-bold ring-1 ring-primary"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle text-stone-800 font-medium"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-1.5 whitespace-nowrap">
                    <span className="shrink-0 text-xs font-bold">
                      {c.symbol === c.code ? c.code : c.symbol + " " + c.code}
                    </span>
                    <span className="truncate text-micro font-normal text-stone-500">
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

        {/* Language Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Languages className="w-icon-sm h-icon-sm text-primary" />
            <span>{t("shell.preferencesModal.langueDeLInterface")}</span>
          </div>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label={t("shell.preferencesModal.langueDeLInterface")}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected =
                currentLocale === lang.code ||
                currentLocale.startsWith(lang.code.slice(0, 2));
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!lang.isAvailable}
                  aria-disabled={!lang.isAvailable}
                  onClick={() => lang.isAvailable && setLocale(lang.code)}
                  className={`flex min-h-control-touch items-center justify-between gap-2 rounded-control border px-2.5 py-2 text-left motion-interactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    !lang.isAvailable
                      ? "border-border-subtle bg-bg-subtle text-stone-400 cursor-not-allowed"
                      : isSelected
                        ? "border-primary bg-primary-light text-primary font-bold ring-1 ring-primary cursor-pointer"
                        : "border-border-base bg-bg-surface hover:bg-bg-subtle text-stone-800 font-medium cursor-pointer"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap">
                    <span
                      className={`shrink-0 text-base leading-none ${lang.isAvailable ? "" : "grayscale opacity-60"}`}
                    >
                      {lang.flag}
                    </span>
                    <span className="truncate text-xs">{lang.nativeName}</span>
                    <span className="shrink-0 text-micro font-normal uppercase text-stone-500">
                      {lang.isAvailable
                        ? lang.code.slice(0, 2)
                        : t("shell.preferencesModal.bientot")}
                    </span>
                  </span>
                  {isSelected && lang.isAvailable ? (
                    <Check className="w-icon-md h-icon-md text-primary shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
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
