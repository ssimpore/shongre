import React, { useMemo } from "react";
import { Coins, Globe2, Languages } from "lucide-react";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { DropdownMenu } from "../../design-system/primitives/DropdownMenu";
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

  const selectedLanguageCode = AVAILABLE_LANGUAGES.find(
    (language) =>
      currentLocale === language.code ||
      currentLocale.startsWith(language.code.slice(0, 2)),
  )?.code;

  return (
    <Modal
      isOpen={isPreferencesModalOpen}
      onClose={closePreferencesModal}
      title={t("shell.preferencesModal.preferencesRegionales")}
      maxWidth="xs"
      className="!rounded-listing-card"
    >
      <div className="divide-y divide-border-subtle">
        {/* Country / Market Selection */}
        <div className="space-y-2 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-strong">
            <Globe2 className="h-icon-md w-icon-md text-primary" />
            <span>{t("shell.preferencesModal.marchePays")}</span>
          </div>
          <DropdownMenu
            ariaLabel={t("shell.preferencesModal.marchePays")}
            fullWidth
            size="lg"
            value={activeMarket.code}
            onChange={handleMarketChange}
            options={selectableCountries.map((market) => ({
              value: market.code,
              label: market.name,
              icon: <CountryFlag countryCode={market.code} size="lg" />,
            }))}
            triggerClassName="border-primary bg-primary-light hover:bg-primary-light"
          />
          {manualMarketSelection ? (
            <div className="flex flex-col gap-2 rounded-control bg-bg-subtle p-3">
              <p className="text-xs leading-relaxed text-text-secondary">
                {t("shell.preferencesModal.manualSelectionActive")}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetManualMarketSelection}
                disabled={isDetectingMarket}
                className="w-full"
              >
                {isDetectingMarket
                  ? t("common.loading")
                  : t("shell.preferencesModal.resetManualSelection")}
              </Button>
            </div>
          ) : null}
        </div>

        {/* Language Selection */}
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-strong">
            <Languages className="h-icon-md w-icon-md text-primary" />
            <span>{t("shell.preferencesModal.langueDeLInterface")}</span>
          </div>
          <DropdownMenu
            ariaLabel={t("shell.preferencesModal.langueDeLInterface")}
            fullWidth
            size="lg"
            value={selectedLanguageCode}
            onChange={setLocale}
            options={AVAILABLE_LANGUAGES.map((language) => ({
              value: language.code,
              label: language.nativeName,
              icon: (
                <CountryFlag countryCode={language.countryCode} size="lg" />
              ),
            }))}
            triggerClassName="border-primary bg-primary-light hover:bg-primary-light"
          />
        </div>

        {/* Currency Selection */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-strong">
            <Coins className="h-icon-md w-icon-md text-primary" />
            <span>{t("shell.preferencesModal.deviseAffichage")}</span>
          </div>
          <DropdownMenu
            ariaLabel={t("shell.preferencesModal.deviseAffichage")}
            fullWidth
            size="lg"
            placement="top-left"
            value={currentCurrency}
            onChange={setCurrency}
            options={currencies.map((currency) => ({
              value: currency.code,
              label: `${
                currency.symbol === currency.code
                  ? currency.code
                  : `${currency.symbol} ${currency.code}`
              } · ${currency.label}`,
            }))}
            triggerClassName="border-primary bg-primary-light hover:bg-primary-light"
          />
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
      </div>
    </Modal>
  );
};
