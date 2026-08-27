import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import type { PostHog } from "posthog-js";
import type { PublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import type { AnalyticsProvider } from "../analytics-provider";

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  readonly id = "posthog" as const;
  readonly consentCategory = "analytics" as const;
  private client: PostHog | null = null;
  private sessionReplayEnabled = false;

  isConfigured(config: PublicRuntimeConfig): boolean {
    return (
      config.analytics.mode !== "off" &&
      config.analytics.posthog.enabled &&
      Boolean(config.analytics.posthog.key && config.analytics.posthog.host)
    );
  }
  async initialize(config: PublicRuntimeConfig): Promise<void> {
    this.sessionReplayEnabled = config.analytics.posthog.sessionReplayEnabled;
    const { default: posthog } = await import("posthog-js");
    posthog.init(config.analytics.posthog.key, {
      api_host: config.analytics.posthog.host,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        recordCrossOriginIframes: false,
      },
      person_profiles: "identified_only",
      persistence: "localStorage+cookie",
      secure_cookie: config.appEnvironment !== "local",
      loaded: (client) => client.opt_in_capturing(),
    });
    this.client = posthog;
  }
  capture(event: AnalyticsEventEnvelope): void {
    this.client?.capture(event.name, {
      ...event.properties,
      ...event.context,
    });
  }
  identify(userId: string, traits: Record<string, string>): void {
    this.client?.identify(userId, traits);
  }
  reset(): void {
    this.client?.reset(true);
  }
  setRoute(path: string): void {
    if (!this.client || !this.sessionReplayEnabled) return;
    const sensitive =
      /^\/(?:messages?|messagerie|checkout|paiement|payment|kyc|verification|compte|account)(?:\/|$)/i.test(
        path,
      );
    if (sensitive) this.client.stopSessionRecording();
    else this.client.startSessionRecording();
  }
  shutdown(): void {
    this.client?.opt_out_capturing();
    this.client?.reset(true);
    this.client = null;
    this.sessionReplayEnabled = false;
  }
}
