import {
  createEnvironmentConfig,
  type CountryConfig,
} from "@shongre/contracts";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[Mobile Config] ${name} is required.`);
  return value;
}

const apiUrl = required(
  "EXPO_PUBLIC_API_URL",
  process.env.EXPO_PUBLIC_API_URL,
).replace(/\/$/, "");
const parsedApiUrl = new URL(apiUrl);
if (
  parsedApiUrl.username ||
  parsedApiUrl.password ||
  parsedApiUrl.search ||
  parsedApiUrl.hash ||
  parsedApiUrl.pathname.replace(/\/$/, "") !== "/api/v1"
) {
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
  apiUrl,
  marketWebUrl,
  linksFor(country: CountryConfig) {
    return {
      privacyUrl: marketWebUrl(country, "/privacy"),
      termsUrl: marketWebUrl(country, "/terms"),
      supportUrl: marketWebUrl(country, "/support"),
      accountDeletionUrl: marketWebUrl(country, "/account/delete"),
      /**
       * Registration and password recovery have no native screens yet, so the
       * app hands them to the market's Web flow rather than leaving a person
       * with an email/password sign-in form and no way to create an account or
       * recover one. Both routes are market-scoped through the same builder.
       */
      registerUrl: marketWebUrl(country, "/inscription"),
      passwordResetUrl: marketWebUrl(country, "/mot-de-passe-oublie"),
    };
  },
});
