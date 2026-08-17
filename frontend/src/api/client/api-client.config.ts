/**
 * Central API Client & Data Mode Configuration.
 * Controls whether the frontend runs against local deterministic Demo adapters
 * or live future HTTP backend adapters.
 */
export type DataMode = 'demo' | 'api';

export interface ApiClientConfig {
  dataMode: DataMode;
  apiBaseUrl: string;
  demoLatencyMs: number;
}

export const apiClientConfig: ApiClientConfig = {
  dataMode: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DATA_MODE === 'api')
    ? 'api'
    : 'demo',
  apiBaseUrl: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'https://api.shongre.com/v1',
  demoLatencyMs: 0, // 0 for instantaneous deterministic tests, adjustable for UI loaders
};

export const isDemoMode = (): boolean => apiClientConfig.dataMode === 'demo';
export const isApiMode = (): boolean => apiClientConfig.dataMode === 'api';

/**
 * Utility to simulate realistic async network delay in demo mode when desired.
 */
export async function simulateNetworkDelay(ms: number = apiClientConfig.demoLatencyMs): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
