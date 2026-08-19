import { CatalogueKey, MessageCatalogue, MessageKey, messagesFr } from './messages.fr';
import { messagesEn } from './messages.en';

export const DEFAULT_LOCALE = 'fr-FR';

/** Values substituted into `{placeholder}` slots. */
export type TranslationValues = Record<string, string | number>;

/**
 * Catalogues by locale. French is the source and is always complete; the others
 * are partial and fall back to it key by key.
 */
export const CATALOGUES: Record<string, MessageCatalogue> = {
  'fr-FR': messagesFr,
  'en-US': messagesEn,
};

/**
 * The catalogue for a locale, or `undefined` when we have none.
 *
 * Distinct from `resolveLocale` on purpose. Translation *should* fall back to
 * French so a page always renders; coverage must not, or a language with no
 * catalogue at all measures the French one and reports itself fully translated
 * — which is precisely how the selector would offer German and then render
 * every string in French.
 */
export function findCatalogue(locale: string | undefined): MessageCatalogue | undefined {
  if (!locale) return undefined;
  if (CATALOGUES[locale]) return CATALOGUES[locale];

  const language = locale.split('-')[0].toLowerCase();
  const match = Object.keys(CATALOGUES).find(
    (candidate) => candidate.split('-')[0].toLowerCase() === language,
  );
  return match ? CATALOGUES[match] : undefined;
}

/**
 * Resolves a requested locale to one we actually have messages for.
 *
 * Matching is by language subtag, so `en-GB`, `en-AU` and a bare `en` all reach
 * the `en-US` catalogue instead of silently falling back to French. A locale
 * with no catalogue at all resolves to the default rather than throwing — a
 * missing translation is not a reason to fail a render.
 */
export function resolveLocale(locale: string | undefined): string {
  if (!locale) return DEFAULT_LOCALE;
  if (CATALOGUES[locale]) return locale;

  const language = locale.split('-')[0].toLowerCase();
  const match = Object.keys(CATALOGUES).find(
    (candidate) => candidate.split('-')[0].toLowerCase() === language,
  );
  return match ?? DEFAULT_LOCALE;
}

/** Fills `{placeholder}` slots. An unmatched placeholder is left visible. */
export function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * Picks the plural form for `count` in `locale`.
 *
 * Delegated to `Intl.PluralRules` rather than a `count === 1` test, because the
 * rule is per-language and not guessable: French puts 0 in the singular ("0
 * annonce") and English puts it in the plural ("0 listings"), and languages with
 * `few`/`many` categories cannot be expressed as a boolean at all.
 *
 * Falls back through the CLDR category chain to `_other`, which every language
 * defines — so a catalogue that only declares `_other` still renders.
 */
export function selectPluralKey(
  key: MessageKey,
  count: number,
  locale: string,
  has: (candidate: string) => boolean,
): string {
  let category: string;
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    category = count === 1 ? 'one' : 'other';
  }

  const candidates = [`${key}_${category}`, `${key}_other`, key];
  return candidates.find(has) ?? key;
}

export interface TranslateOptions extends TranslationValues {
  /** Present for countable messages; drives `_one` / `_other` selection. */
  count?: number;
}

/**
 * Translates `key` for `locale`.
 *
 * Resolution order is deliberate: the active catalogue, then French, then the
 * key itself. Falling back to French rather than to the raw key means an
 * incomplete translation degrades to readable text instead of `nav.sell`
 * appearing in the navigation bar.
 */
export function translate(
  key: MessageKey,
  locale: string = DEFAULT_LOCALE,
  options?: TranslateOptions,
): string {
  const resolved = resolveLocale(locale);
  const active = CATALOGUES[resolved] ?? {};

  const lookup = (candidate: string): string | undefined =>
    (active as Record<string, string | undefined>)[candidate] ??
    (messagesFr as Record<string, string | undefined>)[candidate];

  const effectiveKey =
    typeof options?.count === 'number'
      ? selectPluralKey(key, options.count, resolved, (candidate) => lookup(candidate) !== undefined)
      : key;

  const template = lookup(effectiveKey) ?? lookup(key);
  if (template === undefined) return key;

  return interpolate(template, options);
}

/**
 * How much of the source catalogue a locale actually covers, 0–1.
 *
 * This is what decides whether a language is offered in the selector: a locale
 * is not "available" because someone set a boolean, but because its messages
 * exist. See `LOCALE_READY_THRESHOLD`.
 */
export function catalogueCoverage(locale: string): number {
  const catalogue = findCatalogue(locale);
  if (!catalogue) return 0;

  const keys = Object.keys(messagesFr) as CatalogueKey[];
  if (keys.length === 0) return 1;

  const translated = keys.filter(
    (key) => typeof catalogue[key] === 'string' && catalogue[key] !== '',
  );
  return translated.length / keys.length;
}
