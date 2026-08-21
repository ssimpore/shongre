import React from "react";
import { Check, Building2, Coins, Languages } from "lucide-react";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { SUPPORTED_LANGUAGES } from "../../design-system/primitives/LanguageSelector";
import { useTranslation } from "../../i18n/I18nProvider";

const CURRENCIES = [
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "CHF", label: "Franc suisse", symbol: "CHF" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "Livre sterling", symbol: "£" },
];

export const PreferencesModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeMarket,
    availableMarkets,
    setMarket,
    currentCurrency,
    setCurrency,
    currentLocale,
    setLocale,
    isPreferencesModalOpen,
    closePreferencesModal,
  } = useMarketLocation();

  const handleMarketChange = (marketCode: string) => {
    setMarket(marketCode);
  };

  return (
    <Modal
      isOpen={isPreferencesModalOpen}
      onClose={closePreferencesModal}
      title={t("shell.preferencesModal.preferencesRegionales")}
      description={t(
        "shell.preferencesModal.personnalisezVotrePaysDeNavigation",
      )}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Country / Market Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>{t("shell.preferencesModal.marchePays")}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableMarkets.map((m) => {
              const isSelected = activeMarket.code === m.code;
              return (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => handleMarketChange(m.code)}
                  className={`min-h-control-touch p-2.5 rounded-control border text-left motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary-light text-primary font-bold ring-1 ring-primary"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle text-stone-800 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-lg leading-none">{m.flag}</span>
                    <div className="truncate">
                      <div className="text-xs truncate">{m.name}</div>
                      <div className="text-micro text-stone-500 font-normal">
                        {m.code}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span>Devise d'affichage</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CURRENCIES.map((c) => {
              const isSelected = currentCurrency === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.code)}
                  className={`min-h-control-touch p-2 rounded-control border text-center motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSelected
                      ? "border-primary bg-primary-light text-primary font-bold ring-1 ring-primary"
                      : "border-border-base bg-bg-surface hover:bg-bg-subtle text-stone-800 font-medium"
                  }`}
                >
                  <div className="text-xs font-bold">
                    {c.symbol} {c.code}
                  </div>
                  <div className="text-micro text-stone-500 font-normal truncate">
                    {c.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>{t("shell.preferencesModal.langueDeLInterface")}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected =
                currentLocale === lang.code ||
                currentLocale.startsWith(lang.code.slice(0, 2));
              return (
                <button
                  key={lang.code}
                  type="button"
                  disabled={!lang.isAvailable}
                  aria-disabled={!lang.isAvailable}
                  onClick={() => lang.isAvailable && setLocale(lang.code)}
                  className={`min-h-control-touch p-2 rounded-control border text-left motion-interactive flex items-center justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    !lang.isAvailable
                      ? "border-border-subtle bg-bg-subtle text-stone-400 cursor-not-allowed"
                      : isSelected
                        ? "border-primary bg-primary-light text-primary font-bold ring-1 ring-primary cursor-pointer"
                        : "border-border-base bg-bg-surface hover:bg-bg-subtle text-stone-800 font-medium cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`text-base leading-none ${lang.isAvailable ? "" : "grayscale opacity-60"}`}
                    >
                      {lang.flag}
                    </span>
                    <div className="truncate">
                      <div className="text-xs truncate">{lang.nativeName}</div>
                      <div className="text-micro text-stone-500 font-normal uppercase">
                        {lang.isAvailable ? lang.code.slice(0, 2) : "Bientôt"}
                      </div>
                    </div>
                  </div>
                  {isSelected && lang.isAvailable && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
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
