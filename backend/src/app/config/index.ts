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

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  dataMode: resolveDataMode(),
  port: parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'dummy-anon-key',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key',
  databaseUrl: process.env.DATABASE_URL,
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
