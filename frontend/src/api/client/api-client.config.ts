/**
 * Central API Client & Data Mode Configuration.
 * Controls whether the frontend runs against local deterministic Demo adapters
 * or live HTTP backend adapters.
 */
export type DataMode = "demo" | "api";

export interface ApiClientConfig {
  dataMode: DataMode;
  apiBaseUrl: string;
  demoLatencyMs: number;
}

/**
 * Resolves the data mode.
 *
 * The guard against shipping an unconfigured production build lives in
 * next.config.ts rather than here: this module is evaluated in the browser, so
 * throwing would replace a bad build with a blank page for the visitor instead
 * of failing the release. An out-of-range value is still worth surfacing loudly
 * in development, where it means someone typed a mode that will never work.
 */
function resolveDataMode(): DataMode {
  const raw = process.env.NEXT_PUBLIC_DATA_MODE;

  if (raw === "api") return "api";
  if (raw && raw !== "demo" && process.env.NODE_ENV !== "production") {
    throw new Error(
      `[Config Error] Invalid NEXT_PUBLIC_DATA_MODE="${raw}". Allowed values are "demo" or "api".`,
    );
  }

  return "demo";
}

export const apiClientConfig: ApiClientConfig = {
  dataMode: resolveDataMode(),
  // Demo mode never reads this value. API mode receives it from root/runtime
  // configuration and the HTTP client reports a configuration error if absent.
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "",
  demoLatencyMs: 0, // 0 for instantaneous deterministic tests, adjustable for UI loaders
};

export const isDemoMode = (): boolean => apiClientConfig.dataMode === "demo";
export const isApiMode = (): boolean => apiClientConfig.dataMode === "api";

/**
 * Utility to simulate realistic async network delay in demo mode when desired.
 */
export async function simulateNetworkDelay(
  ms: number = apiClientConfig.demoLatencyMs,
): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
