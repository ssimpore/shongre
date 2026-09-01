import { getCountryConfig } from "@shongre/contracts";

export const LEGACY_MANUAL_MARKET_SELECTION_KEY =
  "shongre_manual_market_selection_v1";
export const MARKET_SELECTION_PREFERENCES_KEY =
  "shongre_market_selection_preferences_v2";
export const MANUAL_MARKET_SELECTION_QUERY = "marketPreference";

const GUEST_SUBJECT = "guest";
const GLOBAL_CONTEXT = "global";

export interface MarketSelectionPreferences {
  version: 2;
  manualCountryBySubject: Record<string, string>;
  declinedRecommendationByScope: Record<string, string>;
}

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const emptyPreferences = (): MarketSelectionPreferences => ({
  version: 2,
  manualCountryBySubject: {},
  declinedRecommendationByScope: {},
});

const normalizeSubject = (accountId?: string | null): string => {
  const normalized = String(accountId || "").trim();
  return normalized ? `account:${normalized}` : GUEST_SUBJECT;
};

const normalizeContext = (countryCode?: string | null): string =>
  getCountryConfig(String(countryCode || "").toUpperCase())?.code ??
  GLOBAL_CONTEXT;

const decisionScope = (
  accountId?: string | null,
  contextCountryCode?: string | null,
): string =>
  `${normalizeSubject(accountId)}:${normalizeContext(contextCountryCode)}`;

const validCountryCode = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  return getCountryConfig(value)?.code ?? null;
};

const parsePreferences = (raw: string | null): MarketSelectionPreferences => {
  if (!raw) return emptyPreferences();
  try {
    const value = JSON.parse(raw) as Partial<MarketSelectionPreferences>;
    if (value.version !== 2) return emptyPreferences();
    const manualCountryBySubject = Object.fromEntries(
      Object.entries(value.manualCountryBySubject || {}).flatMap(
        ([subject, code]) => {
          const valid = validCountryCode(code);
          return valid ? [[subject, valid]] : [];
        },
      ),
    );
    const declinedRecommendationByScope = Object.fromEntries(
      Object.entries(value.declinedRecommendationByScope || {}).flatMap(
        ([scope, code]) => {
          const valid = validCountryCode(code);
          return valid ? [[scope, valid]] : [];
        },
      ),
    );
    return {
      version: 2,
      manualCountryBySubject,
      declinedRecommendationByScope,
    };
  } catch {
    return emptyPreferences();
  }
};

class MemoryPreferenceStorage implements PreferenceStorage {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

/**
 * Owns the minimal browser decision needed for market recommendation UX.
 *
 * It stores only ISO country codes, partitioned by guest/account and current
 * market context. It never accepts IP addresses, coordinates, locale, currency
 * or timezone, so those signals cannot accidentally become durable state.
 */
export class MarketSelectionPreferenceRepository {
  private readonly memoryStorage = new MemoryPreferenceStorage();

  constructor(private readonly injectedStorage?: PreferenceStorage) {}

  private storage(): PreferenceStorage {
    if (this.injectedStorage) return this.injectedStorage;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Private browsing and storage policy can make localStorage inaccessible.
    }
    return this.memoryStorage;
  }

  private getItem(storage: PreferenceStorage, key: string): string | null {
    try {
      return storage.getItem(key);
    } catch {
      return this.memoryStorage.getItem(key);
    }
  }

  private setItem(
    storage: PreferenceStorage,
    key: string,
    value: string,
  ): void {
    this.memoryStorage.setItem(key, value);
    try {
      storage.setItem(key, value);
    } catch {
      // The in-memory mirror keeps the selector usable when browser storage is
      // disabled, full, or blocked by a privacy policy.
    }
  }

  private removeItem(storage: PreferenceStorage, key: string): void {
    this.memoryStorage.removeItem(key);
    try {
      storage.removeItem(key);
    } catch {
      // Treat unavailable persistence as a non-blocking browser limitation.
    }
  }

  private read(): MarketSelectionPreferences {
    const storage = this.storage();
    const preferences = parsePreferences(
      this.getItem(storage, MARKET_SELECTION_PREFERENCES_KEY),
    );
    if (preferences.manualCountryBySubject[GUEST_SUBJECT]) {
      return preferences;
    }

    // The former global preference could belong to any person sharing this
    // browser. Migrate it only into the guest bucket, never into an account.
    const legacyCode = validCountryCode(
      (() => {
        try {
          const raw = this.getItem(storage, LEGACY_MANUAL_MARKET_SELECTION_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })(),
    );
    if (!legacyCode) return preferences;

    const migrated: MarketSelectionPreferences = {
      ...preferences,
      manualCountryBySubject: {
        ...preferences.manualCountryBySubject,
        [GUEST_SUBJECT]: legacyCode,
      },
    };
    this.write(migrated);
    this.removeItem(storage, LEGACY_MANUAL_MARKET_SELECTION_KEY);
    return migrated;
  }

  private write(preferences: MarketSelectionPreferences): void {
    const storage = this.storage();
    this.setItem(
      storage,
      MARKET_SELECTION_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  }

  getManualCountry(accountId?: string | null): string | null {
    return (
      this.read().manualCountryBySubject[normalizeSubject(accountId)] ?? null
    );
  }

  saveManualCountry(code: string, accountId?: string | null): void {
    const countryCode = validCountryCode(code);
    if (!countryCode) return;
    const preferences = this.read();
    this.write({
      ...preferences,
      manualCountryBySubject: {
        ...preferences.manualCountryBySubject,
        [normalizeSubject(accountId)]: countryCode,
      },
    });
  }

  clearManualCountry(accountId?: string | null): void {
    const preferences = this.read();
    const manualCountryBySubject = {
      ...preferences.manualCountryBySubject,
    };
    delete manualCountryBySubject[normalizeSubject(accountId)];
    this.write({ ...preferences, manualCountryBySubject });
  }

  getDeclinedRecommendation(
    accountId?: string | null,
    contextCountryCode?: string | null,
  ): string | null {
    return (
      this.read().declinedRecommendationByScope[
        decisionScope(accountId, contextCountryCode)
      ] ?? null
    );
  }

  declineRecommendation(
    recommendedCountryCode: string,
    accountId?: string | null,
    contextCountryCode?: string | null,
  ): void {
    const countryCode = validCountryCode(recommendedCountryCode);
    if (!countryCode) return;
    const preferences = this.read();
    this.write({
      ...preferences,
      declinedRecommendationByScope: {
        ...preferences.declinedRecommendationByScope,
        [decisionScope(accountId, contextCountryCode)]: countryCode,
      },
    });
  }

  clearDeclinedRecommendation(
    accountId?: string | null,
    contextCountryCode?: string | null,
  ): void {
    const preferences = this.read();
    const declinedRecommendationByScope = {
      ...preferences.declinedRecommendationByScope,
    };
    delete declinedRecommendationByScope[
      decisionScope(accountId, contextCountryCode)
    ];
    this.write({ ...preferences, declinedRecommendationByScope });
  }
}

export const marketSelectionPreferenceRepository =
  new MarketSelectionPreferenceRepository();

export function resolveInitialMarketSelection(input: {
  manualCountryCode?: string | null;
  requestCountryCode?: string | null;
  defaultCountryCode: string;
}): string {
  const request = validCountryCode(input.requestCountryCode);
  const manual = validCountryCode(input.manualCountryCode);
  // Canonical host/path context always wins the current render. A manual choice
  // suppresses detection but never silently moves a visitor from this request.
  return request || manual || input.defaultCountryCode;
}

export function saveManualMarketSelectionPreference(
  code: string,
  accountId?: string | null,
): void {
  marketSelectionPreferenceRepository.saveManualCountry(code, accountId);
}

export function consumeManualMarketSelectionHandoff(
  expectedCountryCode?: string | null,
  accountId?: string | null,
): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const value = url.searchParams.get(MANUAL_MARKET_SELECTION_QUERY);
  const country = value ? getCountryConfig(value) : undefined;
  const matchesContext =
    country &&
    (!expectedCountryCode ||
      country.code === expectedCountryCode.toUpperCase());
  if (matchesContext) {
    marketSelectionPreferenceRepository.saveManualCountry(
      country.code,
      accountId,
    );
  }
  if (value !== null) {
    url.searchParams.delete(MANUAL_MARKET_SELECTION_QUERY);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
  return matchesContext ? country.code : null;
}
