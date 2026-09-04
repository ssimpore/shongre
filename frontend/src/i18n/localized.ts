import { storageService } from "../services/storage.service";
import { DEFAULT_LOCALE, normaliseLocale } from "./locale";

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
