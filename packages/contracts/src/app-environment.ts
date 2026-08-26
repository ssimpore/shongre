import { z } from "zod";

export const APP_ENVIRONMENTS = [
  "local",
  "test",
  "preview",
  "development",
  "staging",
  "production",
] as const;

export const appEnvironmentSchema = z.enum(APP_ENVIRONMENTS);
export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;

export interface EnvironmentUrls {
  franceApp: URL;
  internationalApp: URL;
  api: URL;
}

export interface EnvironmentConfig {
  environment: AppEnvironment;
  environmentId: string;
  urls: EnvironmentUrls;
  searchIndexingEnabled: boolean;
}

export interface EnvironmentConfigInput {
  appEnvironment: unknown;
  environmentId: unknown;
  publicFranceUrl: unknown;
  publicInternationalUrl: unknown;
  apiUrl: unknown;
}

export type PaymentEnvironmentMode = "disabled" | "test" | "live";
export type EmailEnvironmentMode = "console" | "sandbox" | "live";
export type AiEnvironmentMode =
  "mock" | "development" | "staging" | "production";
export type AnalyticsEnvironmentMode =
  "off" | "test" | "development" | "staging" | "production";

export interface EnvironmentSafetyInput {
  config: EnvironmentConfig;
  apiEnvironmentId?: string;
  supabaseEnvironmentId?: string;
  storageEnvironmentId?: string;
  paymentMode: PaymentEnvironmentMode;
  emailMode: EmailEnvironmentMode;
  aiMode: AiEnvironmentMode;
  analyticsMode: AnalyticsEnvironmentMode;
  supabaseProjectRef?: string;
  expectedSupabaseProjectRef?: string;
}

export const ENVIRONMENT_PROVIDER_MODES: Readonly<
  Record<
    AppEnvironment,
    Pick<
      EnvironmentSafetyInput,
      "paymentMode" | "emailMode" | "aiMode" | "analyticsMode"
    >
  >
> = Object.freeze({
  local: {
    paymentMode: "test",
    emailMode: "console",
    aiMode: "mock",
    analyticsMode: "off",
  },
  test: {
    paymentMode: "test",
    emailMode: "console",
    aiMode: "mock",
    analyticsMode: "test",
  },
  preview: {
    paymentMode: "test",
    emailMode: "sandbox",
    aiMode: "development",
    analyticsMode: "test",
  },
  development: {
    paymentMode: "test",
    emailMode: "sandbox",
    aiMode: "development",
    analyticsMode: "development",
  },
  staging: {
    paymentMode: "test",
    emailMode: "sandbox",
    aiMode: "staging",
    analyticsMode: "staging",
  },
  production: {
    paymentMode: "live",
    emailMode: "live",
    aiMode: "production",
    analyticsMode: "production",
  },
});

const environmentIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "ENVIRONMENT_ID must use lowercase kebab-case.",
  );

function parseHttpUrl(name: string, value: unknown): URL {
  const parsed = z.string().trim().url().safeParse(value);
  if (!parsed.success) {
    throw new Error(`[Config Error] ${name} must be an absolute URL.`);
  }
  const url = new URL(parsed.data);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`[Config Error] ${name} must use HTTP or HTTPS.`);
  }
  if (url.username || url.password) {
    throw new Error(`[Config Error] ${name} must not contain credentials.`);
  }
  if (url.search || url.hash) {
    throw new Error(`[Config Error] ${name} must not contain a query or hash.`);
  }
  if (url.pathname !== "/") {
    throw new Error(`[Config Error] ${name} must be an origin without a path.`);
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url;
}

export function parseAppEnvironment(value: unknown): AppEnvironment {
  const parsed = appEnvironmentSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `[Config Error] APP_ENV must be one of ${APP_ENVIRONMENTS.join(", ")}.`,
    );
  }
  return parsed.data;
}

export function createEnvironmentConfig(
  input: EnvironmentConfigInput,
): EnvironmentConfig {
  const environment = parseAppEnvironment(input.appEnvironment);
  const environmentId = environmentIdSchema.safeParse(input.environmentId);
  if (!environmentId.success) {
    throw new Error(
      `[Config Error] Invalid ENVIRONMENT_ID: ${environmentId.error.issues[0]?.message || "value is required"}`,
    );
  }

  const config: EnvironmentConfig = {
    environment,
    environmentId: environmentId.data,
    urls: {
      franceApp: parseHttpUrl("PUBLIC_FR_URL", input.publicFranceUrl),
      internationalApp: parseHttpUrl(
        "PUBLIC_INTL_URL",
        input.publicInternationalUrl,
      ),
      api: parseHttpUrl("API_URL", input.apiUrl),
    },
    searchIndexingEnabled: environment === "production",
  };

  const requiresHttps = !isLocal(environment) && !isTest(environment);
  if (
    requiresHttps &&
    Object.values(config.urls).some((url) => url.protocol !== "https:")
  ) {
    throw new Error(
      `[Config Error] ${environment} application URLs must use HTTPS.`,
    );
  }
  if (
    config.urls.franceApp.protocol !== config.urls.internationalApp.protocol
  ) {
    throw new Error(
      "[Config Error] PUBLIC_FR_URL and PUBLIC_INTL_URL must use the same protocol.",
    );
  }

  return Object.freeze({
    ...config,
    urls: Object.freeze(config.urls),
  });
}

export const isLocal = (environment: AppEnvironment): boolean =>
  environment === "local";
export const isTest = (environment: AppEnvironment): boolean =>
  environment === "test";
export const isPreview = (environment: AppEnvironment): boolean =>
  environment === "preview";
export const isDevelopment = (environment: AppEnvironment): boolean =>
  environment === "development";
export const isStaging = (environment: AppEnvironment): boolean =>
  environment === "staging";
export const isProduction = (environment: AppEnvironment): boolean =>
  environment === "production";

function requireMatchingFingerprint(
  expected: string,
  actual: string | undefined,
  name: string,
): void {
  if (actual && actual !== expected) {
    throw new Error(
      `[Environment Safety] ${name}=${actual} does not match ENVIRONMENT_ID=${expected}.`,
    );
  }
}

export function assertEnvironmentSafety(input: EnvironmentSafetyInput): void {
  const { config } = input;
  requireMatchingFingerprint(
    config.environmentId,
    input.apiEnvironmentId,
    "API_ENVIRONMENT_ID",
  );
  requireMatchingFingerprint(
    config.environmentId,
    input.supabaseEnvironmentId,
    "SUPABASE_ENVIRONMENT_ID",
  );
  requireMatchingFingerprint(
    config.environmentId,
    input.storageEnvironmentId,
    "STORAGE_ENVIRONMENT_ID",
  );

  if (
    input.expectedSupabaseProjectRef &&
    input.supabaseProjectRef !== input.expectedSupabaseProjectRef
  ) {
    throw new Error(
      "[Environment Safety] SUPABASE_PROJECT_REF does not match EXPECTED_SUPABASE_PROJECT_REF.",
    );
  }

  if (isProduction(config.environment)) {
    if (input.paymentMode !== "live") {
      throw new Error(
        "[Environment Safety] Production payments must use live mode.",
      );
    }
    if (input.emailMode !== "live") {
      throw new Error(
        "[Environment Safety] Production email must use live mode.",
      );
    }
    if (input.aiMode !== "production") {
      throw new Error(
        "[Environment Safety] Production AI must use production mode.",
      );
    }
    if (input.analyticsMode !== "production") {
      throw new Error(
        "[Environment Safety] Production analytics must use production mode.",
      );
    }
    return;
  }

  if (input.paymentMode === "live") {
    throw new Error(
      `[Environment Safety] ${config.environment} cannot use live payments.`,
    );
  }
  if (input.emailMode === "live") {
    throw new Error(
      `[Environment Safety] ${config.environment} cannot use live email.`,
    );
  }
  if (input.aiMode === "production") {
    throw new Error(
      `[Environment Safety] ${config.environment} cannot use production AI.`,
    );
  }
  if (input.analyticsMode === "production") {
    throw new Error(
      `[Environment Safety] ${config.environment} cannot use production analytics.`,
    );
  }

  const expectedModes = ENVIRONMENT_PROVIDER_MODES[config.environment];
  for (const key of [
    "paymentMode",
    "emailMode",
    "aiMode",
    "analyticsMode",
  ] as const) {
    if (input[key] !== expectedModes[key]) {
      throw new Error(
        `[Environment Safety] ${key} must be ${expectedModes[key]} for ${config.environment}.`,
      );
    }
  }
}
