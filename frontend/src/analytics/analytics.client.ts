import {
  ANALYTICS_SCHEMA_VERSION,
  analyticsEventEnvelopeSchema,
  type AnalyticsContext,
  type AnalyticsEventEnvelope,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "@shongre/contracts/analytics";
import { getCountryConfig } from "@shongre/contracts";
import type { ConsentCategories } from "../domains/consent/consent.types";
import { consentService } from "../domains/consent/consent.service";
import { getPublicRuntimeConfig } from "../platform/runtime-config/public-runtime-config";
import type { AnalyticsProvider } from "./analytics-provider";
import { captureAttribution, clearAttribution } from "./attribution";
import { sanitizeAnalyticsProperties } from "./privacy";
import { Ga4AnalyticsProvider } from "./providers/ga4.provider";
import { InternalAnalyticsProvider } from "./providers/internal.provider";
import { MatomoAnalyticsProvider } from "./providers/matomo.provider";
import { MemoryAnalyticsProvider } from "./providers/memory.provider";
import { PostHogAnalyticsProvider } from "./providers/posthog.provider";

const ANONYMOUS_ID_KEY = "shongre_analytics_anonymous_id_v1";
const SESSION_ID_KEY = "shongre_analytics_session_id_v1";
let fallbackIdSequence = 0;

function randomId(prefix: string): string {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${(++fallbackIdSequence).toString(36)}`;
  return `${prefix}_${id}`;
}

function readOrCreate(storage: Storage, key: string, prefix: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const created = randomId(prefix);
  storage.setItem(key, created);
  return created;
}

function deviceType(): AnalyticsContext["deviceType"] {
  if (typeof window === "undefined") return "unknown";
  if (/bot|crawler|spider|headless/i.test(navigator.userAgent)) return "bot";
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1023px)").matches) return "tablet";
  return "desktop";
}

function privacySignalEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  const extended = navigator as Navigator & { globalPrivacyControl?: boolean };
  return navigator.doNotTrack === "1" || extended.globalPrivacyControl === true;
}

const france = getCountryConfig("FR")!;
const memoryProvider = new MemoryAnalyticsProvider();

function exposeDevelopmentEvent(
  event: AnalyticsEventEnvelope,
  environment: AnalyticsContext["environment"],
): void {
  if (
    typeof window === "undefined" ||
    !["local", "development", "test"].includes(environment) ||
    typeof window.CustomEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("shongre:analytics", { detail: structuredClone(event) }),
  );
}

class AnalyticsClient {
  private readonly providers: AnalyticsProvider[] = [
    memoryProvider,
    new InternalAnalyticsProvider(),
    new PostHogAnalyticsProvider(),
    new Ga4AnalyticsProvider(),
    new MatomoAnalyticsProvider(),
  ];
  private readonly active = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private ready: Promise<void> = Promise.resolve();
  private currentRoute = "/";
  private context: Pick<
    AnalyticsContext,
    | "countryCode"
    | "marketCode"
    | "locale"
    | "currency"
    | "timezone"
    | "canonicalDomain"
  > = {
    countryCode: france.code,
    marketCode: france.code,
    locale: france.defaultLocale,
    currency: france.currency,
    canonicalDomain: france.canonicalDomainMode,
  };
  private user: Pick<AnalyticsContext, "userId" | "userType"> = {};

  applyConsent(categories: ConsentCategories): Promise<void> {
    const config = getPublicRuntimeConfig();
    this.ready = (async () => {
      for (const provider of this.providers) {
        const permitted =
          categories[provider.consentCategory] &&
          (provider.consentCategory === "necessary" || !privacySignalEnabled());
        const shouldRun = permitted && provider.isConfigured(config);
        if (shouldRun && !this.active.has(provider.id)) {
          try {
            await provider.initialize(config);
            this.active.add(provider.id);
            await provider.setRoute?.(this.currentRoute);
          } catch {
            // Provider failure must never break a marketplace workflow.
          }
        } else if (!shouldRun && this.active.has(provider.id)) {
          await provider.shutdown();
          this.active.delete(provider.id);
        }
      }
      if (!categories.analytics || privacySignalEnabled())
        this.clearBrowserIdentity();
      this.notify();
    })();
    return this.ready;
  }

  setMarketContext(context: {
    country: string;
    locale: string;
    domain: string;
    market: string;
    currency: string;
    timezone?: string;
  }): void {
    this.context = {
      countryCode: context.country.toUpperCase(),
      marketCode: context.market.toUpperCase(),
      locale: context.locale,
      currency: context.currency.toUpperCase(),
      canonicalDomain: context.domain.toLowerCase(),
      timezone: context.timezone,
    };
  }

  identify(userId: string, userType: string): void {
    if (!consentService.hasConsent("analytics") || privacySignalEnabled())
      return;
    this.user = { userId, userType };
    void this.ready.then(() => {
      for (const provider of this.providers) {
        if (this.active.has(provider.id)) {
          void provider.identify(userId, {
            userType,
            marketCode: this.context.marketCode,
          });
        }
      }
    });
  }

  resetIdentity(): void {
    this.user = {};
    for (const provider of this.providers) {
      if (this.active.has(provider.id)) void provider.reset();
    }
    this.clearBrowserIdentity();
    this.notify();
  }

  setRoute(path: string): void {
    this.currentRoute = path;
    for (const provider of this.providers) {
      if (this.active.has(provider.id)) void provider.setRoute?.(path);
    }
  }

  track<Name extends AnalyticsEventName>(
    name: Name,
    properties: AnalyticsEventProperties<Name> = {} as AnalyticsEventProperties<Name>,
  ): void {
    if (!consentService.hasConsent("analytics") || privacySignalEnabled())
      return;
    const config = getPublicRuntimeConfig();
    const attribution = captureAttribution();
    let anonymousId: string | undefined;
    let sessionId: string | undefined;
    if (typeof window !== "undefined") {
      try {
        anonymousId = readOrCreate(localStorage, ANONYMOUS_ID_KEY, "anon");
        sessionId = readOrCreate(sessionStorage, SESSION_ID_KEY, "session");
      } catch {
        anonymousId = randomId("anon_ephemeral");
        sessionId = randomId("session_ephemeral");
      }
    }
    const envelope = {
      name,
      context: {
        eventId: randomId("evt"),
        timestamp: new Date().toISOString(),
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        environment: config.appEnvironment,
        platform: "web" as const,
        ...this.context,
        ...this.user,
        ...attribution,
        anonymousId,
        sessionId,
        deviceType: deviceType(),
        release: config.release,
        isTestTraffic: config.analytics.mode !== "production",
      },
      properties: sanitizeAnalyticsProperties(
        properties as Record<string, unknown>,
      ),
    };
    const parsed = analyticsEventEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) {
      if (
        config.appEnvironment === "local" ||
        config.appEnvironment === "test"
      ) {
        console.warn(
          "[Analytics] Dropped invalid event",
          name,
          parsed.error.issues,
        );
      }
      return;
    }
    const event = parsed.data as AnalyticsEventEnvelope;
    memoryProvider.capture(event);
    exposeDevelopmentEvent(event, event.context.environment);
    this.notify();
    void this.ready.then(() => {
      for (const provider of this.providers) {
        if (provider.id !== "memory" && this.active.has(provider.id)) {
          void provider.capture(event);
        }
      }
    });
  }

  recentEvents(): AnalyticsEventEnvelope[] {
    return memoryProvider.recent();
  }

  clearMemory(): void {
    memoryProvider.clear();
    this.notify();
  }

  activeProviderIds(): string[] {
    return [...this.active];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private clearBrowserIdentity(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(ANONYMOUS_ID_KEY);
      sessionStorage.removeItem(SESSION_ID_KEY);
    } catch {
      // Storage may already be unavailable.
    }
    clearAttribution();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const analyticsClient = new AnalyticsClient();
