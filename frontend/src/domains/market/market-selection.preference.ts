import { getCountryConfig } from "@shongre/contracts";

export const MANUAL_MARKET_SELECTION_KEY = "shongre_manual_market_selection_v1";
export const MANUAL_MARKET_SELECTION_QUERY = "marketPreference";

export function resolveInitialMarketSelection(input: {
  manualCountryCode?: string | null;
  requestCountryCode?: string | null;
  defaultCountryCode: string;
}): string {
  const manual = input.manualCountryCode
    ? getCountryConfig(input.manualCountryCode)?.code
    : undefined;
  const request = input.requestCountryCode
    ? getCountryConfig(input.requestCountryCode)?.code
    : undefined;
  return manual || request || input.defaultCountryCode;
}

export function saveManualMarketSelectionPreference(code: string): void {
  if (typeof window === "undefined") return;
  const country = getCountryConfig(code);
  if (!country) return;
  try {
    window.localStorage.setItem(
      MANUAL_MARKET_SELECTION_KEY,
      JSON.stringify(country.code),
    );
  } catch {
    // Storage can be unavailable in private contexts. The explicit navigation
    // still succeeds; only precedence across later visits is unavailable.
  }
}

export function consumeManualMarketSelectionHandoff(
  expectedCountryCode?: string | null,
): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const value = url.searchParams.get(MANUAL_MARKET_SELECTION_QUERY);
  const country = value ? getCountryConfig(value) : undefined;
  const matchesContext =
    country &&
    (!expectedCountryCode ||
      country.code === expectedCountryCode.toUpperCase());
  if (matchesContext) saveManualMarketSelectionPreference(country.code);
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
