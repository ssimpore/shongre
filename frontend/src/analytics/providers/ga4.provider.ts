import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import type { PublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import type { AnalyticsProvider } from "../analytics-provider";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export class Ga4AnalyticsProvider implements AnalyticsProvider {
  readonly id = "ga4" as const;
  readonly consentCategory = "marketing" as const;
  private measurementId = "";

  isConfigured(config: PublicRuntimeConfig): boolean {
    return (
      config.analytics.mode !== "off" &&
      config.analytics.ga4.enabled &&
      /^G-[A-Z0-9]+$/i.test(config.analytics.ga4.measurementId)
    );
  }
  async initialize(config: PublicRuntimeConfig): Promise<void> {
    this.measurementId = config.analytics.ga4.measurementId;
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("config", this.measurementId, {
      send_page_view: false,
      allow_google_signals: false,
    });
    const script = document.createElement("script");
    script.id = "shongre-ga4";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
    document.head.appendChild(script);
  }
  capture(event: AnalyticsEventEnvelope): void {
    window.gtag?.("event", event.name, {
      ...event.properties,
      market_code: event.context.marketCode,
      country_code: event.context.countryCode,
      currency: event.context.currency,
    });
  }
  identify(userId: string): void {
    window.gtag?.("config", this.measurementId, {
      user_id: userId,
      send_page_view: false,
    });
  }
  reset(): void {
    window.gtag?.("config", this.measurementId, {
      user_id: null,
      send_page_view: false,
    });
  }
  shutdown(): void {
    window.gtag?.("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
    });
    document.getElementById("shongre-ga4")?.remove();
    this.measurementId = "";
  }
}
