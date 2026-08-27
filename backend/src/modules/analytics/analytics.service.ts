import {
  ANALYTICS_SCHEMA_VERSION,
  analyticsDashboardQuerySchema,
  analyticsEventBatchSchema,
  analyticsEventEnvelopeSchema,
  type AnalyticsDashboardQuery,
  type AnalyticsEventEnvelope,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
  type AnalyticsProviderHealth,
} from "@shongre/contracts/analytics";
import { getCountryConfig } from "@shongre/contracts";
import { config } from "../../app/config/index.js";
import type { Principal } from "../../shared/auth/principal.js";
import { isAuthenticated } from "../../shared/auth/principal.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  DemoAnalyticsRepository,
  PostgresAnalyticsRepository,
  type AnalyticsRepository,
} from "./analytics.repository.js";
import { sanitizeServerAnalyticsProperties } from "./analytics.privacy.js";
import { AnalyticsProviderDispatcher } from "./analytics.providers.js";
import { authRepository } from "../../infrastructure/database/repositories/auth.repository.js";

export interface AnalyticsIngestionMetadata {
  requestId: string;
  marketCode: string;
  userAgent?: string;
  rateLimitKey: string;
}

export class AnalyticsService {
  private readonly repository: AnalyticsRepository;
  private readonly dispatcher: AnalyticsProviderDispatcher;

  constructor(repository?: AnalyticsRepository) {
    this.repository =
      repository ??
      (config.dataMode === "database"
        ? new PostgresAnalyticsRepository()
        : new DemoAnalyticsRepository());
    this.dispatcher = new AnalyticsProviderDispatcher(this.repository);
  }

  async ingest(
    raw: unknown,
    principal: Principal,
    metadata: AnalyticsIngestionMetadata,
  ): Promise<{ accepted: number }> {
    if (config.analyticsMode === "off") return { accepted: 0 };
    const limit = await authRepository.consumeRateLimit(
      metadata.rateLimitKey,
      "analytics_ingestion",
      120,
      60,
      60,
    );
    if (!limit.allowed) {
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Trop d’événements ont été envoyés. Réessayez plus tard.",
        details: { retryAfterSeconds: limit.retryAfterSeconds },
      });
    }
    const batch = analyticsEventBatchSchema.parse(raw);
    const events = batch.events.map((event) =>
      this.normalizeClientEvent(
        event as AnalyticsEventEnvelope,
        principal,
        metadata,
      ),
    );
    await this.repository.append(events);
    // Browser SDKs deliver their own vendor copy. Relaying the same browser
    // envelope here would double-count; only the internal ledger is written.
    return { accepted: events.length };
  }

  async captureAuthoritative<Name extends AnalyticsEventName>(input: {
    name: Name;
    marketCode: string;
    /** Stable workflow identifier; reuse it when a command/webhook is retried. */
    eventId?: string;
    properties?: AnalyticsEventProperties<Name>;
    userId?: string;
    userType?: string;
    requestId?: string;
  }): Promise<void> {
    if (config.analyticsMode === "off") return;
    const market = getCountryConfig(input.marketCode.toUpperCase());
    if (!market)
      throw new Error("Unknown market for authoritative analytics event.");
    const event = analyticsEventEnvelopeSchema.parse({
      name: input.name,
      context: {
        eventId: input.eventId ?? `evt_${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        environment: config.environment.environment,
        platform: "backend",
        countryCode: market.code,
        marketCode: market.code,
        locale: market.defaultLocale,
        currency: market.currency,
        timezone: market.timezone,
        canonicalDomain: market.canonicalDomainMode,
        userId: input.userId,
        userType: input.userType,
        requestId: input.requestId,
        release: config.release,
        isTestTraffic: config.analyticsMode !== "production",
      },
      properties: sanitizeServerAnalyticsProperties(
        (input.properties ?? {}) as Record<string, unknown>,
      ),
    }) as AnalyticsEventEnvelope;
    await this.repository.append([event]);
    await this.repository.enqueueDeliveries(
      event.context.eventId,
      this.dispatcher.enabledProviders(),
    );
    // Claim through the persisted queue even for the eager attempt. Its unique
    // delivery key and SKIP LOCKED lease prevent webhook/command retries from
    // dispatching the same authoritative event twice to a provider.
    void this.dispatcher.retryPending(10).catch(() => undefined);
  }

  parseQuery(query: URLSearchParams): AnalyticsDashboardQuery {
    return analyticsDashboardQuerySchema.parse({
      range: query.get("range") ?? undefined,
      from: query.get("from") ?? undefined,
      to: query.get("to") ?? undefined,
      marketCode: query.get("marketCode")?.toUpperCase() ?? undefined,
      categoryId: query.get("categoryId") ?? undefined,
      sellerType: query.get("sellerType") ?? undefined,
      source: query.get("source") ?? undefined,
      campaign: query.get("campaign") ?? undefined,
    });
  }

  overview(query: AnalyticsDashboardQuery) {
    return this.repository.overview(query);
  }
  acquisition(query: AnalyticsDashboardQuery) {
    return this.repository.acquisition(query);
  }
  search(query: AnalyticsDashboardQuery) {
    return this.repository.search(query);
  }
  monetization(query: AnalyticsDashboardQuery) {
    return this.repository.monetization(query);
  }
  seo(query: AnalyticsDashboardQuery) {
    return this.repository.seo(query);
  }
  seller(sellerId: string, query: AnalyticsDashboardQuery) {
    return this.repository.seller(sellerId, query);
  }

  async providerHealth(): Promise<AnalyticsProviderHealth[]> {
    const persisted = await this.repository.providerHealth();
    const byProvider = new Map(
      persisted.map((health) => [health.provider, health]),
    );
    const configured: Array<{
      provider: AnalyticsProviderHealth["provider"];
      enabled: boolean;
      configured: boolean;
    }> = [
      {
        provider: "internal",
        enabled: config.analyticsMode !== "off",
        configured: config.dataMode === "database",
      },
      {
        provider: "posthog",
        enabled: config.analyticsProviders.posthog.enabled,
        configured: Boolean(config.analyticsProviders.posthog.key),
      },
      {
        provider: "ga4",
        enabled: config.analyticsProviders.ga4.enabled,
        configured: Boolean(
          config.analyticsProviders.ga4.measurementId &&
          config.analyticsProviders.ga4.apiSecret,
        ),
      },
      {
        provider: "matomo",
        enabled: config.analyticsProviders.matomo.enabled,
        configured: Boolean(
          config.analyticsProviders.matomo.url &&
          config.analyticsProviders.matomo.siteId &&
          config.analyticsProviders.matomo.token,
        ),
      },
      {
        provider: "cloudflare",
        enabled: config.analyticsProviders.cloudflare.enabled,
        configured: Boolean(config.analyticsProviders.cloudflare.siteTag),
      },
      {
        provider: "search_console",
        enabled: config.analyticsProviders.searchConsole.enabled,
        configured: Boolean(
          config.analyticsProviders.searchConsole.serviceAccountJson &&
          config.analyticsProviders.searchConsole.siteUrls.length,
        ),
      },
      {
        provider: "sentry",
        enabled: config.analyticsProviders.sentry.enabled,
        configured: Boolean(config.analyticsProviders.sentry.dsn),
      },
    ];
    return configured.map(
      (item) =>
        byProvider.get(item.provider) ?? {
          provider: item.provider,
          enabled: item.enabled,
          status: !item.enabled
            ? "disabled"
            : item.configured
              ? "connected"
              : "misconfigured",
          failedEvents: 0,
          queueBacklog: 0,
          message: !item.enabled
            ? "Désactivé par configuration."
            : item.configured
              ? "Configuration présente."
              : "Configuration incomplète.",
        },
    );
  }

  refreshAggregates() {
    return this.repository.refresh();
  }
  applyRetention() {
    return this.repository.applyRetention();
  }
  retryProviderDeliveries() {
    return this.dispatcher.retryPending();
  }
  anonymizeSubject(userId: string) {
    return this.repository.anonymizeUser(userId);
  }

  private normalizeClientEvent(
    event: AnalyticsEventEnvelope,
    principal: Principal,
    metadata: AnalyticsIngestionMetadata,
  ): AnalyticsEventEnvelope {
    if (event.context.platform === "backend") {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Plateforme d'événement invalide.",
      });
    }
    const market = getCountryConfig(metadata.marketCode);
    if (
      !market ||
      event.context.marketCode !== market.code ||
      event.context.countryCode !== market.code
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Le marché de l'événement ne correspond pas à la requête.",
      });
    }
    if (!market.supportedCurrencies.includes(event.context.currency)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Devise d'événement invalide pour ce marché.",
      });
    }
    const occurredAt = new Date(event.context.timestamp).getTime();
    const now = Date.now();
    if (occurredAt > now + 10 * 60_000 || occurredAt < now - 7 * 86_400_000) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Horodatage d'événement hors fenêtre.",
      });
    }
    const userAgent = metadata.userAgent ?? "";
    const isBot = /bot|crawler|spider|headless|lighthouse/i.test(userAgent);
    return analyticsEventEnvelopeSchema.parse({
      name: event.name,
      context: {
        ...event.context,
        environment: config.environment.environment,
        countryCode: market.code,
        marketCode: market.code,
        locale: market.supportedLocales.includes(event.context.locale)
          ? event.context.locale
          : market.defaultLocale,
        canonicalDomain: market.canonicalDomainMode,
        userId: isAuthenticated(principal) ? principal.userId : undefined,
        userType: isAuthenticated(principal)
          ? principal.accountType
          : undefined,
        requestId: metadata.requestId,
        deviceType: isBot ? "bot" : event.context.deviceType,
        release: config.release,
        isTestTraffic:
          config.analyticsMode !== "production" ||
          event.context.isTestTraffic === true,
      },
      properties: sanitizeServerAnalyticsProperties(event.properties),
    }) as AnalyticsEventEnvelope;
  }
}

export const analyticsService = new AnalyticsService();
