import type { LocationSelection } from "../types";
import { DEFAULT_MARKET_CODE } from "../configuration/market-baseline";

const GUEST_KEY = "guest";
const KEYS = {
  favorites: "shongre_favorites_v3",
  recentSearches: "shongre_recent_searches_v2",
  location: "shongre_location_preference_v1",
  activeMarket: "shongre_active_market_v1",
  locale: "shongre_user_locale_v1",
  legacyCurrency: "shongre_user_currency_v1",
  currencyPreferences: "shongre_user_currency_preferences_v2",
} as const;

export const RECENT_SEARCHES_CHANGED_EVENT = "shongre:recent-searches-changed";
const RECENT_SEARCH_LIMIT = 8;

function normalizeRecentSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const query = item.trim();
    if (!query || query.length > 200 || unique.has(query.toLowerCase()))
      continue;
    unique.set(query.toLowerCase(), query);
    if (unique.size === RECENT_SEARCH_LIMIT) break;
  }
  return [...unique.values()];
}

class BrowserPreferencesService {
  private readonly memory = new Map<string, string>();

  private get<T>(key: string, fallback: T): T {
    try {
      const stored =
        typeof window === "undefined"
          ? this.memory.get(key) || null
          : window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.memory.set(key, serialized);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, serialized);
      }
    } catch {
      // Preferences are best effort. Authoritative account data remains in API
      // services and must never depend on this browser cache.
    }
  }

  getByKey<T>(key: string, fallback: T): T {
    return this.get(key, fallback);
  }

  setByKey<T>(key: string, value: T): void {
    this.set(key, value);
  }

  removeByKey(key: string): void {
    try {
      this.memory.delete(key);
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      // Preferences are best effort and never authoritative application state.
    }
  }

  getActiveMarketCode(): string {
    return this.get(KEYS.activeMarket, DEFAULT_MARKET_CODE);
  }

  saveActiveMarketCode(code: string): void {
    this.set(KEYS.activeMarket, (code || DEFAULT_MARKET_CODE).toUpperCase());
  }

  getLocationPreference(): LocationSelection | null {
    return this.get<LocationSelection | null>(KEYS.location, null);
  }

  saveLocationPreference(location: LocationSelection): void {
    this.set(KEYS.location, location);
  }

  getUserLocale(): string | null {
    return this.get<string | null>(KEYS.locale, null);
  }

  saveUserLocale(locale: string): void {
    this.set(KEYS.locale, locale);
  }

  getUserCurrency(
    subject = GUEST_KEY,
    marketCode = this.getActiveMarketCode(),
  ): string | null {
    const key = `${subject}:${marketCode.toUpperCase()}`;
    const preferences = this.get<Record<string, string>>(
      KEYS.currencyPreferences,
      {},
    );
    return (
      preferences[key] || this.get<string | null>(KEYS.legacyCurrency, null)
    );
  }

  saveUserCurrency(
    currency: string,
    subject = GUEST_KEY,
    marketCode = this.getActiveMarketCode(),
  ): void {
    const key = `${subject}:${marketCode.toUpperCase()}`;
    const preferences = this.get<Record<string, string>>(
      KEYS.currencyPreferences,
      {},
    );
    this.set(KEYS.currencyPreferences, {
      ...preferences,
      [key]: currency.toUpperCase(),
    });
  }

  private favoriteScope(subject: string, marketCode: string): string {
    return `${subject}::${marketCode.toUpperCase()}`;
  }

  private getFavoriteScopes(): Record<string, string[]> {
    return this.get<Record<string, string[]>>(KEYS.favorites, {});
  }

  getFavorites(subject: string | undefined, marketCode: string): string[] {
    return (
      this.getFavoriteScopes()[
        this.favoriteScope(subject || GUEST_KEY, marketCode)
      ] ?? []
    );
  }

  toggleFavorite(
    listingId: string,
    subject: string | undefined,
    marketCode: string,
  ): boolean {
    const scopes = this.getFavoriteScopes();
    const scope = this.favoriteScope(subject || GUEST_KEY, marketCode);
    const current = scopes[scope] ?? [];
    const exists = current.includes(listingId);
    this.set(KEYS.favorites, {
      ...scopes,
      [scope]: exists
        ? current.filter((id) => id !== listingId)
        : [...current, listingId],
    });
    return !exists;
  }

  recentSearchesKey(subject: string | undefined, marketCode: string): string {
    return `${KEYS.recentSearches}:${JSON.stringify([subject || GUEST_KEY, marketCode.toUpperCase()])}`;
  }

  getRecentSearches(subject: string | undefined, marketCode: string): string[] {
    // Unscoped v1 history has no ownership metadata and cannot be attributed to
    // the current account or market safely.
    return normalizeRecentSearches(
      this.get<unknown>(this.recentSearchesKey(subject, marketCode), []),
    );
  }

  private writeRecentSearches(
    searches: string[],
    subject: string | undefined,
    marketCode: string,
  ): void {
    const key = this.recentSearchesKey(subject, marketCode);
    this.set(key, searches);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(RECENT_SEARCHES_CHANGED_EVENT, { detail: key }),
      );
    }
  }

  addRecentSearch(
    query: string,
    subject: string | undefined,
    marketCode: string,
  ): void {
    if (!normalizeRecentSearches([query]).length) return;
    this.writeRecentSearches(
      normalizeRecentSearches([
        query,
        ...this.getRecentSearches(subject, marketCode),
      ]),
      subject,
      marketCode,
    );
  }

  removeRecentSearch(
    query: string,
    subject: string | undefined,
    marketCode: string,
  ): void {
    this.writeRecentSearches(
      this.getRecentSearches(subject, marketCode).filter(
        (value) => value !== query,
      ),
      subject,
      marketCode,
    );
  }

  clearRecentSearches(subject: string | undefined, marketCode: string): void {
    this.writeRecentSearches([], subject, marketCode);
  }
}

export const browserPreferencesService = new BrowserPreferencesService();
