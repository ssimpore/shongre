/**
 * Canonical provider-platform contract.
 *
 * This registry describes code ownership and production evidence. It is shared
 * by the backend control plane and the frontend admin UI so a decorative card
 * or a demo adapter can never become the source of operational truth.
 */

export const PROVIDER_LIFECYCLES = [
  "NOT_NEEDED",
  "PLANNED",
  "IMPLEMENTING",
  "IMPLEMENTED",
  "SANDBOX_VALIDATED",
  "PRODUCTION_READY",
  "ACTIVE",
  "DEGRADED",
  "DISABLED",
  "DEPRECATED",
] as const;

export type ProviderLifecycle = (typeof PROVIDER_LIFECYCLES)[number];

export const PROVIDER_HEALTH_STATES = [
  "UNKNOWN",
  "HEALTHY",
  "DEGRADED",
  "PARTIAL_OUTAGE",
  "OUTAGE",
  "MISCONFIGURED",
  "DISABLED",
] as const;

export type ProviderOperationalHealth = (typeof PROVIDER_HEALTH_STATES)[number];

export type ProviderAdapterStatus = "NONE" | "DEMO_ONLY" | "IMPLEMENTED";
export type ProviderKind = "EXTERNAL" | "INTERNAL";
export type ProviderCriticality = "P0" | "P1" | "P2" | "P3";
export type ProviderHealthCheckKind =
  "NONE" | "CONFIGURATION_ONLY" | "SAFE_AUTHENTICATED_READ" | "INTERNAL_PROBE";

export interface ProviderOperationalDefinition {
  id: string;
  displayName: string;
  kind: ProviderKind;
  category: string;
  capabilities: readonly string[];
  implementedCapabilities: readonly string[];
  demoOnlyCapabilities?: readonly string[];
  adapterStatus: ProviderAdapterStatus;
  lifecycle: ProviderLifecycle;
  criticality: ProviderCriticality;
  runtimeOwner: string;
  requiredEnvironmentVariables: readonly string[];
  optionalEnvironmentVariables?: readonly string[];
  healthCheckKind: ProviderHealthCheckKind;
  webhookSupport: "NONE" | "IMPLEMENTED" | "REQUIRED_MISSING";
  supportedMarkets: readonly string[];
  supportedCurrencies: readonly string[];
  documentationUrl?: string;
  evidence: readonly string[];
  blockers: readonly string[];
}

export interface ProviderRuntimeEvidence {
  configured: boolean;
  enabled: boolean;
  environment: "demo" | "sandbox" | "production";
  health: ProviderOperationalHealth;
  healthEvidence: "NONE" | "CONFIGURATION" | "LIVE_PROBE" | "RUNTIME_SIGNAL";
  lastCheckedAt?: string;
  lastSuccessfulAt?: string;
  lastFailureAt?: string;
  latencyMs?: number;
  errorRatePercent?: number;
  webhookLastReceivedAt?: string;
  credentialExpiresAt?: string;
  message: string;
}

export interface ProviderReadiness {
  score: number;
  productionReady: boolean;
  active: boolean;
  blockers: readonly string[];
}

export type ProviderCapabilityState =
  "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE" | "UNCONFIGURED" | "UNKNOWN";

export interface ProviderControlPlaneEntry {
  definition: ProviderOperationalDefinition;
  runtime: ProviderRuntimeEvidence;
  readiness: ProviderReadiness;
}

export interface ProviderCapabilityControlPlaneEntry {
  domain: string;
  capability: string;
  label: string;
  requirement: string;
  criticality: string;
  markets: readonly string[];
  primaryProviderId: string;
  fallbackProviderId?: string;
  primaryState: ProviderCapabilityState;
  fallbackReady: boolean;
  blockers: readonly string[];
  gracefulDegradation: string;
}

export interface ProviderControlPlaneSnapshot {
  generatedAt: string;
  environment: ProviderRuntimeEvidence["environment"];
  providers: ProviderControlPlaneEntry[];
  capabilities: ProviderCapabilityControlPlaneEntry[];
  summary: {
    discovered: number;
    implemented: number;
    active: number;
    productionReady: number;
    missingCriticalCapabilities: number;
    verifiedHealthScore: number | null;
    verifiedCriticalCapabilities: number;
  };
}

export interface ProviderDiagnosticResult {
  providerId: string;
  supported: boolean;
  success: boolean;
  health: ProviderOperationalHealth;
  evidence: ProviderRuntimeEvidence["healthEvidence"];
  message: string;
  testedAt: string;
  latencyMs: number;
  checks: ReadonlyArray<{
    name: string;
    status: "PASS" | "FAIL" | "SKIP";
    message: string;
  }>;
}

export interface ProviderRoutingPolicy {
  capability: string;
  marketCode: string;
  primaryProviderId: string;
  fallbackProviderId?: string;
  automaticFailover: boolean;
}

export interface ProviderRouteResolution {
  capability: string;
  marketCode: string;
  selectedProviderId: string | null;
  primaryProviderId: string;
  fallbackProviderId?: string;
  fallbackReady: boolean;
  isFallbackActive: boolean;
  status: "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";
  reasons: readonly string[];
}

export type CapabilityRequirementLevel =
  "REQUIRED" | "CONTEXTUAL" | "RECOMMENDED" | "OPTIONAL" | "NOT_NEEDED";

export interface ProviderCapabilityRequirement {
  domain: string;
  capability: string;
  label: string;
  requirement: CapabilityRequirementLevel;
  criticality: ProviderCriticality;
  markets: readonly string[];
  primaryProviderId: string;
  fallbackProviderId?: string;
  gracefulDegradation: string;
}

const planned = (
  id: string,
  displayName: string,
  category: string,
  capabilities: readonly string[],
  criticality: ProviderCriticality,
  runtimeOwner: string,
  documentationUrl?: string,
): ProviderOperationalDefinition => ({
  id,
  displayName,
  kind: "EXTERNAL",
  category,
  capabilities,
  implementedCapabilities: [],
  adapterStatus: "NONE",
  lifecycle: "PLANNED",
  criticality,
  runtimeOwner,
  requiredEnvironmentVariables: [],
  healthCheckKind: "NONE",
  webhookSupport: "NONE",
  supportedMarkets: ["FR"],
  supportedCurrencies: [],
  documentationUrl,
  evidence: [
    "Catalogue/admin presentation only; no backend runtime adapter discovered.",
  ],
  blockers: [
    "Backend adapter, credentials contract, health probe and integration tests are missing.",
  ],
});

const implementedGateway = (
  id: string,
  displayName: string,
  category: string,
  capabilities: readonly string[],
  criticality: ProviderCriticality,
  documentationUrl?: string,
): ProviderOperationalDefinition => ({
  ...planned(
    id,
    displayName,
    category,
    capabilities,
    criticality,
    "backend/src/integrations/providers/gateways/remote-capability-gateways.ts",
    documentationUrl,
  ),
  implementedCapabilities: capabilities,
  adapterStatus: "IMPLEMENTED",
  lifecycle: "IMPLEMENTED",
  healthCheckKind: "SAFE_AUTHENTICATED_READ",
  webhookSupport: category === "EMAIL" ? "IMPLEMENTED" : "NONE",
  evidence: [
    "Uses the shared ProviderConnection credential vault and provider-neutral capability gateway.",
  ],
  blockers: [
    "Production readiness still requires tenant credentials, provider-side webhook configuration and a live smoke test.",
  ],
});

/**
 * Code-audited provider inventory. Production configuration is intentionally
 * excluded: the backend adds environment-specific evidence at runtime.
 */
export const SHONGRE_PROVIDER_REGISTRY: readonly ProviderOperationalDefinition[] =
  [
    {
      ...planned(
        "mangopay",
        "MANGOPAY",
        "PAYMENT",
        [
          "payment.card",
          "payment.wallet",
          "payment.sepa",
          "payment.escrow",
          "payment.refund",
          "payout.transfer",
          "payout.instant",
        ],
        "P0",
        "backend/src/integrations/providers",
        "https://docs.mangopay.com/",
      ),
      adapterStatus: "DEMO_ONLY",
      lifecycle: "IMPLEMENTING",
      demoOnlyCapabilities: [
        "payment.card",
        "payment.wallet",
        "payment.sepa",
        "payment.escrow",
        "payment.refund",
        "payout.transfer",
        "payout.instant",
      ],
      evidence: [
        "A deterministic demo payment provider exists; there is no MANGOPAY API adapter.",
      ],
    },
    {
      id: "stripe",
      displayName: "Stripe Checkout / Billing",
      kind: "EXTERNAL",
      category: "PAYMENT",
      capabilities: [
        "payment.card",
        "payment.wallet",
        "payment.refund",
        "payment.subscription",
        "payment.marketplace",
        "payout.transfer",
        "verification.payment",
      ],
      implementedCapabilities: [
        "payment.card",
        "payment.wallet",
        "payment.refund",
        "payment.subscription",
        "payment.marketplace",
        "payout.transfer",
        "verification.payment",
      ],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P0",
      runtimeOwner: "backend/src/integrations/stripe",
      requiredEnvironmentVariables: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_CONNECT_WEBHOOK_SECRET",
      ],
      optionalEnvironmentVariables: [
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_PRICE_*",
      ],
      healthCheckKind: "SAFE_AUTHENTICATED_READ",
      webhookSupport: "IMPLEMENTED",
      supportedMarkets: ["FR", "BE", "LU", "ES", "DE", "CH"],
      supportedCurrencies: ["EUR", "CHF"],
      documentationUrl: "https://docs.stripe.com/",
      evidence: [
        "Real Checkout Session, refund, transfer, payout and subscription cancellation HTTP adapters.",
        "Marketplace orders use a platform charge followed by an idempotent seller transfer after confirmed fulfilment.",
        "Stripe Accounts v2 onboarding, Identity sessions and separately signed v1/v2 webhook processing are implemented.",
      ],
      blockers: [],
    },
    {
      ...planned(
        "mondial_relay",
        "Mondial Relay",
        "DELIVERY",
        [
          "delivery.relay_point",
          "delivery.quote",
          "delivery.tracking",
          "delivery.label",
        ],
        "P0",
        "frontend/src/domains/fulfillment",
      ),
      adapterStatus: "DEMO_ONLY",
      lifecycle: "IMPLEMENTING",
      demoOnlyCapabilities: [
        "delivery.relay_point",
        "delivery.quote",
        "delivery.tracking",
        "delivery.label",
      ],
      evidence: [
        "Deterministic frontend demo quotes exist; no carrier API adapter exists.",
      ],
    },
    {
      ...planned(
        "colissimo",
        "Colissimo",
        "DELIVERY",
        [
          "delivery.home_delivery",
          "delivery.quote",
          "delivery.tracking",
          "delivery.label",
        ],
        "P0",
        "frontend/src/domains/fulfillment",
      ),
      adapterStatus: "DEMO_ONLY",
      lifecycle: "IMPLEMENTING",
      demoOnlyCapabilities: [
        "delivery.home_delivery",
        "delivery.quote",
        "delivery.tracking",
        "delivery.label",
      ],
      evidence: [
        "Deterministic frontend demo quotes exist; no carrier API adapter exists.",
      ],
    },
    {
      ...planned(
        "chronopost",
        "Chronopost",
        "DELIVERY",
        [
          "delivery.express",
          "delivery.home_delivery",
          "delivery.quote",
          "delivery.tracking",
          "delivery.label",
        ],
        "P1",
        "frontend/src/domains/fulfillment",
      ),
      adapterStatus: "DEMO_ONLY",
      lifecycle: "IMPLEMENTING",
      demoOnlyCapabilities: [
        "delivery.express",
        "delivery.home_delivery",
        "delivery.quote",
        "delivery.tracking",
        "delivery.label",
      ],
      evidence: [
        "Deterministic frontend demo quotes exist; no carrier API adapter exists.",
      ],
    },
    {
      ...planned(
        "cocolis",
        "Cocolis",
        "DELIVERY",
        ["delivery.bulky", "delivery.quote", "delivery.tracking"],
        "P1",
        "frontend/src/domains/fulfillment",
      ),
      adapterStatus: "DEMO_ONLY",
      lifecycle: "IMPLEMENTING",
      demoOnlyCapabilities: [
        "delivery.bulky",
        "delivery.quote",
        "delivery.tracking",
      ],
      evidence: [
        "Deterministic frontend demo quotes exist; no carrier API adapter exists.",
      ],
    },
    {
      id: "google_identity",
      displayName: "Google Identity",
      kind: "EXTERNAL",
      category: "AUTHENTICATION",
      capabilities: ["auth.oauth_google"],
      implementedCapabilities: ["auth.oauth_google"],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P1",
      runtimeOwner: "backend/src/modules/auth/oauth-provider.client.ts",
      requiredEnvironmentVariables: [
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_OAUTH_CLIENT_SECRET",
        "GOOGLE_OAUTH_CALLBACK_URL",
      ],
      healthCheckKind: "CONFIGURATION_ONLY",
      webhookSupport: "NONE",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      documentationUrl:
        "https://developers.google.com/identity/openid-connect/openid-connect",
      evidence: [
        "Authorization-code flow, state/PKCE validation, token exchange and ID-token verification are implemented.",
      ],
      blockers: [
        "Production readiness requires configured redirect URI and a successful sandbox/production smoke test.",
      ],
    },
    {
      id: "apple_id",
      displayName: "Sign in with Apple",
      kind: "EXTERNAL",
      category: "AUTHENTICATION",
      capabilities: ["auth.oauth_apple"],
      implementedCapabilities: ["auth.oauth_apple"],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P1",
      runtimeOwner: "backend/src/modules/auth/oauth-provider.client.ts",
      requiredEnvironmentVariables: [
        "APPLE_SERVICE_ID",
        "APPLE_TEAM_ID",
        "APPLE_KEY_ID",
        "APPLE_PRIVATE_KEY",
        "APPLE_OAUTH_CALLBACK_URL",
      ],
      healthCheckKind: "CONFIGURATION_ONLY",
      webhookSupport: "REQUIRED_MISSING",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      documentationUrl:
        "https://developer.apple.com/documentation/signinwithapplerestapi",
      evidence: [
        "Authorization-code exchange and signed identity-token verification are implemented.",
      ],
      blockers: [
        "Account-change server notifications are not implemented; production smoke evidence is missing.",
      ],
    },
    {
      id: "facebook_identity",
      displayName: "Facebook Login",
      kind: "EXTERNAL",
      category: "AUTHENTICATION",
      capabilities: ["auth.oauth_facebook"],
      implementedCapabilities: ["auth.oauth_facebook"],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P2",
      runtimeOwner: "backend/src/modules/auth/oauth-provider.client.ts",
      requiredEnvironmentVariables: [
        "FACEBOOK_APP_ID",
        "FACEBOOK_APP_SECRET",
        "FACEBOOK_OAUTH_CALLBACK_URL",
        "FACEBOOK_GRAPH_API_BASE_URL",
      ],
      healthCheckKind: "CONFIGURATION_ONLY",
      webhookSupport: "IMPLEMENTED",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      documentationUrl: "https://developers.facebook.com/docs/facebook-login/",
      evidence: [
        "Authorization-code exchange, profile lookup and signed data-deletion callback are implemented.",
      ],
      blockers: [
        "Production app-review and smoke-test evidence are environment-specific and not present in code.",
      ],
    },
    implementedGateway(
      "resend",
      "Resend",
      "EMAIL",
      ["email.transactional", "email.marketing"],
      "P0",
      "https://resend.com/docs",
    ),
    implementedGateway(
      "brevo",
      "Brevo",
      "EMAIL",
      ["email.transactional", "email.marketing"],
      "P2",
      "https://developers.brevo.com/",
    ),
    planned(
      "gmail",
      "Gmail / Google Workspace",
      "MAILBOX",
      ["mailbox.send", "mailbox.read", "mailbox.thread_sync"],
      "P1",
      "backend/src/integrations/providers/gateways",
      "https://developers.google.com/gmail/api",
    ),
    planned(
      "microsoft_365_mail",
      "Microsoft 365 / Outlook",
      "MAILBOX",
      [
        "mailbox.send",
        "mailbox.read",
        "mailbox.thread_sync",
        "calendar.events",
      ],
      "P1",
      "backend/src/integrations/providers/gateways",
      "https://learn.microsoft.com/graph/api/resources/mail-api-overview",
    ),
    planned(
      "smtp",
      "SMTP",
      "EMAIL",
      ["email.transactional", "email.marketing", "email.crm_send"],
      "P1",
      "backend/src/integrations/providers/gateways",
    ),
    implementedGateway(
      "mailjet",
      "Mailjet",
      "EMAIL",
      ["email.transactional", "email.marketing", "email.crm_send"],
      "P2",
    ),
    implementedGateway(
      "sendgrid",
      "SendGrid",
      "EMAIL",
      ["email.transactional", "email.marketing", "email.crm_send"],
      "P2",
    ),
    planned(
      "amazon_ses",
      "Amazon SES",
      "EMAIL",
      ["email.transactional", "email.marketing", "email.crm_send"],
      "P2",
      "backend/src/integrations/providers/gateways",
    ),
    implementedGateway(
      "mailgun",
      "Mailgun",
      "EMAIL",
      ["email.transactional", "email.marketing", "email.crm_send"],
      "P2",
    ),
    implementedGateway(
      "postmark",
      "Postmark",
      "EMAIL",
      ["email.transactional", "email.marketing", "email.crm_send"],
      "P2",
    ),
    planned(
      "twilio",
      "Twilio",
      "SMS",
      ["sms.otp", "sms.transactional"],
      "P1",
      "backend/src/integrations/sms",
      "https://www.twilio.com/docs",
    ),
    {
      ...planned(
        "google_gemini",
        "Google Gemini",
        "AI",
        ["ai.safety_audit"],
        "P2",
        "backend/src/integrations/providers/ai.provider.ts",
        "https://ai.google.dev/gemini-api/docs",
      ),
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      implementedCapabilities: ["ai.safety_audit"],
      demoOnlyCapabilities: [
        "ai.listing_assistance",
        "ai.prospect_research",
        "ai.company_enrichment",
      ],
      requiredEnvironmentVariables: ["GEMINI_API_KEY"],
      optionalEnvironmentVariables: ["GEMINI_MODEL"],
      healthCheckKind: "CONFIGURATION_ONLY",
      evidence: [
        "Gemini Interactions adapter requests and validates a bounded JSON-schema moderation result.",
      ],
      blockers: [],
    },
    implementedGateway(
      "openai",
      "OpenAI",
      "AI",
      [
        "ai.listing_assistance",
        "ai.safety_audit",
        "ai.prospect_research",
        "ai.marketing_drafting",
      ],
      "P3",
      "https://platform.openai.com/docs",
    ),
    implementedGateway(
      "anthropic",
      "Anthropic Claude",
      "AI",
      [
        "ai.crm_drafting",
        "ai.crm_summary",
        "ai.crm_enrichment",
        "ai.marketing_drafting",
      ],
      "P2",
      "https://docs.anthropic.com/",
    ),
    implementedGateway(
      "openai_compatible",
      "OpenAI-compatible endpoint",
      "AI",
      [
        "ai.crm_drafting",
        "ai.crm_summary",
        "ai.crm_enrichment",
        "ai.marketing_drafting",
      ],
      "P2",
    ),
    planned(
      "tavily",
      "Tavily",
      "SEARCH",
      ["search.public_web"],
      "P3",
      "backend/src/integrations/search",
      "https://docs.tavily.com/",
    ),
    {
      ...planned(
        "meilisearch",
        "Meilisearch",
        "SEARCH",
        ["search.marketplace"],
        "P3",
        "backend/src/integrations/search",
        "https://www.meilisearch.com/docs",
      ),
      lifecycle: "NOT_NEEDED",
      blockers: [],
      evidence: [
        "Marketplace search is currently owned by the implemented PostgreSQL search provider; no second engine is required yet.",
      ],
    },
    {
      id: "osm_nominatim",
      displayName: "OpenStreetMap tiles / BAN",
      kind: "EXTERNAL",
      category: "GEOCODING",
      capabilities: [
        "maps.display",
        "maps.geocode",
        "maps.reverse_geocode",
        "maps.autocomplete",
      ],
      implementedCapabilities: ["maps.display"],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTING",
      criticality: "P1",
      runtimeOwner: "frontend/src/features/search/ExploreMapView.tsx",
      requiredEnvironmentVariables: [],
      healthCheckKind: "NONE",
      webhookSupport: "NONE",
      supportedMarkets: ["FR", "BE", "LU", "ES", "DE", "CH"],
      supportedCurrencies: [],
      documentationUrl: "https://adresse.data.gouv.fr/api-doc/adresse",
      evidence: [
        "Leaflet map rendering uses external OpenStreetMap/Carto tile endpoints.",
      ],
      blockers: [
        "No backend geocoding/autocomplete adapter, provider policy enforcement, caching or health evidence.",
      ],
    },
    {
      ...planned(
        "insee_sirene",
        "French business registry",
        "BUSINESS_VERIFICATION",
        ["verification.business"],
        "P0",
        "backend/src/integrations/providers/business-registry.provider.ts",
        "https://www.sirene.fr/static-resources/htm/v_sommaire_311.htm",
      ),
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      implementedCapabilities: ["verification.business"],
      requiredEnvironmentVariables: [
        "BUSINESS_REGISTRY_API_URL",
        "BUSINESS_REGISTRY_API_TOKEN",
      ],
      healthCheckKind: "CONFIGURATION_ONLY",
      evidence: [
        "Authenticated SIRENE lookup validates SIRET input and maps only bounded legal-unit fields.",
      ],
      blockers: [],
    },
    {
      ...planned(
        "stripe_identity",
        "Stripe Identity",
        "IDENTITY_VERIFICATION",
        ["verification.identity"],
        "P0",
        "backend/src/integrations/providers/kyc.provider.ts",
        "https://docs.stripe.com/identity",
      ),
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      implementedCapabilities: ["verification.identity"],
      requiredEnvironmentVariables: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
      ],
      healthCheckKind: "CONFIGURATION_ONLY",
      webhookSupport: "IMPLEMENTED",
      evidence: [
        "Hosted Stripe Identity sessions and signed, idempotent verification-session webhooks are implemented.",
      ],
      blockers: [],
    },
    {
      ...planned(
        "cloudflare_r2",
        "Cloudflare R2",
        "STORAGE",
        [
          "storage.media",
          "storage.document",
          "cdn.delivery",
          "image.optimization",
        ],
        "P3",
        "backend/src/infrastructure/storage",
      ),
      lifecycle: "NOT_NEEDED",
      blockers: [],
      evidence: [
        "Supabase Storage already owns public media and private signed documents; R2 is not currently required.",
      ],
    },
    planned(
      "plausible",
      "Plausible",
      "ANALYTICS",
      ["analytics.product"],
      "P3",
      "frontend/src/domains/consent",
    ),
    planned(
      "sentry",
      "Sentry",
      "ERROR_MONITORING",
      ["monitoring.error_tracking"],
      "P1",
      "backend/src/infrastructure/logging",
    ),
    planned(
      "cloudflare_turnstile",
      "Cloudflare Turnstile",
      "CAPTCHA",
      ["security.captcha"],
      "P1",
      "backend/src/modules/auth",
    ),
    planned(
      "pennylane",
      "Pennylane",
      "INVOICING",
      ["invoicing.electronic"],
      "P2",
      "backend/src/modules/finance",
    ),
    {
      id: "shongre_auth",
      displayName: "Shongre Auth & Sessions",
      kind: "INTERNAL",
      category: "AUTHENTICATION",
      capabilities: [
        "auth.email_password",
        "auth.email_verification",
        "auth.password_reset",
        "auth.session",
      ],
      implementedCapabilities: [
        "auth.email_password",
        "auth.email_verification",
        "auth.password_reset",
        "auth.session",
      ],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P0",
      runtimeOwner: "backend/src/modules/auth",
      requiredEnvironmentVariables: [],
      healthCheckKind: "INTERNAL_PROBE",
      webhookSupport: "NONE",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      evidence: [
        "Password hashing, sessions, verification and recovery services are implemented behind backend APIs.",
      ],
      blockers: [
        "Transactional delivery still requires a configured email delivery boundary.",
      ],
    },
    {
      id: "configured_email_delivery",
      displayName: "Configured transactional email endpoint",
      kind: "EXTERNAL",
      category: "EMAIL",
      capabilities: ["email.transactional"],
      implementedCapabilities: ["email.transactional"],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P0",
      runtimeOwner: "backend/src/integrations/auth-email-sender.ts",
      requiredEnvironmentVariables: [
        "AUTH_EMAIL_DELIVERY_URL",
        "AUTH_EMAIL_DELIVERY_TOKEN",
      ],
      healthCheckKind: "CONFIGURATION_ONLY",
      webhookSupport: "REQUIRED_MISSING",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      evidence: [
        "A vendor-neutral authenticated HTTP delivery adapter is implemented.",
      ],
      blockers: [
        "No delivery/bounce webhook, provider identity or authenticated live probe is implemented.",
      ],
    },
    {
      id: "postgres_search",
      displayName: "PostgreSQL marketplace search",
      kind: "INTERNAL",
      category: "SEARCH",
      capabilities: ["search.marketplace"],
      implementedCapabilities: ["search.marketplace"],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P0",
      runtimeOwner: "backend/src/infrastructure/search",
      requiredEnvironmentVariables: [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
      healthCheckKind: "INTERNAL_PROBE",
      webhookSupport: "NONE",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      documentationUrl:
        "https://supabase.com/docs/guides/database/full-text-search",
      evidence: [
        "Backend search provider uses PostgreSQL/Supabase and scalable paginated contracts.",
      ],
      blockers: [
        "Production health depends on database connectivity and deployed indexes.",
      ],
    },
    {
      id: "supabase_storage",
      displayName: "Supabase Storage",
      kind: "EXTERNAL",
      category: "STORAGE",
      capabilities: ["storage.media", "storage.document", "cdn.delivery"],
      implementedCapabilities: [
        "storage.media",
        "storage.document",
        "cdn.delivery",
      ],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P0",
      runtimeOwner: "backend/src/infrastructure/storage",
      requiredEnvironmentVariables: [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
      healthCheckKind: "INTERNAL_PROBE",
      webhookSupport: "NONE",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      documentationUrl: "https://supabase.com/docs/guides/storage",
      evidence: [
        "Public listing-media uploads and private document signed URLs use centralized server-side storage adapters.",
      ],
      blockers: [
        "Production health depends on bucket configuration and RLS/deployment evidence.",
      ],
    },
    {
      id: "in_app_notifications",
      displayName: "Shongre in-app notifications",
      kind: "INTERNAL",
      category: "PUSH",
      capabilities: ["notification.in_app"],
      implementedCapabilities: ["notification.in_app"],
      adapterStatus: "IMPLEMENTED",
      lifecycle: "IMPLEMENTED",
      criticality: "P1",
      runtimeOwner: "backend/src/modules/notifications",
      requiredEnvironmentVariables: [],
      healthCheckKind: "INTERNAL_PROBE",
      webhookSupport: "NONE",
      supportedMarkets: ["*"],
      supportedCurrencies: [],
      evidence: [
        "Persisted notification centre and realtime abstraction are implemented.",
      ],
      blockers: ["Mobile/web push delivery provider is not implemented."],
    },
  ] as const;

export const SHONGRE_CAPABILITY_REQUIREMENTS: readonly ProviderCapabilityRequirement[] =
  [
    {
      domain: "Authentication",
      capability: "auth.email_password",
      label: "Email/password sign-in",
      requirement: "REQUIRED",
      criticality: "P0",
      markets: ["*"],
      primaryProviderId: "shongre_auth",
      gracefulDegradation:
        "Existing sessions continue; new sign-ins fail closed.",
    },
    {
      domain: "Authentication",
      capability: "auth.oauth_google",
      label: "Google login",
      requirement: "RECOMMENDED",
      criticality: "P1",
      markets: ["*"],
      primaryProviderId: "google_identity",
      fallbackProviderId: "shongre_auth",
      gracefulDegradation: "Offer email/password sign-in.",
    },
    {
      domain: "Authentication",
      capability: "auth.oauth_apple",
      label: "Apple login",
      requirement: "CONTEXTUAL",
      criticality: "P1",
      markets: ["*"],
      primaryProviderId: "apple_id",
      fallbackProviderId: "shongre_auth",
      gracefulDegradation: "Offer email/password sign-in.",
    },
    {
      domain: "Authentication",
      capability: "auth.oauth_facebook",
      label: "Facebook login",
      requirement: "OPTIONAL",
      criticality: "P2",
      markets: ["*"],
      primaryProviderId: "facebook_identity",
      fallbackProviderId: "shongre_auth",
      gracefulDegradation: "Offer email/password sign-in.",
    },
    {
      domain: "Communications",
      capability: "email.transactional",
      label: "Transactional email",
      requirement: "REQUIRED",
      criticality: "P0",
      markets: ["*"],
      primaryProviderId: "configured_email_delivery",
      gracefulDegradation:
        "Keep in-app state, surface delivery delay and retry asynchronously.",
    },
    {
      domain: "Communications",
      capability: "sms.otp",
      label: "Phone OTP",
      requirement: "CONTEXTUAL",
      criticality: "P1",
      markets: ["*"],
      primaryProviderId: "twilio",
      gracefulDegradation:
        "Do not claim phone verification; allow non-risk actions only.",
    },
    {
      domain: "Payments",
      capability: "payment.card",
      label: "Card checkout",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["FR", "BE", "LU", "ES", "DE", "CH"],
      primaryProviderId: "stripe",
      gracefulDegradation:
        "Disable paid checkout and preserve cart/order draft.",
    },
    {
      domain: "Payments",
      capability: "payment.marketplace",
      label: "Marketplace fund flow",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["FR", "BE", "LU", "ES", "DE", "CH"],
      primaryProviderId: "stripe",
      fallbackProviderId: "mangopay",
      gracefulDegradation:
        "Disable protected marketplace transactions; never simulate provider confirmation.",
    },
    {
      domain: "Payments",
      capability: "payout.transfer",
      label: "Seller payouts",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["FR", "BE", "LU", "ES", "DE", "CH"],
      primaryProviderId: "stripe",
      fallbackProviderId: "mangopay",
      gracefulDegradation:
        "Queue no payout; surface action required to finance operators.",
    },
    {
      domain: "Identity",
      capability: "verification.identity",
      label: "Individual KYC",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["*"],
      primaryProviderId: "stripe_identity",
      gracefulDegradation:
        "Block only the regulated action and preserve the journey.",
    },
    {
      domain: "Business",
      capability: "verification.business",
      label: "French business verification",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["FR"],
      primaryProviderId: "insee_sirene",
      gracefulDegradation:
        "Route to manual KYB review with explicit pending status.",
    },
    {
      domain: "Shipping",
      capability: "delivery.relay_point",
      label: "Relay delivery",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["FR", "BE", "LU"],
      primaryProviderId: "mondial_relay",
      gracefulDegradation:
        "Hide relay quotes; retain pickup or other verified methods.",
    },
    {
      domain: "Shipping",
      capability: "delivery.home_delivery",
      label: "Home delivery",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["FR"],
      primaryProviderId: "colissimo",
      fallbackProviderId: "chronopost",
      gracefulDegradation:
        "Hide unverified carrier quotes; retain local pickup.",
    },
    {
      domain: "Search",
      capability: "search.marketplace",
      label: "Marketplace search",
      requirement: "REQUIRED",
      criticality: "P0",
      markets: ["*"],
      primaryProviderId: "postgres_search",
      gracefulDegradation:
        "Show retry/known categories; never silently query a second unconfigured engine.",
    },
    {
      domain: "Storage",
      capability: "storage.media",
      label: "Listing media",
      requirement: "REQUIRED",
      criticality: "P0",
      markets: ["*"],
      primaryProviderId: "supabase_storage",
      gracefulDegradation: "Preserve draft metadata and pause uploads.",
    },
    {
      domain: "Storage",
      capability: "storage.document",
      label: "Private verification documents",
      requirement: "CONTEXTUAL",
      criticality: "P0",
      markets: ["*"],
      primaryProviderId: "supabase_storage",
      gracefulDegradation:
        "Pause document collection; never use public storage.",
    },
    {
      domain: "Maps",
      capability: "maps.display",
      label: "Map display",
      requirement: "RECOMMENDED",
      criticality: "P2",
      markets: ["*"],
      primaryProviderId: "osm_nominatim",
      gracefulDegradation: "Show text location and search list.",
    },
    {
      domain: "Maps",
      capability: "maps.geocode",
      label: "Address geocoding",
      requirement: "RECOMMENDED",
      criticality: "P1",
      markets: ["FR"],
      primaryProviderId: "osm_nominatim",
      gracefulDegradation:
        "Allow structured manual address entry without precise map placement.",
    },
    {
      domain: "AI",
      capability: "ai.safety_audit",
      label: "Listing safety audit",
      requirement: "OPTIONAL",
      criticality: "P2",
      markets: ["*"],
      primaryProviderId: "google_gemini",
      fallbackProviderId: "openai",
      gracefulDegradation:
        "Queue the listing for manual review without exposing provider detail.",
    },
    {
      domain: "Trust",
      capability: "security.captcha",
      label: "Bot protection",
      requirement: "RECOMMENDED",
      criticality: "P1",
      markets: ["*"],
      primaryProviderId: "cloudflare_turnstile",
      gracefulDegradation:
        "Use rate limits and risk-based step-up; fail closed for abusive traffic.",
    },
    {
      domain: "Observability",
      capability: "monitoring.error_tracking",
      label: "Error tracking",
      requirement: "RECOMMENDED",
      criticality: "P1",
      markets: ["*"],
      primaryProviderId: "sentry",
      gracefulDegradation:
        "Structured server logs remain the minimum fallback.",
    },
    {
      domain: "Notifications",
      capability: "notification.in_app",
      label: "In-app notifications",
      requirement: "REQUIRED",
      criticality: "P1",
      markets: ["*"],
      primaryProviderId: "in_app_notifications",
      gracefulDegradation:
        "Persist notifications and refresh on next client request.",
    },
  ] as const;

export function getProviderOperationalDefinition(
  providerId: string,
): ProviderOperationalDefinition | undefined {
  return SHONGRE_PROVIDER_REGISTRY.find(
    (provider) => provider.id === providerId,
  );
}

export function evaluateProviderReadiness(
  definition: ProviderOperationalDefinition,
  evidence: ProviderRuntimeEvidence,
): ProviderReadiness {
  const blockers = [...definition.blockers];
  const hasImplementedAdapter = definition.adapterStatus === "IMPLEMENTED";
  const hasAllCapabilities = definition.capabilities.every((capability) =>
    definition.implementedCapabilities.includes(capability),
  );
  const hasVerifiedHealth =
    evidence.health === "HEALTHY" &&
    (evidence.healthEvidence === "LIVE_PROBE" ||
      evidence.healthEvidence === "RUNTIME_SIGNAL");

  if (!hasImplementedAdapter)
    blockers.push("No production adapter is implemented.");
  if (!hasAllCapabilities)
    blockers.push(
      "One or more advertised capabilities have no implemented adapter method.",
    );
  if (!evidence.configured)
    blockers.push("Runtime credentials/configuration are incomplete.");
  if (!evidence.enabled)
    blockers.push("Provider is disabled in this environment.");
  if (!hasVerifiedHealth)
    blockers.push(
      "No current live health evidence proves the provider is healthy.",
    );
  if (evidence.environment === "demo")
    blockers.push("Demo evidence cannot establish production readiness.");

  const uniqueBlockers = [...new Set(blockers)];
  const checks = [
    hasImplementedAdapter,
    hasAllCapabilities,
    evidence.configured,
    evidence.enabled,
    hasVerifiedHealth,
    evidence.environment !== "demo",
  ];
  const score = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  const productionReady = score === 100 && uniqueBlockers.length === 0;

  return {
    score,
    productionReady,
    active: productionReady && evidence.health === "HEALTHY",
    blockers: uniqueBlockers,
  };
}

function supportsMarket(
  definition: ProviderOperationalDefinition,
  marketCode: string,
): boolean {
  return (
    definition.supportedMarkets.includes("*") ||
    definition.supportedMarkets.includes(marketCode)
  );
}

/**
 * Strict runtime routing. A fallback is never inferred from priority alone and
 * demo/configuration evidence can never trigger a production route.
 */
export function resolveProviderRoute(params: {
  policy: ProviderRoutingPolicy;
  entries: readonly ProviderControlPlaneEntry[];
  nowMs?: number;
  maxEvidenceAgeMs?: number;
}): ProviderRouteResolution {
  const {
    policy,
    entries,
    nowMs = Date.now(),
    maxEvidenceAgeMs = 5 * 60_000,
  } = params;
  const byId = new Map(entries.map((entry) => [entry.definition.id, entry]));
  const reasons: string[] = [];

  const eligible = (providerId: string | undefined, role: string) => {
    if (!providerId) return false;
    const entry = byId.get(providerId);
    if (!entry) {
      reasons.push(`${role} provider is absent from the canonical registry.`);
      return false;
    }
    const { definition, runtime } = entry;
    if (!definition.implementedCapabilities.includes(policy.capability)) {
      reasons.push(`${role} provider does not implement ${policy.capability}.`);
      return false;
    }
    if (!supportsMarket(definition, policy.marketCode)) {
      reasons.push(`${role} provider does not support ${policy.marketCode}.`);
      return false;
    }
    if (!runtime.enabled || !runtime.configured) {
      reasons.push(`${role} provider is disabled or unconfigured.`);
      return false;
    }
    if (runtime.environment === "demo") {
      reasons.push(`${role} provider has demo evidence only.`);
      return false;
    }
    if (
      runtime.health !== "HEALTHY" ||
      !["LIVE_PROBE", "RUNTIME_SIGNAL"].includes(runtime.healthEvidence)
    ) {
      reasons.push(
        `${role} provider has no verified healthy runtime evidence.`,
      );
      return false;
    }
    const checkedAt = runtime.lastCheckedAt
      ? Date.parse(runtime.lastCheckedAt)
      : Number.NaN;
    if (!Number.isFinite(checkedAt) || nowMs - checkedAt > maxEvidenceAgeMs) {
      reasons.push(`${role} provider health evidence is missing or stale.`);
      return false;
    }
    return true;
  };

  const primaryReady = eligible(policy.primaryProviderId, "Primary");
  const fallbackReady = eligible(policy.fallbackProviderId, "Fallback");
  if (primaryReady) {
    return {
      ...policy,
      selectedProviderId: policy.primaryProviderId,
      fallbackReady,
      isFallbackActive: false,
      status: "OPERATIONAL",
      reasons,
    };
  }
  if (policy.automaticFailover && policy.fallbackProviderId && fallbackReady) {
    return {
      ...policy,
      selectedProviderId: policy.fallbackProviderId,
      fallbackReady: true,
      isFallbackActive: true,
      status: "DEGRADED",
      reasons,
    };
  }
  if (fallbackReady && !policy.automaticFailover) {
    reasons.push("Fallback is healthy but automatic failover is not approved.");
  }
  return {
    ...policy,
    selectedProviderId: null,
    fallbackReady,
    isFallbackActive: false,
    status: "UNAVAILABLE",
    reasons,
  };
}
