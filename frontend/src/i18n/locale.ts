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
 * Locales whose complete interface is ready to be exposed to users.
 *
 * This is intentionally narrower than `KNOWN_LOCALES`: a catalogue can exist
 * while page-level copy is still being migrated. Runtime locale ownership and
 * the language selector must both use this list so a stale stored preference
 * cannot reopen an unfinished language that the selector no longer offers.
 */
export const SHIPPED_LOCALES = ["fr-FR"] as const;

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

/** Resolves a locale to one the complete interface currently ships. */
export function resolveShippedLocale(locale: string | undefined): string {
  if (!locale) return DEFAULT_LOCALE;
  if ((SHIPPED_LOCALES as readonly string[]).includes(locale)) return locale;

  const language = locale.split("-")[0].toLowerCase();
  const match = SHIPPED_LOCALES.find(
    (candidate) => candidate.split("-")[0].toLowerCase() === language,
  );
  return match ?? DEFAULT_LOCALE;
}
