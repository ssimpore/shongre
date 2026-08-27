import type { AnalyticsEventEnvelope } from "@shongre/contracts/analytics";
import type { PublicRuntimeConfig } from "../platform/runtime-config/public-runtime-config";
import type { ConsentCategory } from "../domains/consent/consent.types";

export type AnalyticsProviderId =
  "memory" | "internal" | "posthog" | "ga4" | "matomo";

export interface AnalyticsProvider {
  readonly id: AnalyticsProviderId;
  readonly consentCategory: ConsentCategory;
  isConfigured(config: PublicRuntimeConfig): boolean;
  initialize(config: PublicRuntimeConfig): Promise<void>;
  capture(event: AnalyticsEventEnvelope): void | Promise<void>;
  identify(
    userId: string,
    traits: Record<string, string>,
  ): void | Promise<void>;
  reset(): void | Promise<void>;
  setRoute?(path: string): void | Promise<void>;
  shutdown(): void | Promise<void>;
}
