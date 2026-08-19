import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Globe,
  Check,
  Sliders,
  ChevronRight,
  Sparkles,
  Coins,
  Languages,
  MapPin,
} from 'lucide-react';
import { useMarket } from '../../app/providers/MarketLocationProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { Market } from '../../domains/market/market.types';
import { Modal } from './Modal';
import { Button } from './Button';
import { useTranslation } from '../../i18n/I18nProvider';
import {
  DROPDOWN_PANEL_CLASSES,
  DROPDOWN_HEADER_CLASSES,
  DROPDOWN_HEADER_TITLE_CLASSES,
  DROPDOWN_ITEM_CLASSES,
} from './DropdownMenu';

interface MarketSelectorProps {
  variant?: 'header' | 'footer' | 'compact' | 'pill';
  className?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'fr-FR', label: 'Français (France)', flag: '🇫🇷' },
  { code: 'fr-BE', label: 'Français (Belgique)', flag: '🇧🇪' },
  { code: 'fr-CH', label: 'Français (Suisse)', flag: '🇨🇭' },
  { code: 'es-ES', label: 'Español (España)', flag: '🇪🇸' },
  { code: 'en-US', label: 'English (US/EU)', flag: '🇺🇸' },
  { code: 'nl-BE', label: 'Nederlands (België)', flag: '🇧🇪' },
  { code: 'de-CH', label: 'Deutsch (Schweiz)', flag: '🇨🇭' },
];

const SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro (EUR - €)' },
  { code: 'CHF', symbol: 'CHF', label: 'Franc Suisse (CHF)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD - $)' },
  { code: 'GBP', symbol: '£', label: 'Livre Sterling (GBP - £)' },
];

export const MarketSelector: React.FC<MarketSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { t } = useTranslation();
  const {
    activeMarket,
    availableMarkets,
    setMarket,
    currentLocale,
    setLocale,
    currentCurrency,
    setCurrency,
  } = useMarket();

  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Preference modal draft state
  const [draftMarketCode, setDraftMarketCode] = useState(activeMarket.code);
  const [draftLocale, setDraftLocale] = useState(currentLocale);
  const [draftCurrency, setDraftCurrency] = useState(currentCurrency);

  useEffect(() => {
    setDraftMarketCode(activeMarket.code);
    setDraftLocale(currentLocale);
    setDraftCurrency(currentCurrency);
  }, [activeMarket, currentLocale, currentCurrency, isPreferencesModalOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMarket = (market: Market) => {
    setMarket(market.code);
    setIsOpen(false);
    toast.info(`Marché sélectionné : ${market.name} (${market.flag})`);
  };

  const handleSavePreferences = () => {
    if (draftMarketCode !== activeMarket.code) {
      setMarket(draftMarketCode);
    }
    setLocale(draftLocale);
    setCurrency(draftCurrency);
    setIsPreferencesModalOpen(false);
    toast.success('Vos préférences régionales (pays, langue, devise) ont été enregistrées.');
  };

  const isFooter = variant === 'footer';

  return (
    <>
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
            isFooter
              ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 hover:border-stone-600'
              : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border-border-base'
          }`}
          aria-label={t('ui.marketSelector.changerDePaysMarche')}
        >
          <span className="text-base leading-none">{activeMarket.flag}</span>
          <span className={`tracking-tight ${isFooter ? 'text-white' : 'text-stone-900'}`}>
            {activeMarket.name} ({activeMarket.code})
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${
              isFooter ? 'text-stone-400' : 'text-stone-500'
            } ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div
            className={`absolute right-0 w-72 ${DROPDOWN_PANEL_CLASSES} ${
              isFooter ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {/* Header */}
            <div className={DROPDOWN_HEADER_CLASSES}>
              <div className={DROPDOWN_HEADER_TITLE_CLASSES}>
                <div className="flex items-center gap-1.5 text-stone-800 normal-case font-bold">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span>{t('ui.marketSelector.marcheTerritoire')}</span>
                </div>
                <span className="text-micro font-semibold text-stone-500 uppercase tracking-wider">
                  {availableMarkets.length} pays
                </span>
              </div>
            </div>

            {/* Markets List */}
            <div className="py-1 max-h-64 overflow-y-auto">
              {availableMarkets.map((m) => {
                const isCurrent = m.code === activeMarket.code;
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => handleSelectMarket(m)}
                    className={`${DROPDOWN_ITEM_CLASSES.base} py-2.5 ${
                      isCurrent
                        ? DROPDOWN_ITEM_CLASSES.selected
                        : DROPDOWN_ITEM_CLASSES.unselected
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{m.flag}</span>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {m.isDefault && (
                            <span className="text-micro bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                              Défaut
                            </span>
                          )}
                          {m.status === 'coming_soon' && (
                            <span className="text-micro bg-warning-surface text-warning px-1.5 py-0.5 rounded font-bold">
                              Bientôt
                            </span>
                          )}
                        </div>
                        <div className="text-micro text-stone-500 font-medium">
                          {m.currency} ({m.currencySymbol}) • {m.defaultLocale}
                        </div>
                      </div>
                    </div>

                    {isCurrent && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Preferences Settings Link Button */}
            <div className="pt-1.5 px-2 border-t border-border-subtle mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPreferencesModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
                  <span>{t('ui.marketSelector.preferencesLangueDevise')}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* USER PREFERENCES MODAL */}
      <Modal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        title={t('ui.marketSelector.preferencesRegionalesDAffichage')}
        description={t('ui.marketSelector.personnalisezVotrePaysVotreLangue')}
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Country Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{t('ui.marketSelector.marcheTerritoireActif')}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableMarkets.map((m) => {
                const isSelected = draftMarketCode === m.code;
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => {
                      setDraftMarketCode(m.code);
                      setDraftLocale(m.defaultLocale);
                      setDraftCurrency(m.currency);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary-light text-primary font-bold shadow-xs'
                        : 'border-border-base hover:border-stone-400 bg-white text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{m.flag}</span>
                      <div>
                        <div className="text-xs font-bold">{m.name}</div>
                        <div className="text-micro text-stone-500 font-medium">
                          {m.currency} ({m.currencySymbol})
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-primary" />
              <span>Langue d'affichage</span>
            </label>
            <select
              value={draftLocale}
              onChange={(e) => setDraftLocale(e.target.value)}
              className="w-full h-control-touch px-3.5 bg-bg-base border border-border-base rounded-xl text-xs font-semibold text-stone-900 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          {/* Currency Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span>{t('ui.marketSelector.deviseDAffichageDesPrix')}</span>
            </label>
            <select
              value={draftCurrency}
              onChange={(e) => setDraftCurrency(e.target.value)}
              className="w-full h-control-touch px-3.5 bg-bg-base border border-border-base rounded-xl text-xs font-semibold text-stone-900 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsPreferencesModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleSavePreferences}>
              Enregistrer mes préférences
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
