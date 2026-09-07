import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import type { PublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import type { AnalyticsProvider } from "../analytics-provider";
import { httpClient } from "../../api/adapters/http/http-client";

export class InternalAnalyticsProvider implements AnalyticsProvider {
  readonly id = "internal" as const;
  readonly consentCategory = "analytics" as const;
  private enabled = false;

  isConfigured(config: PublicRuntimeConfig): boolean {
    return (
      config.dataMode === "api" &&
      config.analytics.mode !== "off" &&
      config.analytics.internalEnabled &&
      Boolean(config.apiBaseUrl)
    );
  }
  async initialize(config: PublicRuntimeConfig): Promise<void> {
    this.enabled = this.isConfigured(config);
  }
  capture(event: AnalyticsEventEnvelope): void {
    if (!this.enabled) return;
    void httpClient
      .post("/analytics/events", { events: [event] }, { keepalive: true })
      .catch(() => undefined);
  }
  async identify(): Promise<void> {}
  async reset(): Promise<void> {}
  async shutdown(): Promise<void> {
    this.enabled = false;
  }
}
