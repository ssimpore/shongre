import {
  createEnvironmentConfig,
  type CountryConfig,
} from "@shongre/contracts";

export type MobileDataMode = "demo" | "api";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[Mobile Config] ${name} is required.`);
  return value;
}

function resolveDataMode(): MobileDataMode {
  const value = process.env.EXPO_PUBLIC_DATA_MODE || "demo";
  if (value !== "demo" && value !== "api") {
    throw new Error(`[Mobile Config] Invalid EXPO_PUBLIC_DATA_MODE=${value}.`);
  }
  return value;
}

const dataMode = resolveDataMode();
const apiUrl = required(
  "EXPO_PUBLIC_API_URL",
  process.env.EXPO_PUBLIC_API_URL,
).replace(/\/$/, "");
const parsedApiUrl = new URL(apiUrl);
if (parsedApiUrl.pathname.replace(/\/$/, "") !== "/api/v1") {
  throw new Error("[Mobile Config] EXPO_PUBLIC_API_URL must end with /api/v1.");
}

const environment = createEnvironmentConfig({
  appEnvironment: required(
    "EXPO_PUBLIC_APP_ENV",
    process.env.EXPO_PUBLIC_APP_ENV,
  ),
  environmentId: required(
    "EXPO_PUBLIC_ENVIRONMENT_ID",
    process.env.EXPO_PUBLIC_ENVIRONMENT_ID,
  ),
  publicFranceUrl: required(
    "EXPO_PUBLIC_FR_URL",
    process.env.EXPO_PUBLIC_FR_URL,
  ),
  publicInternationalUrl: required(
    "EXPO_PUBLIC_INTL_URL",
    process.env.EXPO_PUBLIC_INTL_URL,
  ),
  apiUrl: parsedApiUrl.origin,
});

function marketWebUrl(country: CountryConfig, route: string): string {
  const origin =
    country.canonicalDomainMode === "france"
      ? environment.urls.franceApp
      : environment.urls.internationalApp;
  const url = new URL(origin);
  const basePath = country.basePath === "/" ? "" : country.basePath;
  url.pathname = `${basePath}${route.startsWith("/") ? route : `/${route}`}`;
  return url.toString();
}

export const mobileEnvironment = Object.freeze({
  ...environment,
  dataMode,
  apiUrl,
  marketWebUrl,
  linksFor(country: CountryConfig) {
    return {
      privacyUrl: marketWebUrl(country, "/privacy"),
      termsUrl: marketWebUrl(country, "/terms"),
      supportUrl: marketWebUrl(country, "/support"),
      accountDeletionUrl: marketWebUrl(country, "/account/delete"),
    };
  },
});
