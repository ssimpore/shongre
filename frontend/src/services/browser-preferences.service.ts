import type { LocationSelection } from "../types";
import { DEFAULT_MARKET_CODE } from "../configuration/market-baseline";

const GUEST_KEY = "guest";
const KEYS = {
  favorites: "shongre_favorites_v3",
  recentSearches: "shongre_recent_searches_v1",
  location: "shongre_location_preference_v1",
  activeMarket: "shongre_active_market_v1",
  locale: "shongre_user_locale_v1",
  legacyCurrency: "shongre_user_currency_v1",
  currencyPreferences: "shongre_user_currency_preferences_v2",
} as const;

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

  getRecentSearches(): string[] {
    return this.get<string[]>(KEYS.recentSearches, []);
  }

  addRecentSearch(query: string): void {
    const normalized = query.trim();
    if (!normalized) return;
    const searches = this.getRecentSearches().filter(
      (value) => value.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
    );
    this.set(KEYS.recentSearches, [normalized, ...searches].slice(0, 8));
  }
}

export const browserPreferencesService = new BrowserPreferencesService();
