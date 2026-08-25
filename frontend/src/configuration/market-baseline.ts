/**
 * Bootstrap market identity used before persisted market configuration loads.
 * Runtime features should resolve the active/default Market instead of
 * repeating these values.
 */
export const DEFAULT_MARKET_CODE = "FR";
export const DEFAULT_MARKET_LOCALE = "fr-FR";
export const DEFAULT_MARKET_CURRENCY = "EUR";
export const DEFAULT_MARKET_CURRENCY_SYMBOL = "€";
export const DEFAULT_MARKET_TIMEZONE = "Europe/Paris";
export const DEFAULT_MARKET_LANGUAGE = DEFAULT_MARKET_LOCALE.split("-")[0];
export const DEFAULT_MARKET_REGION = DEFAULT_MARKET_CODE;
