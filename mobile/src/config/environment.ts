import type { CountryConfig } from "@shongre/contracts";

export type MobileDataMode = "demo" | "api";

function resolveDataMode(): MobileDataMode {
  const value = process.env.EXPO_PUBLIC_DATA_MODE || "demo";
  if (value !== "demo" && value !== "api") {
    throw new Error(`[Mobile Config] Invalid EXPO_PUBLIC_DATA_MODE=${value}.`);
  }
  return value;
}

const dataMode = resolveDataMode();
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
const webUrl = (process.env.EXPO_PUBLIC_WEB_URL || "").replace(/\/$/, "");
const franceWebUrl = (process.env.EXPO_PUBLIC_FRANCE_WEB_URL || webUrl).replace(
  /\/$/,
  "",
);
const globalWebUrl = (process.env.EXPO_PUBLIC_GLOBAL_WEB_URL || webUrl).replace(
  /\/$/,
  "",
);

if (dataMode === "api" && !apiUrl) {
  throw new Error(
    "[Mobile Config] EXPO_PUBLIC_API_URL is required in api mode.",
  );
}
if (!webUrl) {
  throw new Error("[Mobile Config] EXPO_PUBLIC_WEB_URL is required.");
}

function marketWebUrl(country: CountryConfig, route: string): string {
  const origin = country.code === "FR" ? franceWebUrl : globalWebUrl;
  const url = new URL(origin);
  const basePath = country.basePath === "/" ? "" : country.basePath;
  url.pathname = `${basePath}${route.startsWith("/") ? route : `/${route}`}`;
  return url.toString();
}

export const mobileEnvironment = Object.freeze({
  dataMode,
  apiUrl,
  webUrl,
  franceWebUrl,
  globalWebUrl,
  marketWebUrl,
  linksFor(country: CountryConfig) {
    return {
      privacyUrl: marketWebUrl(country, "/privacy"),
      termsUrl: marketWebUrl(country, "/terms"),
      supportUrl: marketWebUrl(country, "/support"),
      accountDeletionUrl: marketWebUrl(country, "/account/delete"),
    };
  },
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || `${webUrl}/privacy`,
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || `${webUrl}/terms`,
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL || `${webUrl}/support`,
  accountDeletionUrl:
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL || `${webUrl}/account/delete`,
});
