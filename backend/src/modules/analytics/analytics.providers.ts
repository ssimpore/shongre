import { PostHog } from "posthog-node";
import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import { config } from "../../app/config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import type { AnalyticsRepository } from "./analytics.repository.js";

interface ServerAnalyticsProvider {
  readonly id: "posthog" | "ga4" | "matomo";
  readonly enabled: boolean;
  capture(event: AnalyticsEventEnvelope): Promise<void>;
}

class PostHogServerProvider implements ServerAnalyticsProvider {
  readonly id = "posthog" as const;
  readonly enabled =
    config.analyticsMode !== "off" &&
    config.analyticsProviders.posthog.enabled &&
    Boolean(config.analyticsProviders.posthog.key);
  private client: PostHog | null = null;
  async capture(event: AnalyticsEventEnvelope): Promise<void> {
    if (!this.enabled) return;
    this.client ??= new PostHog(config.analyticsProviders.posthog.key, {
      host: config.analyticsProviders.posthog.host,
      flushAt: 20,
      flushInterval: 10_000,
    });
    this.client.capture({
      distinctId:
        event.context.userId ||
        event.context.anonymousId ||
        event.context.sessionId ||
        event.context.eventId,
      event: event.name,
      properties: { ...event.properties, ...event.context },
    });
  }
}

class Ga4ServerProvider implements ServerAnalyticsProvider {
  readonly id = "ga4" as const;
  readonly enabled =
    config.analyticsMode !== "off" &&
    config.analyticsProviders.ga4.enabled &&
    Boolean(
      config.analyticsProviders.ga4.measurementId &&
      config.analyticsProviders.ga4.apiSecret,
    );
  async capture(event: AnalyticsEventEnvelope): Promise<void> {
    if (!this.enabled) return;
    const endpoint = new URL("https://www.google-analytics.com/mp/collect");
    endpoint.searchParams.set(
      "measurement_id",
      config.analyticsProviders.ga4.measurementId,
    );
    endpoint.searchParams.set(
      "api_secret",
      config.analyticsProviders.ga4.apiSecret,
    );
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id:
          event.context.anonymousId ||
          event.context.sessionId ||
          event.context.eventId,
        user_id: event.context.userId,
        timestamp_micros: String(
          new Date(event.context.timestamp).getTime() * 1_000,
        ),
        non_personalized_ads: true,
        events: [
          {
            name: event.name,
            params: {
              ...event.properties,
              market_code: event.context.marketCode,
              country_code: event.context.countryCode,
              currency: event.context.currency,
            },
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`ga4_http_${response.status}`);
  }
}

class MatomoServerProvider implements ServerAnalyticsProvider {
  readonly id = "matomo" as const;
  readonly enabled =
    config.analyticsMode !== "off" &&
    config.analyticsProviders.matomo.enabled &&
    Boolean(
      config.analyticsProviders.matomo.url &&
      config.analyticsProviders.matomo.siteId &&
      config.analyticsProviders.matomo.token,
    );
  async capture(event: AnalyticsEventEnvelope): Promise<void> {
    if (!this.enabled) return;
    const endpoint = new URL(
      "matomo.php",
      `${config.analyticsProviders.matomo.url.replace(/\/+$/, "")}/`,
    );
    const subject =
      event.context.userId ||
      event.context.anonymousId ||
      event.context.sessionId;
    endpoint.searchParams.set(
      "idsite",
      config.analyticsProviders.matomo.siteId,
    );
    endpoint.searchParams.set("rec", "1");
    endpoint.searchParams.set("apiv", "1");
    endpoint.searchParams.set("e_c", "Shongre");
    endpoint.searchParams.set("e_a", event.name);
    endpoint.searchParams.set("e_n", event.context.marketCode);
    endpoint.searchParams.set(
      "token_auth",
      config.analyticsProviders.matomo.token,
    );
    if (subject) endpoint.searchParams.set("uid", subject);
    const response = await fetch(endpoint, { method: "POST" });
    if (!response.ok) throw new Error(`matomo_http_${response.status}`);
  }
}

export class AnalyticsProviderDispatcher {
  private readonly providers: ServerAnalyticsProvider[] = [
    new PostHogServerProvider(),
    new Ga4ServerProvider(),
    new MatomoServerProvider(),
  ];
  constructor(private readonly repository: AnalyticsRepository) {}

  enabledProviders(): ReadonlyArray<ServerAnalyticsProvider["id"]> {
    return this.providers
      .filter((provider) => provider.enabled)
      .map((provider) => provider.id);
  }

  async retryPending(limit = 100): Promise<{ processed: number }> {
    const deliveries = await this.repository.claimPendingDeliveries(limit);
    await Promise.allSettled(
      deliveries.map(({ provider, event }) =>
        this.dispatchOne(provider, event),
      ),
    );
    return { processed: deliveries.length };
  }

  private async dispatchOne(
    providerId: ServerAnalyticsProvider["id"],
    event: AnalyticsEventEnvelope,
  ): Promise<void> {
    const provider = this.providers.find(
      (candidate) => candidate.id === providerId,
    );
    if (!provider?.enabled) {
      await this.repository.recordDelivery(
        event.context.eventId,
        providerId,
        "discarded",
        "provider_disabled",
      );
      return;
    }
    try {
      await provider.capture(event);
      await this.repository.recordDelivery(
        event.context.eventId,
        provider.id,
        "delivered",
      );
    } catch (error: any) {
      const code = String(error?.message || "provider_failure").slice(0, 80);
      await this.repository
        .recordDelivery(event.context.eventId, provider.id, "failed", code)
        .catch(() => undefined);
      logger.warn("analytics_provider_delivery_failed", {
        provider: provider.id,
        eventId: event.context.eventId,
        errorCode: code,
      });
    }
  }
}
