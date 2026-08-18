import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from backend directory, root directory, or cwd
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: resolve(process.cwd(), '../.env') });

export type BackendDataMode = 'demo' | 'database';
export type PaymentProviderMode = 'demo' | 'stripe';
export type KYCProviderMode = 'demo' | 'stripe' | 'live';
export type BusinessRegistryProviderMode = 'demo' | 'siret';
export type AIProviderMode = 'demo' | 'gemini';

export interface AppConfig {
  nodeEnv: string;
  dataMode: BackendDataMode;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  databaseUrl?: string;
  jwtSecret: string;
  authTokenTtlSeconds: number;
  paymentProvider: PaymentProviderMode;
  kycProvider: KYCProviderMode;
  businessRegistryProvider: BusinessRegistryProviderMode;
  aiProvider: AIProviderMode;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  geminiApiKey?: string;
}

function resolveDataMode(): BackendDataMode {
  const rawMode = process.env.BACKEND_DATA_MODE || 'demo';
  if (rawMode !== 'demo' && rawMode !== 'database') {
    throw new Error(
      `[Config Error] Invalid BACKEND_DATA_MODE="${rawMode}". Allowed values are "demo" or "database".`
    );
  }
  return rawMode as BackendDataMode;
}

/**
 * Development-only signing secret.
 *
 * Deliberately a fixed, obviously-fake string rather than a random value
 * generated at boot: a per-process random secret would silently invalidate
 * every session on restart and make the failure look like a bug elsewhere.
 * Production refuses to start with this value — see resolveJwtSecret.
 */
const INSECURE_DEV_JWT_SECRET = 'shongre-insecure-development-signing-key-do-not-use-in-production';

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Resolves the token signing secret, failing fast when production is
 * misconfigured. An unset or too-short secret in production means every
 * session token on the platform is forgeable, so booting anyway is worse
 * than not booting at all.
 */
function resolveJwtSecret(nodeEnv: string): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = nodeEnv === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error(
        '[Config Error] JWT_SECRET is required in production. Set it to a random value of at least ' +
          `${MIN_JWT_SECRET_LENGTH} characters.`
      );
    }
    return INSECURE_DEV_JWT_SECRET;
  }

  if (isProduction) {
    if (secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `[Config Error] JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production.`
      );
    }
    if (secret === INSECURE_DEV_JWT_SECRET || secret.includes('change-in-production')) {
      throw new Error('[Config Error] JWT_SECRET is still set to a placeholder value in production.');
    }
  }

  return secret;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config: AppConfig = {
  nodeEnv,
  dataMode: resolveDataMode(),
  port: parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'dummy-anon-key',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: resolveJwtSecret(nodeEnv),
  authTokenTtlSeconds: parseInt(process.env.AUTH_TOKEN_TTL_SECONDS || '43200', 10),
  paymentProvider: (process.env.PAYMENT_PROVIDER as PaymentProviderMode) || 'demo',
  kycProvider: (process.env.KYC_PROVIDER as KYCProviderMode) || 'demo',
  businessRegistryProvider: (process.env.BUSINESS_REGISTRY_PROVIDER as BusinessRegistryProviderMode) || 'demo',
  aiProvider: (process.env.AI_PROVIDER as AIProviderMode) || 'demo',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  geminiApiKey: process.env.GEMINI_API_KEY,
};

export const isBackendDemoMode = (): boolean => config.dataMode === 'demo';
export const isBackendDatabaseMode = (): boolean => config.dataMode === 'database';
