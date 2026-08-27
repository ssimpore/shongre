import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import type { PublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import type { AnalyticsProvider } from "../analytics-provider";

export class InternalAnalyticsProvider implements AnalyticsProvider {
  readonly id = "internal" as const;
  readonly consentCategory = "analytics" as const;
  private endpoint = "";

  isConfigured(config: PublicRuntimeConfig): boolean {
    return (
      config.dataMode === "api" &&
      config.analytics.mode !== "off" &&
      config.analytics.internalEnabled &&
      Boolean(config.apiBaseUrl)
    );
  }
  async initialize(config: PublicRuntimeConfig): Promise<void> {
    this.endpoint = `${config.apiBaseUrl}/analytics/events`;
  }
  capture(event: AnalyticsEventEnvelope): void {
    if (!this.endpoint) return;
    const body = JSON.stringify({ events: [event] });
    const endpoint = new URL(this.endpoint, window.location.origin);
    if (
      typeof navigator !== "undefined" &&
      navigator.sendBeacon &&
      endpoint.origin === window.location.origin
    ) {
      const sent = navigator.sendBeacon(
        endpoint.href,
        new Blob([body], { type: "application/json" }),
      );
      if (sent) return;
    }
    void fetch(endpoint.href, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      keepalive: true,
      body,
    }).catch(() => undefined);
  }
  async identify(): Promise<void> {}
  async reset(): Promise<void> {}
  async shutdown(): Promise<void> {
    this.endpoint = "";
  }
}
