/**
 * Locale identity, with no message catalogues attached.
 *
 * This is a leaf on purpose. `localized.ts` needs to know the active locale so
 * taxonomy and other admin-managed data can resolve their own label maps — but
 * it must not drag the catalogues along with it. It did: importing
 * `resolveLocale` from `i18n.service` pulled `messagesFr` and `messagesEn`
 * (~1,650 entries each) into the taxonomy chunk, which the header loads eagerly.
 * That chunk went from 62 kB to 377 kB and the responsive suite started timing
 * out waiting for the page to settle.
 *
 * Keeping the identity here and the messages there means the data path costs
 * nothing but a string.
 */
export const DEFAULT_LOCALE = "fr-FR";

/** Locales the product has data or messages for. */
export const KNOWN_LOCALES = ["fr-FR", "en-US"] as const;

/**
 * Normalises a requested locale to one we recognise, matching on the language
 * subtag so `en-GB` and a bare `en` both reach `en-US` rather than silently
 * falling back to French.
 */
export function normaliseLocale(locale: string | undefined): string {
  if (!locale) return DEFAULT_LOCALE;
  if ((KNOWN_LOCALES as readonly string[]).includes(locale)) return locale;

  const language = locale.split("-")[0].toLowerCase();
  const match = KNOWN_LOCALES.find(
    (candidate) => candidate.split("-")[0].toLowerCase() === language,
  );
  return match ?? DEFAULT_LOCALE;
}
