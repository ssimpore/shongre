import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import type { PublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import type { AnalyticsProvider } from "../analytics-provider";

declare global {
  interface Window {
    _paq?: unknown[][];
  }
}

export class MatomoAnalyticsProvider implements AnalyticsProvider {
  readonly id = "matomo" as const;
  readonly consentCategory = "analytics" as const;
  private active = false;

  isConfigured(config: PublicRuntimeConfig): boolean {
    return (
      config.analytics.mode !== "off" &&
      config.analytics.matomo.enabled &&
      Boolean(config.analytics.matomo.url && config.analytics.matomo.siteId)
    );
  }
  async initialize(config: PublicRuntimeConfig): Promise<void> {
    const base = new URL(config.analytics.matomo.url);
    const root = base.toString().replace(/\/+$/, "");
    window._paq = window._paq || [];
    window._paq.push(["requireConsent"]);
    window._paq.push(["setConsentGiven"]);
    window._paq.push(["disableCookies"]);
    window._paq.push(["setTrackerUrl", `${root}/matomo.php`]);
    window._paq.push(["setSiteId", config.analytics.matomo.siteId]);
    const script = document.createElement("script");
    script.id = "shongre-matomo";
    script.async = true;
    script.src = `${root}/matomo.js`;
    document.head.appendChild(script);
    this.active = true;
  }
  capture(event: AnalyticsEventEnvelope): void {
    if (!this.active) return;
    if (event.name === "page_viewed") {
      window._paq?.push(["setCustomUrl", event.properties.path]);
      window._paq?.push(["trackPageView"]);
      return;
    }
    window._paq?.push([
      "trackEvent",
      "Shongre",
      event.name,
      event.context.marketCode,
    ]);
  }
  identify(userId: string): void {
    window._paq?.push(["setUserId", userId]);
  }
  reset(): void {
    window._paq?.push(["resetUserId"]);
  }
  shutdown(): void {
    window._paq?.push(["forgetConsentGiven"]);
    window._paq?.push(["deleteCookies"]);
    document.getElementById("shongre-matomo")?.remove();
    this.active = false;
  }
}
