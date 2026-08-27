import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Settings2, ChevronRight } from "lucide-react";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  DROPDOWN_PANEL_CLASSES,
  DROPDOWN_HEADER_CLASSES,
  DROPDOWN_HEADER_TITLE_CLASSES,
  DROPDOWN_ITEM_CLASSES,
} from "./DropdownMenu";
import { useTranslation } from "../../i18n/I18nProvider";
import { catalogueCoverage } from "../../i18n/i18n.service";
import { SHIPPED_LOCALES } from "../../i18n/locale";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

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
   *
   * This is now measured rather than declared — see `LOCALE_READY_THRESHOLD`.
   * A locale becomes selectable when its catalogue actually covers the shared
   * interface, so nobody has to remember to flip a boolean, and nobody can flip
   * one ahead of the translations.
   */
  isAvailable: boolean;
}

/**
 * How much of the source catalogue a locale must cover to be offered.
 *
 * Full coverage: a language that switches the navigation but leaves the footer
 * in French reads as a bug, not as a partial translation.
 */
export const LOCALE_READY_THRESHOLD = 1;

/**
 * Locales the interface is actually finished in.
 *
 * Deliberately a second condition on top of catalogue coverage, because the two
 * measure different things. Coverage asks "is every key in the catalogue
 * translated?" — and the catalogue only contains the strings that have been
 * migrated to `t()` so far. It reported 100% for English while the entire page
 * body was still hardcoded French, which rendered "Home / Search / Account" in
 * a tab bar under a fully French homepage.
 *
 * So a locale ships when someone asserts the migration is done for it *and* the
 * catalogue backs that claim. `npm run check:i18n` counts the hardcoded strings
 * still standing between English and this list.
 */
export { SHIPPED_LOCALES } from "../../i18n/locale";

const LANGUAGES: Omit<LanguageOption, "isAvailable">[] = [
  { code: "fr-FR", name: "Français", nativeName: "Français", flag: "🇫🇷" },
  { code: "en-US", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "de-DE", name: "Deutsch", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "es-ES", name: "Español", nativeName: "Español", flag: "🇪🇸" },
  { code: "nl-NL", name: "Nederlands", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "it-IT", name: "Italiano", nativeName: "Italiano", flag: "🇮🇹" },
];

export const SUPPORTED_LANGUAGES: LanguageOption[] = LANGUAGES.map(
  (language) => ({
    ...language,
    isAvailable:
      (SHIPPED_LOCALES as readonly string[]).includes(language.code) &&
      catalogueCoverage(language.code) >= LOCALE_READY_THRESHOLD,
  }),
);

/**
 * What the picker actually offers.
 *
 * The menu used to list all six languages and disable five of them behind a
 * "Bientôt" tag. That is a menu whose contents are mostly not choices: it makes
 * the list five times taller than the decision it supports, and on a phone that
 * turned a one-item picker into a scrolling panel. A language appears when it
 * works, and not before — the roadmap does not belong in a control.
 */
export const AVAILABLE_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (lang) => lang.isAvailable,
);

export interface LanguageSelectorProps {
  /** Optional custom styling for the container */
  className?: string;
  /** Variant style */
  variant?: "header" | "footer" | "compact" | "drawer";
  /** ID prefix for accessibility and testing */
  idPrefix?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = "",
  variant = "header",
  idPrefix = "lang-selector",
}) => {
  const { currentLocale, setLocale, openPreferencesModal } =
    useMarketLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Find active language or default to French
  const activeLanguage =
    SUPPORTED_LANGUAGES.find(
      (lang) =>
        lang.code === currentLocale ||
        lang.code.startsWith(currentLocale) ||
        currentLocale.startsWith(lang.code.slice(0, 2)),
    ) || SUPPORTED_LANGUAGES[0];

  /**
   * Opens the panel inward when there is not room to open it outward.
   *
   * The panel opens inward when its intrinsic content width would cross the
   * viewport edge. Measuring the rendered menu keeps this calculation aligned
   * with its content instead of coupling it to a fixed width.
   *
   * Measured on open rather than guessed from a breakpoint: the trigger's
   * position depends on the copyright text beside it, which changes length with
   * the locale.
   */
  useEffect(() => {
    if (!isOpen) return;
    const trigger = dropdownRef.current;
    if (!trigger) return;

    const { left } = trigger.getBoundingClientRect();
    const panelWidth =
      trigger
        .querySelector<HTMLElement>('[role="menu"]')
        ?.getBoundingClientRect().width ?? 0;
    const MARGIN = 12;
    setAlignRight(left + panelWidth > window.innerWidth - MARGIN);
  }, [isOpen]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
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
    variant === "footer"
      ? `flex h-control-sm items-center gap-1.5 rounded-control px-2.5 text-xs font-bold text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 hover:border-stone-600 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer select-none ${
          isOpen
            ? "bg-stone-800 text-white border-stone-600 ring-1 ring-stone-600"
            : ""
        }`
      : `flex h-control-md items-center gap-1.5 rounded-control px-2.5 text-xs font-bold text-stone-700 hover:text-stone-950 hover:bg-bg-subtle ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer select-none border border-transparent hover:border-border-base ${
          isOpen ? "bg-bg-subtle border-border-base text-stone-950" : ""
        }`;

  const horizontal = alignRight ? "right-0" : "left-0";
  const dropdownPlacement =
    variant === "footer"
      ? `bottom-full ${horizontal} mb-2`
      : `top-full ${horizontal} mt-1.5`;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        id={`${idPrefix}-button`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("language.current", { language: activeLanguage.name })}
        className={buttonClasses}
      >
        <span className="text-base shrink-0 leading-none">
          {activeLanguage.flag}
        </span>
        <span
          className={`font-bold uppercase tracking-wide ${variant === "footer" ? "text-stone-200" : "text-stone-800"}`}
        >
          {activeLanguage.code.slice(0, 2)}
        </span>
        <ChevronDown
          className={`w-icon-sm h-icon-sm transition-transform ${
            variant === "footer"
              ? isOpen
                ? "rotate-180 text-primary-light"
                : // Deliberately a light neutral on the footer's dark panel, not
                  // the theme-following "disabled" role — it must not invert.
                  "text-stone-400"
              : isOpen
                ? "rotate-180 text-primary"
                : "text-text-muted"
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`${idPrefix}-button`}
          className={`absolute ${dropdownPlacement} w-max min-w-44 max-w-viewport-popover-max ${DROPDOWN_PANEL_CLASSES}`}
        >
          <div className={DROPDOWN_HEADER_CLASSES}>
            <div className={DROPDOWN_HEADER_TITLE_CLASSES}>
              <span>{t("language.choose")}</span>
            </div>
          </div>

          <div className="py-1">
            {/* Every entry here is selectable — the unavailable ones are filtered
                out upstream, so there is no disabled state left to render. */}
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = activeLanguage.code === lang.code;
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  type="button"
                  onClick={() => handleSelectLanguage(lang)}
                  className={`${DROPDOWN_ITEM_CLASSES.base} ${
                    isSelected
                      ? DROPDOWN_ITEM_CLASSES.selected
                      : DROPDOWN_ITEM_CLASSES.unselected
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{lang.nativeName}</span>
                      <span className="text-micro text-text-muted font-normal">
                        {lang.name}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-icon-sm h-icon-sm text-primary shrink-0" />
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
              className={`w-full min-h-control-sm flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-950 hover:bg-bg-subtle rounded-control ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer text-left group`}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-icon-sm h-icon-sm text-primary shrink-0" />
                <span>{t("language.preferences")}</span>
              </div>
              <div className="flex items-center text-text-muted">
                <ChevronRight className="w-icon-xs h-icon-xs text-text-disabled group-hover:text-stone-700 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
