import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useMarketLocation } from '../app/providers/MarketLocationProvider';
import { MessageKey } from './messages.fr';
import { DEFAULT_LOCALE, resolveLocale, translate, TranslateOptions } from './i18n.service';

interface I18nContextValue {
  /** The locale actually being rendered — resolved, not the raw preference. */
  locale: string;
  t: (key: MessageKey, options?: TranslateOptions) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/**
 * Message translation for the component tree.
 *
 * Locale itself is not owned here: `MarketLocationProvider` already holds it,
 * persists it and keeps `<html lang>` in step, and a second source of truth for
 * "what language is this" is exactly the kind of drift this codebase has been
 * fixing elsewhere. This provider reads that locale and turns it into messages.
 */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocale } = useMarketLocation();
  const locale = resolveLocale(currentLocale);

  const t = useCallback(
    (key: MessageKey, options?: TranslateOptions) => translate(key, locale, options),
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/**
 * Access to translated messages.
 *
 * Falls back to the default locale outside a provider rather than throwing.
 * Unlike auth or favourites, a component rendered without i18n context has an
 * obvious correct behaviour — render French — and crashing a page over a missing
 * text provider is a worse failure than the one it reports.
 */
export const useTranslation = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (context) return context;

  return {
    locale: DEFAULT_LOCALE,
    t: (key: MessageKey, options?: TranslateOptions) => translate(key, DEFAULT_LOCALE, options),
  };
};
