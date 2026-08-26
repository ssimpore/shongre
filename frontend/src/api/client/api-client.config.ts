/**
 * Central API Client & Data Mode Configuration.
 * Controls whether the frontend runs against local deterministic Demo adapters
 * or live HTTP backend adapters.
 */
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";

export type DataMode = "demo" | "api";

export interface ApiClientConfig {
  dataMode: DataMode;
  apiBaseUrl: string;
  demoLatencyMs: number;
}

/**
 * Resolves the data mode.
 *
 * Container startup and the server runtime injector validate this value before
 * traffic is accepted. Browser code only consumes that injected projection.
 */
function resolveDataMode(): DataMode {
  return getPublicRuntimeConfig().dataMode;
}

const runtimeConfig = getPublicRuntimeConfig();
export const apiClientConfig: ApiClientConfig = {
  dataMode: resolveDataMode(),
  // Demo mode never reads this value. API mode receives it from root/runtime
  // configuration and the HTTP client reports a configuration error if absent.
  apiBaseUrl: runtimeConfig.apiBaseUrl,
  demoLatencyMs: 0, // 0 for instantaneous deterministic tests, adjustable for UI loaders
};

/**
 * Utility to simulate realistic async network delay in demo mode when desired.
 */
export async function simulateNetworkDelay(
  ms: number = apiClientConfig.demoLatencyMs,
): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
