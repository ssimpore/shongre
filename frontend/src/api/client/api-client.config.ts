/** Central API client configuration for the API-only Web application. */
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { SHONGRE_API_PREFIX } from "@shongre/contracts/openapi";

/** Browsers keep first-party cookies; server rendering calls the same backend directly. */
export function resolveApiRequestBaseUrl(apiBaseUrl: string): string {
  return typeof window === "undefined" ? apiBaseUrl : SHONGRE_API_PREFIX;
}

export interface ApiClientConfig {
  apiBaseUrl: string;
}

const runtimeConfig = getPublicRuntimeConfig();
export const apiClientConfig: ApiClientConfig = {
  apiBaseUrl: runtimeConfig.apiBaseUrl,
};
