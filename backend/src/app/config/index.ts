import dotenv from "dotenv";
import { resolve } from "path";
import { SHONGRE_API_PREFIX } from "@shongre/contracts/openapi";
import {
  assertEnvironmentSafety,
  createEnvironmentConfig,
  isProduction,
  type AiEnvironmentMode,
  type AnalyticsEnvironmentMode,
  type EmailEnvironmentMode,
  type EnvironmentConfig,
  type PaymentEnvironmentMode,
} from "@shongre/contracts/environment";
import type { MarketInfrastructureConfig } from "@shongre/contracts";

// Explicit shell values win. Direct package commands follow the same local
// precedence as root tooling without ever loading .env.example.
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), "backend/.env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), "backend/.env") });
dotenv.config({ path: resolve(process.cwd(), "../.env.local") });
dotenv.config({ path: resolve(process.cwd(), "../.env") });

export type BackendDataMode = "demo" | "database";
export type PaymentProviderMode = "demo" | "stripe";
export type KYCProviderMode = "demo" | "stripe" | "live";
export type BusinessRegistryProviderMode = "demo" | "siret";
export type AIProviderMode = "demo" | "gemini";
export type MalwareScannerMode = "disabled" | "http";

export interface AppConfig {
  environment: EnvironmentConfig;
  marketInfrastructure: MarketInfrastructureConfig;
  version: string;
  release: string;
  nodeEnv: string;
  dataMode: BackendDataMode;
  host: string;
  port: number;
  frontendUrl: string;
  publicApiUrl: string;
  apiPrefix: typeof SHONGRE_API_PREFIX;
  maxRequestBodyBytes: number;
  requestTimeoutMs: number;
  shutdownGraceMs: number;
  publicApiRateLimit: number;
  authenticatedApiRateLimit: number;
  apiRateLimitWindowSeconds: number;
  apiRateLimitLockSeconds: number;
  corsOrigin: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  databaseUrl?: string;
  jwtSecret: string;
  mfaEncryptionKey: string;
  providerCredentialEncryptionKeyBase64: string;
  providerCredentialKeyVersion: string;
  authTokenTtlSeconds: number;
  authRefreshTokenTtlSeconds: number;
  authRecentAuthenticationSeconds: number;
  oauthFlowTtlSeconds: number;
  oauthAllowedReturnOrigins: string[];
  mobileAuthCallbackUrl: string;
  cookieSecure: boolean;
  cookieDomain?: string;
  socialAuthEnabled: boolean;
  accountLinkingEnabled: boolean;
  emailPasswordAuthEnabled: boolean;
  authEmailDeliveryUrl: string;
  authEmailDeliveryToken: string;
  googleOAuth: OAuthProviderConfig;
  appleOAuth: AppleOAuthProviderConfig;
  facebookOAuth: FacebookOAuthProviderConfig;
  paymentProvider: PaymentProviderMode;
  kycProvider: KYCProviderMode;
  businessRegistryProvider: BusinessRegistryProviderMode;
  aiProvider: AIProviderMode;
  paymentMode: PaymentEnvironmentMode;
  emailMode: EmailEnvironmentMode;
  aiMode: AiEnvironmentMode;
  analyticsMode: AnalyticsEnvironmentMode;
  analyticsProviders: {
    posthog: { enabled: boolean; key: string; host: string };
    ga4: { enabled: boolean; measurementId: string; apiSecret: string };
    matomo: { enabled: boolean; url: string; siteId: string; token: string };
    cloudflare: { enabled: boolean; siteTag: string };
    sentry: { enabled: boolean; dsn: string; tracesSampleRate: number };
    searchConsole: {
      enabled: boolean;
      serviceAccountJson: string;
      siteUrls: string[];
    };
  };
  emailRecipientAllowlist: string[];
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripeConnectWebhookSecret?: string;
  complianceWebhookSecret?: string;
  handoverPinPepper: string;
  geminiApiKey?: string;
  geminiModel: string;
  businessRegistryApiUrl: string;
  businessRegistryApiToken: string;
  kycProviderBaseUrl: string;
  kycProviderApiToken: string;
  malwareScannerMode: MalwareScannerMode;
  malwareScannerUrl: string;
  malwareScannerToken: string;
  malwareScannerTimeoutMs: number;
}

export interface OAuthProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface AppleOAuthProviderConfig extends OAuthProviderConfig {
  teamId: string;
  keyId: string;
  privateKey: string;
}

export interface FacebookOAuthProviderConfig extends OAuthProviderConfig {
  authorizationUrl: string;
  graphApiBaseUrl: string;
}

function resolveDataMode(): BackendDataMode {
  return resolveEnumValue(
    "BACKEND_DATA_MODE",
    ["demo", "database"] as const,
    "demo",
  );
}

function resolveEnumValue<const T extends readonly string[]>(
  name: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  const value = process.env[name] || fallback;
  if (!allowed.includes(value)) {
    throw new Error(
      `[Config Error] Invalid ${name}="${value}". Allowed values are ${allowed.map((item) => `"${item}"`).join(", ")}.`,
    );
  }
  return value as T[number];
}

/**
 * Development-only signing secret.
 *
 * Deliberately a fixed, obviously-fake string rather than a random value
 * generated at boot: a per-process random secret would silently invalidate
 * every session on restart and make the failure look like a bug elsewhere.
 * Production refuses to start with this value — see resolveJwtSecret.
 */
const INSECURE_DEV_JWT_SECRET =
  "shongre-insecure-development-signing-key-do-not-use-in-production";

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Resolves the token signing secret, failing fast when production is
 * misconfigured. An unset or too-short secret in production means every
 * session token on the platform is forgeable, so booting anyway is worse
 * than not booting at all.
 */
function resolveJwtSecret(environment: EnvironmentConfig): string {
  const secret = process.env.JWT_SECRET;
  const production = isProduction(environment.environment);

  if (!secret) {
    if (production) {
      throw new Error(
        "[Config Error] JWT_SECRET is required in production. Set it to a random value of at least " +
          `${MIN_JWT_SECRET_LENGTH} characters.`,
      );
    }
    return INSECURE_DEV_JWT_SECRET;
  }

  if (production) {
    if (secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `[Config Error] JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production.`,
      );
    }
    if (
      secret === INSECURE_DEV_JWT_SECRET ||
      secret.includes("change-in-production")
    ) {
      throw new Error(
        "[Config Error] JWT_SECRET is still set to a placeholder value in production.",
      );
    }
  }

  return secret;
}

const nodeEnv = process.env.NODE_ENV || "development";

function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`[Config Error] ${name} must be either "true" or "false".`);
}

function envList(name: string): string[] {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`[Config Error] ${name} must be a positive integer.`);
  }
  return value;
}

function decodePrivateKey(): string {
  if (process.env.APPLE_PRIVATE_KEY)
    return process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  if (!process.env.APPLE_PRIVATE_KEY_BASE64) return "";
  try {
    return Buffer.from(process.env.APPLE_PRIVATE_KEY_BASE64, "base64").toString(
      "utf8",
    );
  } catch {
    throw new Error(
      "[Config Error] APPLE_PRIVATE_KEY_BASE64 is not valid base64.",
    );
  }
}

function validateSocialProviderConfiguration(candidate: AppConfig): void {
  if (!candidate.socialAuthEnabled) return;

  const missing: string[] = [];
  const requireKeys = (enabled: boolean, keys: Array<[string, string]>) => {
    if (!enabled) return;
    for (const [name, value] of keys) if (!value) missing.push(name);
  };

  requireKeys(candidate.googleOAuth.enabled, [
    ["GOOGLE_OAUTH_CLIENT_ID", candidate.googleOAuth.clientId],
    ["GOOGLE_OAUTH_CLIENT_SECRET", candidate.googleOAuth.clientSecret],
  ]);
  requireKeys(candidate.appleOAuth.enabled, [
    ["APPLE_SERVICE_ID", candidate.appleOAuth.clientId],
    ["APPLE_TEAM_ID", candidate.appleOAuth.teamId],
    ["APPLE_KEY_ID", candidate.appleOAuth.keyId],
    [
      "APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_BASE64",
      candidate.appleOAuth.privateKey,
    ],
  ]);
  requireKeys(candidate.facebookOAuth.enabled, [
    ["FACEBOOK_APP_ID", candidate.facebookOAuth.clientId],
    ["FACEBOOK_APP_SECRET", candidate.facebookOAuth.clientSecret],
    ["FACEBOOK_GRAPH_API_BASE_URL", candidate.facebookOAuth.graphApiBaseUrl],
  ]);

  if (
    !candidate.googleOAuth.enabled &&
    !candidate.appleOAuth.enabled &&
    !candidate.facebookOAuth.enabled
  ) {
    missing.push(
      "at least one of ENABLE_GOOGLE_AUTH, ENABLE_APPLE_AUTH, ENABLE_FACEBOOK_AUTH",
    );
  }
  if (candidate.oauthAllowedReturnOrigins.length === 0)
    missing.push("OAUTH_ALLOWED_RETURN_ORIGINS");

  if (missing.length > 0) {
    throw new Error(
      `[Config Error] Social authentication is enabled but required keys are missing: ${missing.join(", ")}.`,
    );
  }
}

function validateProductionAuthConfiguration(candidate: AppConfig): void {
  if (
    !isProduction(candidate.environment.environment) ||
    !candidate.emailPasswordAuthEnabled
  )
    return;
  const missing: string[] = [];
  if (!candidate.authEmailDeliveryUrl) missing.push("AUTH_EMAIL_DELIVERY_URL");
  else {
    try {
      if (new URL(candidate.authEmailDeliveryUrl).protocol !== "https:")
        missing.push("AUTH_EMAIL_DELIVERY_URL (HTTPS)");
    } catch {
      missing.push("AUTH_EMAIL_DELIVERY_URL (absolute HTTPS URL)");
    }
  }
  if (!candidate.authEmailDeliveryToken)
    missing.push("AUTH_EMAIL_DELIVERY_TOKEN");
  if (!candidate.frontendUrl) missing.push("PUBLIC_FR_URL");
  if (missing.length) {
    throw new Error(
      `[Config Error] Email/password authentication is enabled but required keys are missing: ${missing.join(", ")}.`,
    );
  }
}

function validateProductionRuntimeConfiguration(candidate: AppConfig): void {
  if (!isProduction(candidate.environment.environment)) return;

  const missing: string[] = [];
  const requireHttpsUrl = (name: string, value: string) => {
    if (!value) {
      missing.push(name);
      return;
    }
    try {
      if (new URL(value).protocol !== "https:") missing.push(`${name} (HTTPS)`);
    } catch {
      missing.push(`${name} (absolute HTTPS URL)`);
    }
  };

  requireHttpsUrl("PUBLIC_FR_URL", candidate.environment.urls.franceApp.origin);
  requireHttpsUrl(
    "PUBLIC_INTL_URL",
    candidate.environment.urls.internationalApp.origin,
  );
  requireHttpsUrl("API_URL", candidate.environment.urls.api.origin);
  if (!candidate.corsOrigin || candidate.corsOrigin === "*")
    missing.push("CORS_ORIGIN (explicit origins)");
  else {
    for (const origin of candidate.corsOrigin.split(","))
      requireHttpsUrl("CORS_ORIGIN", origin.trim());
  }
  if (!candidate.cookieSecure) missing.push("AUTH_COOKIE_SECURE=true");

  if (candidate.dataMode !== "database")
    missing.push("BACKEND_DATA_MODE=database");
  if (!candidate.supabaseUrl) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (candidate.paymentProvider !== "stripe")
    missing.push("PAYMENT_PROVIDER=stripe");
  if (!candidate.stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
  if (!candidate.stripeWebhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!candidate.stripeConnectWebhookSecret)
    missing.push("STRIPE_CONNECT_WEBHOOK_SECRET");

  if (candidate.kycProvider === "demo")
    missing.push("KYC_PROVIDER=stripe or live");
  if (candidate.businessRegistryProvider !== "siret")
    missing.push("BUSINESS_REGISTRY_PROVIDER=siret");
  if (candidate.aiProvider !== "gemini") missing.push("AI_PROVIDER=gemini");
  if (!candidate.geminiApiKey) missing.push("GEMINI_API_KEY");
  if (!candidate.geminiModel) missing.push("GEMINI_MODEL");
  if (!candidate.businessRegistryApiUrl)
    missing.push("BUSINESS_REGISTRY_API_URL");
  if (!candidate.businessRegistryApiToken)
    missing.push("BUSINESS_REGISTRY_API_TOKEN");
  if (!candidate.kycProviderBaseUrl) missing.push("KYC_PROVIDER_BASE_URL");
  if (!candidate.kycProviderApiToken) missing.push("KYC_PROVIDER_API_TOKEN");
  if (!candidate.complianceWebhookSecret)
    missing.push("COMPLIANCE_WEBHOOK_SECRET");
  if (
    !process.env.HANDOVER_PIN_PEPPER ||
    candidate.handoverPinPepper.length < 32
  )
    missing.push("HANDOVER_PIN_PEPPER (at least 32 characters)");
  if (!process.env.MFA_ENCRYPTION_KEY || candidate.mfaEncryptionKey.length < 32)
    missing.push("MFA_ENCRYPTION_KEY (at least 32 characters)");
  if (
    !process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64 ||
    Buffer.from(candidate.providerCredentialEncryptionKeyBase64, "base64")
      .length !== 32
  ) {
    missing.push(
      "PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64 (32 bytes, base64)",
    );
  }
  if (!candidate.providerCredentialKeyVersion)
    missing.push("PROVIDER_CREDENTIAL_KEY_VERSION");
  if (candidate.malwareScannerMode !== "http")
    missing.push("MALWARE_SCAN_MODE=http");
  requireHttpsUrl("MALWARE_SCAN_URL", candidate.malwareScannerUrl);
  if (!candidate.malwareScannerToken) missing.push("MALWARE_SCAN_TOKEN");

  if (missing.length > 0) {
    throw new Error(
      `[Config Error] Production runtime configuration is incomplete: ${missing.join(", ")}.`,
    );
  }
}

function validateCorsConfiguration(candidate: AppConfig): void {
  const origins = candidate.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0 || origins.includes("*")) {
    throw new Error(
      "[Config Error] CORS_ORIGIN must contain explicit configured origins and must not use a wildcard.",
    );
  }
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`[Config Error] Invalid CORS_ORIGIN entry: ${origin}.`);
    }
    if (parsed.origin !== origin || parsed.username || parsed.password) {
      throw new Error(
        `[Config Error] CORS_ORIGIN entry must be a credential-free origin: ${origin}.`,
      );
    }
    if (
      !["local", "test"].includes(candidate.environment.environment) &&
      parsed.protocol !== "https:"
    ) {
      throw new Error(
        `[Config Error] CORS_ORIGIN must use HTTPS in ${candidate.environment.environment}.`,
      );
    }
  }
  for (const origin of candidate.oauthAllowedReturnOrigins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        `[Config Error] Invalid OAUTH_ALLOWED_RETURN_ORIGINS entry: ${origin}.`,
      );
    }
    if (origin === "*" || parsed.origin !== origin) {
      throw new Error(
        `[Config Error] OAuth return origins must be exact origins: ${origin}.`,
      );
    }
  }
}

function validateProviderCredentialModes(candidate: AppConfig): void {
  const stripeKey = candidate.stripeSecretKey || "";
  if (candidate.paymentMode !== "live" && stripeKey.startsWith("sk_live_")) {
    throw new Error(
      `[Environment Safety] ${candidate.environment.environment} cannot load a live Stripe secret key.`,
    );
  }
  if (
    candidate.paymentMode === "live" &&
    stripeKey &&
    !stripeKey.startsWith("sk_live_")
  ) {
    throw new Error(
      "[Environment Safety] Live payment mode requires a live Stripe secret key.",
    );
  }
}

function requiredRuntimeValue(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `[Config Error] ${name} is required. Run project commands through the root Makefile.`,
    );
  return value;
}

function requiredRuntimePort(): number {
  const raw = process.env.BACKEND_PORT || process.env.PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      "[Config Error] BACKEND_PORT must be an integer from 1 to 65535.",
    );
  }
  return port;
}

const environment = createEnvironmentConfig({
  appEnvironment: requiredRuntimeValue("APP_ENV"),
  environmentId: requiredRuntimeValue("ENVIRONMENT_ID"),
  publicFranceUrl: requiredRuntimeValue("PUBLIC_FR_URL"),
  publicInternationalUrl: requiredRuntimeValue("PUBLIC_INTL_URL"),
  apiUrl: requiredRuntimeValue("API_URL"),
});

const marketInfrastructure: MarketInfrastructureConfig = {
  globalDomain: environment.urls.internationalApp.host,
  franceDomain: environment.urls.franceApp.host,
  canonicalProtocol:
    environment.urls.franceApp.protocol === "http:" ? "http" : "https",
};

const candidateConfig: AppConfig = {
  environment,
  marketInfrastructure,
  version: process.env.APP_VERSION || "1.0.0",
  release:
    process.env.RELEASE_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "unreleased",
  nodeEnv,
  dataMode: resolveDataMode(),
  host: requiredRuntimeValue("BACKEND_HOST"),
  port: requiredRuntimePort(),
  frontendUrl: environment.urls.franceApp.origin,
  publicApiUrl: environment.urls.api.origin,
  apiPrefix: SHONGRE_API_PREFIX,
  maxRequestBodyBytes: positiveInteger("MAX_REQUEST_BODY_BYTES", 1_048_576),
  requestTimeoutMs: positiveInteger("REQUEST_TIMEOUT_MS", 30_000),
  shutdownGraceMs: positiveInteger("SHUTDOWN_GRACE_MS", 15_000),
  publicApiRateLimit: positiveInteger("API_PUBLIC_RATE_LIMIT", 180),
  authenticatedApiRateLimit: positiveInteger(
    "API_AUTHENTICATED_RATE_LIMIT",
    600,
  ),
  apiRateLimitWindowSeconds: positiveInteger(
    "API_RATE_LIMIT_WINDOW_SECONDS",
    60,
  ),
  apiRateLimitLockSeconds: positiveInteger("API_RATE_LIMIT_LOCK_SECONDS", 60),
  corsOrigin:
    process.env.CORS_ORIGIN ||
    [
      ...new Set([
        environment.urls.franceApp.origin,
        environment.urls.internationalApp.origin,
      ]),
    ].join(","),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "dummy-anon-key",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: resolveJwtSecret(environment),
  mfaEncryptionKey:
    process.env.MFA_ENCRYPTION_KEY ||
    "shongre-development-mfa-encryption-key-not-for-production",
  providerCredentialEncryptionKeyBase64:
    process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY_BASE64 ||
    Buffer.from("shongre-provider-dev-key-32byte!", "utf8").toString("base64"),
  providerCredentialKeyVersion:
    process.env.PROVIDER_CREDENTIAL_KEY_VERSION || "development-v1",
  // Access tokens are deliberately short lived. AUTH_TOKEN_TTL_SECONDS remains
  // accepted as a backwards-compatible alias for existing deployments.
  authTokenTtlSeconds: parseInt(
    process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ||
      process.env.AUTH_TOKEN_TTL_SECONDS ||
      "900",
    10,
  ),
  authRefreshTokenTtlSeconds: parseInt(
    process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS || "2592000",
    10,
  ),
  authRecentAuthenticationSeconds: parseInt(
    process.env.AUTH_RECENT_AUTH_SECONDS || "600",
    10,
  ),
  oauthFlowTtlSeconds: parseInt(
    process.env.OAUTH_FLOW_TTL_SECONDS || "600",
    10,
  ),
  oauthAllowedReturnOrigins: [
    ...new Set([
      environment.urls.franceApp.origin,
      environment.urls.internationalApp.origin,
      ...envList("OAUTH_ALLOWED_RETURN_ORIGINS"),
    ]),
  ],
  mobileAuthCallbackUrl:
    process.env.MOBILE_AUTH_CALLBACK_URL || "shongre://auth/callback",
  cookieSecure: envFlag(
    "AUTH_COOKIE_SECURE",
    isProduction(environment.environment),
  ),
  cookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
  socialAuthEnabled: envFlag("ENABLE_SOCIAL_AUTH", false),
  accountLinkingEnabled: envFlag("ENABLE_ACCOUNT_LINKING", false),
  emailPasswordAuthEnabled: envFlag("ENABLE_EMAIL_PASSWORD_AUTH", true),
  authEmailDeliveryUrl: process.env.AUTH_EMAIL_DELIVERY_URL || "",
  authEmailDeliveryToken: process.env.AUTH_EMAIL_DELIVERY_TOKEN || "",
  googleOAuth: {
    enabled: envFlag("ENABLE_GOOGLE_AUTH", false),
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    callbackUrl: new URL(
      `${SHONGRE_API_PREFIX}/auth/oauth/google/callback`,
      environment.urls.api,
    ).toString(),
  },
  appleOAuth: {
    enabled: envFlag("ENABLE_APPLE_AUTH", false),
    clientId: process.env.APPLE_SERVICE_ID || "",
    clientSecret: "",
    callbackUrl: new URL(
      `${SHONGRE_API_PREFIX}/auth/oauth/apple/callback`,
      environment.urls.api,
    ).toString(),
    teamId: process.env.APPLE_TEAM_ID || "",
    keyId: process.env.APPLE_KEY_ID || "",
    privateKey: decodePrivateKey(),
  },
  facebookOAuth: {
    enabled: envFlag("ENABLE_FACEBOOK_AUTH", false),
    clientId: process.env.FACEBOOK_APP_ID || "",
    clientSecret: process.env.FACEBOOK_APP_SECRET || "",
    callbackUrl: new URL(
      `${SHONGRE_API_PREFIX}/auth/oauth/facebook/callback`,
      environment.urls.api,
    ).toString(),
    authorizationUrl:
      process.env.FACEBOOK_AUTHORIZATION_URL ||
      "https://www.facebook.com/dialog/oauth",
    graphApiBaseUrl: process.env.FACEBOOK_GRAPH_API_BASE_URL || "",
  },
  paymentProvider: resolveEnumValue(
    "PAYMENT_PROVIDER",
    ["demo", "stripe"] as const,
    "demo",
  ),
  kycProvider: resolveEnumValue(
    "KYC_PROVIDER",
    ["demo", "stripe", "live"] as const,
    "demo",
  ),
  businessRegistryProvider: resolveEnumValue(
    "BUSINESS_REGISTRY_PROVIDER",
    ["demo", "siret"] as const,
    "demo",
  ),
  aiProvider: resolveEnumValue(
    "AI_PROVIDER",
    ["demo", "gemini"] as const,
    "demo",
  ),
  paymentMode: resolveEnumValue(
    "PAYMENT_MODE",
    ["disabled", "test", "live"] as const,
    "test",
  ),
  emailMode: resolveEnumValue(
    "EMAIL_MODE",
    ["console", "sandbox", "live"] as const,
    "console",
  ),
  aiMode: resolveEnumValue(
    "AI_MODE",
    ["mock", "development", "staging", "production"] as const,
    "mock",
  ),
  analyticsMode: resolveEnumValue(
    "ANALYTICS_MODE",
    ["off", "test", "development", "staging", "production"] as const,
    "off",
  ),
  analyticsProviders: {
    posthog: {
      enabled: envFlag("POSTHOG_ENABLED", false),
      key: process.env.POSTHOG_PROJECT_KEY || "",
      host: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
    },
    ga4: {
      enabled: envFlag("GA4_ENABLED", false),
      measurementId: process.env.GA4_MEASUREMENT_ID || "",
      apiSecret: process.env.GA4_API_SECRET || "",
    },
    matomo: {
      enabled: envFlag("MATOMO_ENABLED", false),
      url: process.env.MATOMO_URL || "",
      siteId: process.env.MATOMO_SITE_ID || "",
      token: process.env.MATOMO_AUTH_TOKEN || "",
    },
    cloudflare: {
      enabled: envFlag("NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_ENABLED", false),
      siteTag: process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_SITE_TAG || "",
    },
    sentry: {
      enabled: envFlag("SENTRY_ENABLED", false),
      dsn: process.env.SENTRY_DSN || "",
      tracesSampleRate: Math.min(
        1,
        Math.max(0, Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0")),
      ),
    },
    searchConsole: {
      enabled: envFlag("SEARCH_CONSOLE_ENABLED", false),
      serviceAccountJson: process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || "",
      siteUrls: envList("SEARCH_CONSOLE_SITE_URLS"),
    },
  },
  emailRecipientAllowlist: envList("EMAIL_RECIPIENT_ALLOWLIST"),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripeConnectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  complianceWebhookSecret: process.env.COMPLIANCE_WEBHOOK_SECRET,
  handoverPinPepper:
    process.env.HANDOVER_PIN_PEPPER ||
    "shongre-development-handover-pin-pepper-not-for-production",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "",
  businessRegistryApiUrl: process.env.BUSINESS_REGISTRY_API_URL || "",
  businessRegistryApiToken: process.env.BUSINESS_REGISTRY_API_TOKEN || "",
  kycProviderBaseUrl: process.env.KYC_PROVIDER_BASE_URL || "",
  kycProviderApiToken: process.env.KYC_PROVIDER_API_TOKEN || "",
  malwareScannerMode: resolveEnumValue(
    "MALWARE_SCAN_MODE",
    ["disabled", "http"] as const,
    "disabled",
  ),
  malwareScannerUrl: process.env.MALWARE_SCAN_URL || "",
  malwareScannerToken: process.env.MALWARE_SCAN_TOKEN || "",
  malwareScannerTimeoutMs: positiveInteger("MALWARE_SCAN_TIMEOUT_MS", 15_000),
};

validateSocialProviderConfiguration(candidateConfig);
validateProductionAuthConfiguration(candidateConfig);
validateProductionRuntimeConfiguration(candidateConfig);
validateCorsConfiguration(candidateConfig);
validateProviderCredentialModes(candidateConfig);
assertEnvironmentSafety({
  config: candidateConfig.environment,
  apiEnvironmentId: requiredRuntimeValue("API_ENVIRONMENT_ID"),
  supabaseEnvironmentId: requiredRuntimeValue("SUPABASE_ENVIRONMENT_ID"),
  storageEnvironmentId: requiredRuntimeValue("STORAGE_ENVIRONMENT_ID"),
  paymentMode: candidateConfig.paymentMode,
  emailMode: candidateConfig.emailMode,
  aiMode: candidateConfig.aiMode,
  analyticsMode: candidateConfig.analyticsMode,
  supabaseProjectRef: process.env.SUPABASE_PROJECT_REF,
  expectedSupabaseProjectRef: process.env.EXPECTED_SUPABASE_PROJECT_REF,
});

export const config: AppConfig = candidateConfig;

export function buildApiUrl(path = "/"): URL {
  return new URL(
    path.startsWith("/") ? path : `/${path}`,
    config.environment.urls.api,
  );
}

export function buildOAuthCallback(
  provider: "google" | "apple" | "facebook",
): URL {
  return buildApiUrl(`${config.apiPrefix}/auth/oauth/${provider}/callback`);
}

export function buildWebhookUrl(provider: string): URL {
  if (!/^[a-z0-9-]+$/.test(provider)) {
    throw new Error("Webhook provider must use a lowercase slug.");
  }
  return buildApiUrl(`${config.apiPrefix}/webhooks/${provider}`);
}

export const isBackendDemoMode = (): boolean => config.dataMode === "demo";
export const isBackendDatabaseMode = (): boolean =>
  config.dataMode === "database";
