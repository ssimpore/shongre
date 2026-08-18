import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Settings2, ChevronRight } from 'lucide-react';
import { useMarketLocation } from '../../app/providers/MarketLocationProvider';
import {
  DROPDOWN_PANEL_CLASSES,
  DROPDOWN_HEADER_CLASSES,
  DROPDOWN_HEADER_TITLE_CLASSES,
  DROPDOWN_ITEM_CLASSES,
} from './DropdownMenu';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  /**
   * Whether the interface is actually available in this language.
   *
   * The selector used to offer six languages and switch none of them: picking
   * `Deutsch` stored a locale nobody read and left every string in French. A
   * control that claims to do something it cannot is worse than a shorter list,
   * so unavailable languages are shown as coming soon and cannot be selected.
   * Flip the flag here when a locale's translations actually ship.
   */
  isAvailable: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'fr-FR', name: 'Français', nativeName: 'Français', flag: '🇫🇷', isAvailable: true },
  { code: 'en-US', name: 'English', nativeName: 'English', flag: '🇬🇧', isAvailable: false },
  { code: 'de-DE', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪', isAvailable: false },
  { code: 'es-ES', name: 'Español', nativeName: 'Español', flag: '🇪🇸', isAvailable: false },
  { code: 'nl-NL', name: 'Nederlands', nativeName: 'Nederlands', flag: '🇳🇱', isAvailable: false },
  { code: 'it-IT', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹', isAvailable: false },
];

export const AVAILABLE_LANGUAGES = SUPPORTED_LANGUAGES.filter((lang) => lang.isAvailable);

export interface LanguageSelectorProps {
  /** Optional custom styling for the container */
  className?: string;
  /** Variant style */
  variant?: 'header' | 'footer' | 'compact' | 'drawer';
  /** ID prefix for accessibility and testing */
  idPrefix?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'header',
  idPrefix = 'lang-selector',
}) => {
  const { currentLocale, setLocale, activeMarket, currentCurrency, openPreferencesModal } = useMarketLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find active language or default to French
  const activeLanguage =
    SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === currentLocale || lang.code.startsWith(currentLocale) || currentLocale.startsWith(lang.code.slice(0, 2))
    ) || SUPPORTED_LANGUAGES[0];

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (lang: LanguageOption) => {
    if (!lang.isAvailable) return;
    setLocale(lang.code);
    setIsOpen(false);
  };

  const handleOpenPreferences = () => {
    setIsOpen(false);
    openPreferencesModal();
  };

  const buttonClasses =
    variant === 'footer'
      ? `flex items-center gap-1.5 text-xs font-bold text-stone-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 hover:border-stone-600 transition-colors cursor-pointer select-none ${
          isOpen ? 'bg-stone-800 text-white border-stone-600 ring-1 ring-stone-600' : ''
        }`
      : `flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-950 px-2.5 py-1.5 rounded-lg hover:bg-bg-subtle transition-colors cursor-pointer select-none border border-transparent hover:border-border-base ${
          isOpen ? 'bg-bg-subtle border-border-base text-stone-950' : ''
        }`;

  const dropdownPlacement =
    variant === 'footer'
      ? 'bottom-full left-0 mb-2'
      : 'top-full left-0 mt-1.5';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        id={`${idPrefix}-button`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Langue : ${activeLanguage.name}. Cliquez pour changer.`}
        className={buttonClasses}
      >
        <span className="text-base shrink-0 leading-none">{activeLanguage.flag}</span>
        <span className={`font-bold uppercase tracking-wide ${variant === 'footer' ? 'text-stone-200' : 'text-stone-800'}`}>
          {activeLanguage.code.slice(0, 2)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${
            variant === 'footer'
              ? isOpen ? 'rotate-180 text-primary-light' : 'text-stone-400'
              : isOpen ? 'rotate-180 text-primary' : 'text-stone-500'
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`${idPrefix}-button`}
          className={`absolute ${dropdownPlacement} w-60 ${DROPDOWN_PANEL_CLASSES}`}
        >
          <div className={DROPDOWN_HEADER_CLASSES}>
            <div className={DROPDOWN_HEADER_TITLE_CLASSES}>
              <span>Choisir la langue</span>
            </div>
          </div>

          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = activeLanguage.code === lang.code;
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  type="button"
                  disabled={!lang.isAvailable}
                  aria-disabled={!lang.isAvailable}
                  onClick={() => handleSelectLanguage(lang)}
                  className={`${DROPDOWN_ITEM_CLASSES.base} ${
                    !lang.isAvailable
                      ? DROPDOWN_ITEM_CLASSES.disabled
                      : isSelected
                      ? DROPDOWN_ITEM_CLASSES.selected
                      : DROPDOWN_ITEM_CLASSES.unselected
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-base leading-none ${lang.isAvailable ? '' : 'grayscale opacity-60'}`}>
                      {lang.flag}
                    </span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{lang.nativeName}</span>
                      <span className="text-micro text-stone-500 font-normal">{lang.name}</span>
                    </div>
                  </div>
                  {isSelected && lang.isAvailable && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  {!lang.isAvailable && (
                    <span className="text-micro font-bold uppercase tracking-wider text-stone-400 shrink-0">
                      Bientôt
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Preferences Link at bottom */}
          <div className="border-t border-stone-100 mt-1 pt-1 px-1">
            <button
              id={`${idPrefix}-preferences-link`}
              type="button"
              role="menuitem"
              onClick={handleOpenPreferences}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-950 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Préférences...</span>
              </div>
              <div className="flex items-center gap-1.5 text-micro font-bold text-stone-500">
                <span>{activeMarket.flag} {activeMarket.code}</span>
                <span>•</span>
                <span>{currentCurrency}</span>
                <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
