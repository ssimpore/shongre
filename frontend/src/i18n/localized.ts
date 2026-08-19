import { storageService } from '../services/storage.service';
import { DEFAULT_LOCALE, normaliseLocale } from './locale';

/**
 * Translations for admin-managed records, as an overlay rather than a copy.
 *
 * Taxonomy category names, permission descriptions, collection copy and provider
 * capability labels are *data*, not interface chrome. AGENTS.md §54 says
 * administrators own that content, so it cannot be lifted into `messages.*.ts`:
 * doing so would freeze admin-managed values into the frontend bundle and leave
 * two places claiming to define the same category name.
 *
 * So the French record stays exactly where it is and remains the single source
 * of truth for structure and for the default language. Other locales are keyed
 * by the record's own id and merged on read:
 *
 *     TAXONOMY (source, fr)          taxonomy.i18n.ts (overlay, en)
 *     { id: 'vehicules',             { 'vehicules': { name: 'Vehicles' } }
 *       name: 'Véhicules', … }
 *
 * Nothing is duplicated: the overlay holds only the fields a translation
 * changes, and a record with no entry renders its French source. That is also
 * the shape a backend would serve per-locale content in, so the data model does
 * not have to change again when this stops being seed data.
 */
export type LocaleOverlay<T> = Record<string, Partial<T>>;

/** Overlays by locale, e.g. `{ 'en-US': { vehicules: { name: 'Vehicles' } } }`. */
export type LocaleOverlays<T> = Record<string, LocaleOverlay<T>>;

/**
 * The locale to render data in.
 *
 * Read from storage rather than from React context, because these resolvers are
 * called from plain `.ts` services with no component around them — which is the
 * same reason `utilities/formatters.ts` reads it this way. One source of truth
 * for the preference; two readers of it.
 */
export function activeDataLocale(): string {
  try {
    return normaliseLocale(storageService.getUserLocale() || DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * Applies the overlay for `locale` to one record.
 *
 * Returns the record untouched when nothing is translated, so callers can use
 * this unconditionally without paying for a copy on the default locale.
 */
export function localize<T extends { id: string }>(
  record: T,
  overlays: LocaleOverlays<T>,
  locale: string = activeDataLocale(),
): T {
  const overlay = overlays[normaliseLocale(locale)];
  const patch = overlay?.[record.id];
  if (!patch) return record;
  return { ...record, ...patch };
}

/** `localize` across a list, preserving order. */
export function localizeAll<T extends { id: string }>(
  records: T[],
  overlays: LocaleOverlays<T>,
  locale: string = activeDataLocale(),
): T[] {
  const overlay = overlays[normaliseLocale(locale)];
  if (!overlay) return records;
  return records.map((record) => {
    const patch = overlay[record.id];
    return patch ? { ...record, ...patch } : record;
  });
}

/**
 * `localize` for a tree, applied to every node through `childrenKey`.
 *
 * Taxonomy is the reason this exists: categories nest several levels deep and a
 * flat map would translate the roots and leave every subcategory in French.
 */
export function localizeTree<T extends { id: string }>(
  records: T[],
  overlays: LocaleOverlays<T>,
  childrenKey: keyof T,
  locale: string = activeDataLocale(),
): T[] {
  const overlay = overlays[normaliseLocale(locale)];
  if (!overlay) return records;

  const walk = (nodes: T[]): T[] =>
    nodes.map((node) => {
      const patch = overlay[node.id];
      const children = node[childrenKey];
      const localizedChildren = Array.isArray(children)
        ? { [childrenKey]: walk(children as T[]) }
        : {};
      return { ...node, ...patch, ...localizedChildren } as T;
    });

  return walk(records);
}
