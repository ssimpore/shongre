import { DEFAULT_COUNTRY_CONFIG } from "@shongre/contracts";

/**
 * Bootstrap market identity used before persisted market configuration loads.
 * Runtime features should resolve the active/default Market instead of
 * repeating these values.
 */
export const DEFAULT_MARKET_CODE = DEFAULT_COUNTRY_CONFIG.code;
export const DEFAULT_MARKET_LOCALE = DEFAULT_COUNTRY_CONFIG.defaultLocale;
export const DEFAULT_MARKET_CURRENCY = DEFAULT_COUNTRY_CONFIG.currency;
export const DEFAULT_MARKET_LANGUAGE = DEFAULT_MARKET_LOCALE.split("-")[0];
