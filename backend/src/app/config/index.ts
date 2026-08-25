import dotenv from "dotenv";
import { resolve } from "path";
import { SHONGRE_API_PREFIX } from "@shongre/contracts/openapi";

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

export interface AppConfig {
  nodeEnv: string;
  dataMode: BackendDataMode;
  host: string;
  port: number;
  frontendUrl: string;
  apiPrefix: typeof SHONGRE_API_PREFIX;
  maxRequestBodyBytes: number;
  requestTimeoutMs: number;
  shutdownGraceMs: number;
  corsOrigin: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  databaseUrl?: string;
  jwtSecret: string;
  mfaEncryptionKey: string;
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
function resolveJwtSecret(nodeEnv: string): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = nodeEnv === "production";

  if (!secret) {
    if (isProduction) {
      throw new Error(
        "[Config Error] JWT_SECRET is required in production. Set it to a random value of at least " +
          `${MIN_JWT_SECRET_LENGTH} characters.`,
      );
    }
    return INSECURE_DEV_JWT_SECRET;
  }

  if (isProduction) {
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
    ["GOOGLE_OAUTH_CALLBACK_URL", candidate.googleOAuth.callbackUrl],
  ]);
  requireKeys(candidate.appleOAuth.enabled, [
    ["APPLE_SERVICE_ID", candidate.appleOAuth.clientId],
    ["APPLE_TEAM_ID", candidate.appleOAuth.teamId],
    ["APPLE_KEY_ID", candidate.appleOAuth.keyId],
    [
      "APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_BASE64",
      candidate.appleOAuth.privateKey,
    ],
    ["APPLE_OAUTH_CALLBACK_URL", candidate.appleOAuth.callbackUrl],
  ]);
  requireKeys(candidate.facebookOAuth.enabled, [
    ["FACEBOOK_APP_ID", candidate.facebookOAuth.clientId],
    ["FACEBOOK_APP_SECRET", candidate.facebookOAuth.clientSecret],
    ["FACEBOOK_OAUTH_CALLBACK_URL", candidate.facebookOAuth.callbackUrl],
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
  if (candidate.nodeEnv !== "production" || !candidate.emailPasswordAuthEnabled)
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
  if (!candidate.frontendUrl) missing.push("FRONTEND_URL");
  if (missing.length) {
    throw new Error(
      `[Config Error] Email/password authentication is enabled but required keys are missing: ${missing.join(", ")}.`,
    );
  }
}

function validateProductionRuntimeConfiguration(candidate: AppConfig): void {
  if (candidate.nodeEnv !== "production") return;

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

  requireHttpsUrl("FRONTEND_URL", process.env.FRONTEND_URL || "");
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

  if (missing.length > 0) {
    throw new Error(
      `[Config Error] Production runtime configuration is incomplete: ${missing.join(", ")}.`,
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

const candidateConfig: AppConfig = {
  nodeEnv,
  dataMode: resolveDataMode(),
  host: requiredRuntimeValue("BACKEND_HOST"),
  port: requiredRuntimePort(),
  frontendUrl: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "",
  apiPrefix: SHONGRE_API_PREFIX,
  maxRequestBodyBytes: positiveInteger("MAX_REQUEST_BODY_BYTES", 1_048_576),
  requestTimeoutMs: positiveInteger("REQUEST_TIMEOUT_MS", 30_000),
  shutdownGraceMs: positiveInteger("SHUTDOWN_GRACE_MS", 15_000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "dummy-anon-key",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: resolveJwtSecret(nodeEnv),
  mfaEncryptionKey:
    process.env.MFA_ENCRYPTION_KEY ||
    "shongre-development-mfa-encryption-key-not-for-production",
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
  oauthAllowedReturnOrigins: envList("OAUTH_ALLOWED_RETURN_ORIGINS"),
  mobileAuthCallbackUrl:
    process.env.MOBILE_AUTH_CALLBACK_URL || "shongre://auth/callback",
  cookieSecure: envFlag("AUTH_COOKIE_SECURE", nodeEnv === "production"),
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
    callbackUrl: process.env.GOOGLE_OAUTH_CALLBACK_URL || "",
  },
  appleOAuth: {
    enabled: envFlag("ENABLE_APPLE_AUTH", false),
    clientId: process.env.APPLE_SERVICE_ID || "",
    clientSecret: "",
    callbackUrl: process.env.APPLE_OAUTH_CALLBACK_URL || "",
    teamId: process.env.APPLE_TEAM_ID || "",
    keyId: process.env.APPLE_KEY_ID || "",
    privateKey: decodePrivateKey(),
  },
  facebookOAuth: {
    enabled: envFlag("ENABLE_FACEBOOK_AUTH", false),
    clientId: process.env.FACEBOOK_APP_ID || "",
    clientSecret: process.env.FACEBOOK_APP_SECRET || "",
    callbackUrl: process.env.FACEBOOK_OAUTH_CALLBACK_URL || "",
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
};

validateSocialProviderConfiguration(candidateConfig);
validateProductionAuthConfiguration(candidateConfig);
validateProductionRuntimeConfiguration(candidateConfig);

export const config: AppConfig = candidateConfig;

export const isBackendDemoMode = (): boolean => config.dataMode === "demo";
export const isBackendDatabaseMode = (): boolean =>
  config.dataMode === "database";
