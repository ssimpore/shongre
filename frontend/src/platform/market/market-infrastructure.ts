import {
  createEnvironmentConfig,
  type EnvironmentConfig,
  type MarketInfrastructureConfig,
} from "@shongre/contracts";
import { getPublicRuntimeConfig } from "../runtime-config/public-runtime-config";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[Web Config] ${name} is required.`);
  return value;
}

function marketInfrastructureFromConfig(
  config: EnvironmentConfig,
): MarketInfrastructureConfig {
  return {
    globalDomain: config.urls.internationalApp.host,
    franceDomain: config.urls.franceApp.host,
    canonicalProtocol:
      config.urls.franceApp.protocol === "http:" ? "http" : "https",
  };
}

export function webEnvironmentFromEnvironment(): EnvironmentConfig {
  return createEnvironmentConfig({
    appEnvironment: required("APP_ENV", process.env.APP_ENV),
    environmentId: required("ENVIRONMENT_ID", process.env.ENVIRONMENT_ID),
    publicFranceUrl: required("PUBLIC_FR_URL", process.env.PUBLIC_FR_URL),
    publicInternationalUrl: required(
      "PUBLIC_INTL_URL",
      process.env.PUBLIC_INTL_URL,
    ),
    apiUrl: required("API_URL", process.env.API_URL),
  });
}

export function webEnvironmentFromPublicEnvironment(): EnvironmentConfig {
  const runtime = getPublicRuntimeConfig();
  return createEnvironmentConfig({
    appEnvironment: runtime.appEnvironment,
    environmentId: runtime.environmentId,
    publicFranceUrl: runtime.franceUrl,
    publicInternationalUrl: runtime.internationalUrl,
    apiUrl: new URL(runtime.apiBaseUrl).origin,
  });
}

/**
 * Stable domain configuration shared by the proxy, metadata routes and server
 * components. Keeping this module free of `next/headers` lets the request proxy
 * import it without pulling React server-only code into its runtime bundle.
 */
export function marketInfrastructureFromEnvironment(): MarketInfrastructureConfig {
  return marketInfrastructureFromConfig(webEnvironmentFromEnvironment());
}

/**
 * Browser-safe market routing configuration injected by the runtime server.
 * No deployment URL is compiled into the promoted frontend image.
 */
export function marketInfrastructureFromPublicEnvironment(): MarketInfrastructureConfig {
  return marketInfrastructureFromConfig(webEnvironmentFromPublicEnvironment());
}
