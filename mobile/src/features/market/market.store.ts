import {
  COUNTRY_REGISTRY,
  getCountryConfig,
  type CountryConfig,
} from "@shongre/contracts";
import { secureStorage } from "@/services/secure-storage/secure-storage";

const MARKET_PREFERENCE_KEY = "shongre.mobile.market.v1";
const DEFAULT_MARKET_CODE = "FR";

function defaultMarket(): CountryConfig {
  const market = getCountryConfig(DEFAULT_MARKET_CODE);
  if (!market) throw new Error("Le marché mobile par défaut est indisponible.");
  return market;
}

export function isSelectableMobileMarket(country: CountryConfig): boolean {
  return (
    country.enabled &&
    country.marketplace.enabled &&
    ["active", "beta"].includes(country.launchStatus)
  );
}

export const mobileMarketCountries = COUNTRY_REGISTRY.filter(
  (country) => country.gatewayVisible || isSelectableMobileMarket(country),
).sort((left, right) => left.displayOrder - right.displayOrder);

let activeMarket = defaultMarket();
let restored = false;

export const mobileMarketStore = {
  storageKey: MARKET_PREFERENCE_KEY,

  getActive(): CountryConfig {
    return activeMarket;
  },

  async restore(): Promise<CountryConfig> {
    if (restored) return activeMarket;
    const storedCode = await secureStorage.get(MARKET_PREFERENCE_KEY);
    const storedMarket = storedCode ? getCountryConfig(storedCode) : undefined;
    activeMarket =
      storedMarket && isSelectableMobileMarket(storedMarket)
        ? storedMarket
        : defaultMarket();
    restored = true;
    return activeMarket;
  },

  async select(code: string): Promise<CountryConfig> {
    const market = getCountryConfig(code);
    if (!market || !isSelectableMobileMarket(market)) {
      throw new Error("Ce marché Shongre n’est pas encore accessible.");
    }
    activeMarket = market;
    restored = true;
    await secureStorage.set(MARKET_PREFERENCE_KEY, market.code);
    return market;
  },

  async resetForTests(): Promise<void> {
    activeMarket = defaultMarket();
    restored = false;
    await secureStorage.remove(MARKET_PREFERENCE_KEY);
  },
};
