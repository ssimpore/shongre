import React from 'react';
import { Check, Building2, Coins, Languages } from 'lucide-react';
import { Modal } from '../../design-system/primitives/Modal';
import { Button } from '../../design-system/primitives/Button';
import { useMarketLocation } from '../providers/MarketLocationProvider';
import { SUPPORTED_LANGUAGES } from '../../design-system/primitives/LanguageSelector';

const CURRENCIES = [
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'CHF', label: 'Franc suisse', symbol: 'CHF' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'GBP', label: 'Livre sterling', symbol: '£' },
];

export const PreferencesModal: React.FC = () => {
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
      title="Préférences régionales"
      description="Personnalisez votre pays de navigation, votre devise d'affichage et votre langue"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Country / Market Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>Marché / Pays</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableMarkets.map((m) => {
              const isSelected = activeMarket.code === m.code;
              return (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => handleMarketChange(m.code)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-primary bg-primary-light text-primary font-bold ring-1 ring-primary'
                      : 'border-border-base bg-white hover:bg-stone-50 text-stone-800 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-lg leading-none">{m.flag}</span>
                    <div className="truncate">
                      <div className="text-xs truncate">{m.name}</div>
                      <div className="text-micro text-stone-400 font-normal">{m.code}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
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
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary-light text-primary font-bold ring-1 ring-primary'
                      : 'border-border-base bg-white hover:bg-stone-50 text-stone-800 font-medium'
                  }`}
                >
                  <div className="text-xs font-bold">{c.symbol} {c.code}</div>
                  <div className="text-micro text-stone-400 font-normal truncate">{c.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>Langue de l'interface</span>
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
                  onClick={() => setLocale(lang.code)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-primary bg-primary-light text-primary font-bold ring-1 ring-primary'
                      : 'border-border-base bg-white hover:bg-stone-50 text-stone-800 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div className="truncate">
                      <div className="text-xs truncate">{lang.nativeName}</div>
                      <div className="text-micro text-stone-400 font-normal uppercase">{lang.code.slice(0, 2)}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button variant="primary" size="sm" onClick={closePreferencesModal}>
            Valider les préférences
          </Button>
        </div>
      </div>
    </Modal>
  );
};
