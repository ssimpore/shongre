import type { ProviderOperationalDefinition } from "@shongre/contracts/provider-platform";

/**
 * SHONGRE CANONICAL PROVIDER DOMAIN TYPES
 * Authoritative types for external services, integrations, routing,
 * multi-market inheritance, and credentials status representations.
 */

export const PROVIDER_CONFIGURATION_CONSTRAINTS = {
  priority: { min: 1, max: 10, step: 1 },
  unconfiguredSortPriority: Number.MAX_SAFE_INTEGER,
} as const;

export type ProviderCategory =
  | "PAYMENT"
  | "PAYOUT"
  | "DELIVERY"
  | "AUTHENTICATION"
  | "EMAIL"
  | "SMS"
  | "PUSH"
  | "STORAGE"
  | "CDN"
  | "IMAGE_PROCESSING"
  | "MAPS"
  | "GEOCODING"
  | "SEARCH"
  | "AI"
  | "ANALYTICS"
  | "ERROR_MONITORING"
  | "FRAUD_RISK"
  | "CAPTCHA"
  | "CRM"
  | "INVOICING"
  | "IDENTITY_VERIFICATION"
  | "BUSINESS_VERIFICATION";

export type ProviderCapability =
  // Payments
  | "payment.card"
  | "payment.wallet"
  | "payment.sepa"
  | "payment.escrow"
  | "payment.refund"
  | "payment.marketplace"
  | "payment.subscription"
  | "payout.transfer"
  | "payout.instant"
  // Delivery & Logistics
  | "delivery.relay_point"
  | "delivery.home_delivery"
  | "delivery.express"
  | "delivery.bulky"
  | "delivery.quote"
  | "delivery.tracking"
  | "delivery.label"
  // Authentication & SSO
  | "auth.oauth_google"
  | "auth.oauth_apple"
  | "auth.email_password"
  | "auth.mfa_totp"
  | "auth.session"
  // Communications
  | "email.transactional"
  | "email.marketing"
  | "sms.otp"
  | "sms.transactional"
  | "push.web"
  | "push.mobile"
  // AI & Search
  | "ai.listing_assistance"
  | "ai.safety_audit"
  | "ai.prospect_research"
  | "ai.company_enrichment"
  | "search.marketplace"
  | "search.public_web"
  // Maps & Location
  | "maps.display"
  | "maps.geocode"
  | "maps.reverse_geocode"
  | "maps.autocomplete"
  // KYC & KYB Verification
  | "verification.identity"
  | "verification.business"
  | "verification.vat"
  | "verification.payment"
  // Storage & Media
  | "storage.media"
  | "storage.document"
  | "cdn.delivery"
  | "image.optimization"
  // Analytics & Monitoring
  | "analytics.product"
  | "monitoring.error_tracking"
  // Billing & Invoicing
  | "invoicing.subscription"
  | "invoicing.electronic"
  // Security & Trust
  | "security.captcha"
  | "security.fraud_risk";

export type ProviderEnvironment = "demo" | "sandbox" | "production";

export type CredentialStatus =
  "not_required" | "not_configured" | "configured" | "invalid" | "expired";

export type ProviderHealthStatus =
  "unknown" | "healthy" | "degraded" | "unavailable";

export type ProviderStatus =
  "draft" | "active" | "disabled" | "requires_configuration";

export type IntegrationReadiness =
  | "not_implemented"
  | "demo_only"
  | "implemented_unverified"
  | "implemented_demo"
  | "frontend_only"
  | "backend_pending"
  | "production_ready";

export interface ConfigurationFieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface ProviderConfigurationField {
  key: string;
  label: string;
  type:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multi-select"
    | "url"
    | "password";
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  secret?: boolean; // When true, value is server-managed and masked in frontend
  options?: ConfigurationFieldOption[];
  dependsOn?: {
    field: string;
    value: any;
  };
}

export interface ProviderConfigurationSchema {
  fields: ProviderConfigurationField[];
}

export interface ProviderMetadata {
  website?: string;
  documentationUrl?: string;
  documentationLabel?: string;
  logoAsset?: string;
  iconName?: string;
  companyName?: string;
  headquartersCountry?: string;
  complianceNotes?: string;
}

/**
 * Authoritative Static Provider Definition
 */
export interface Provider {
  id: string; // e.g. 'mangopay', 'mondial_relay', 'google_gemini'
  code: string; // Stable internal code
  name: string; // Human-readable name
  category: ProviderCategory;
  capabilities: ProviderCapability[];
  supportedMarkets: string[]; // e.g. ['FR', 'BE', 'CH', 'ES', 'LU', 'DE'] or ['*']
  supportedCurrencies: string[]; // e.g. ['EUR', 'CHF']
  supportedLocales: string[]; // e.g. ['fr-FR', 'en-US', 'es-ES']
  integrationReadiness: IntegrationReadiness;
  /** Code-audited operational truth shared with the backend. */
  operational: ProviderOperationalDefinition;
  isCustomizablePerMarket?: boolean;
  configurationSchema: ProviderConfigurationSchema;
  metadata: ProviderMetadata;
}

/**
 * Market-specific Provider Configuration Override
 */
export interface ProviderMarketOverride {
  enabled?: boolean;
  priority?: number;
  environment?: ProviderEnvironment;
  settings?: Record<string, any>;
  customNotes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Operational Configuration for a Provider
 */
export interface ProviderConfiguration {
  providerId: string;
  enabled: boolean;
  environment: ProviderEnvironment;
  priority: number; // Lower number = higher priority (e.g. 1 = Primary, 2 = Secondary/Fallback)
  credentialStatus: CredentialStatus;
  credentialLastUpdatedAt?: string;
  credentialKeyHint?: string; // e.g. '•••• •••• 4242' or 'Géré côté serveur'
  health: ProviderHealthStatus;
  healthLastCheckedAt?: string;
  healthMessage?: string;
  settings: Record<string, any>;
  marketOverrides: Record<string, ProviderMarketOverride>; // Keyed by Market Code (e.g. 'BE', 'ES')
  updatedAt: string;
  updatedBy?: string;
  version: number;
}

/**
 * Canonical Routing Rule for a Capability
 */
export interface ProviderRoutingRule {
  capability: ProviderCapability;
  marketCode: string; // 'FR' is canonical baseline, 'BE', 'ES', etc.
  primaryProviderId: string;
  fallbackProviderId?: string;
  availableProviderIds: string[];
  isCustomized: boolean; // false if inherited from FR
  updatedAt: string;
}

/**
 * Effective Resolution Result for a Capability in a Market
 */
export interface EffectiveProviderResolution {
  capability: ProviderCapability;
  marketCode: string;
  isAvailable: boolean;
  primaryProvider: Provider | null;
  primaryConfig: ProviderConfiguration | null;
  fallbackProvider: Provider | null;
  fallbackConfig: ProviderConfiguration | null;
  isInheritedFromBaseline: boolean;
  effectiveHealth: ProviderHealthStatus;
  reason?: string;
}

/**
 * Platform Capability Operational Health Result
 */
export interface CapabilityHealthResult {
  capability: ProviderCapability;
  category: ProviderCategory;
  marketCode: string;
  status:
    | "operational"
    | "degraded"
    | "unavailable"
    | "unconfigured"
    | "demo"
    | "unknown";
  activeProviderName: string;
  activeProviderId: string;
  isFallbackActive: boolean;
  isInherited: boolean;
  message?: string;
}

/**
 * Impact Analysis Result before Mutation
 */
export interface ProviderImpactAnalysis {
  providerId: string;
  providerName: string;
  affectedCapabilities: ProviderCapability[];
  directlyAffectedMarkets: string[];
  inheritedMarketsAffected: string[]; // Downstream markets inheriting FR
  impactedPlatformFeatures: string[];
  isSafeToDisable: boolean;
  warningMessages: string[];
  hasAlternativeFallback: boolean;
}

/**
 * Deterministic Test Simulation Result
 */
export interface ProviderTestResult {
  providerId: string;
  success: boolean;
  scenario:
    | "healthy"
    | "missing_credentials"
    | "timeout"
    | "invalid_config"
    | "unsupported_market";
  latencyMs: number;
  message: string;
  testedAt: string;
  diagnostics: Record<string, any>;
  evidence?: "none" | "configuration" | "live_probe" | "runtime_signal";
  supported?: boolean;
}

/**
 * Provider Configuration Audit Log Event
 */
export interface ProviderAuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  providerId: string;
  providerName: string;
  action:
    | "configured"
    | "enabled"
    | "disabled"
    | "priority_changed"
    | "environment_changed"
    | "credentials_updated"
    | "market_override_set"
    | "market_override_reset"
    | "health_simulated";
  marketCode?: string;
  details: string;
  previousValue?: any;
  newValue?: any;
}
