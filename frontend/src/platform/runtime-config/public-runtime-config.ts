import type { AppEnvironment } from "@shongre/contracts/environment";

export type PublicDataMode = "demo" | "api";

export interface PublicRuntimeConfig {
  appEnvironment: AppEnvironment;
  environmentId: string;
  franceUrl: string;
  internationalUrl: string;
  apiBaseUrl: string;
  dataMode: PublicDataMode;
  mockStorageEnabled: boolean;
  stripePublishableKey: string;
  release: string;
  externalLinks: {
    appStore: string;
    googlePlay: string;
    instagram: string;
    facebook: string;
    linkedin: string;
    youtube: string;
  };
}

declare global {
  interface Window {
    __SHONGRE_RUNTIME_CONFIG__?: PublicRuntimeConfig;
  }
}

function nodeEnvironmentValue(name: string): string {
  if (typeof process === "undefined") return "";
  return process.env[name] ?? "";
}

function nodeFallback(): PublicRuntimeConfig {
  const appEnvironment = nodeEnvironmentValue("NEXT_PUBLIC_APP_ENV");
  const dataMode = nodeEnvironmentValue("NEXT_PUBLIC_DATA_MODE") || "demo";
  if (dataMode !== "demo" && dataMode !== "api") {
    throw new Error(
      `[Runtime Config] Invalid data mode "${dataMode}". Expected demo or api.`,
    );
  }

  return {
    appEnvironment: appEnvironment as AppEnvironment,
    environmentId: nodeEnvironmentValue("NEXT_PUBLIC_ENVIRONMENT_ID"),
    franceUrl: nodeEnvironmentValue("NEXT_PUBLIC_FR_URL"),
    internationalUrl: nodeEnvironmentValue("NEXT_PUBLIC_INTL_URL"),
    apiBaseUrl: nodeEnvironmentValue("NEXT_PUBLIC_API_URL"),
    dataMode,
    mockStorageEnabled:
      nodeEnvironmentValue("NEXT_PUBLIC_ENABLE_MOCK_STORAGE") !== "false",
    stripePublishableKey: nodeEnvironmentValue(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ),
    release: nodeEnvironmentValue("RELEASE_SHA") || "unreleased",
    externalLinks: {
      appStore: nodeEnvironmentValue("NEXT_PUBLIC_APP_STORE_URL"),
      googlePlay: nodeEnvironmentValue("NEXT_PUBLIC_GOOGLE_PLAY_URL"),
      instagram: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL"),
      facebook: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_FACEBOOK_URL"),
      linkedin: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_LINKEDIN_URL"),
      youtube: nodeEnvironmentValue("NEXT_PUBLIC_SOCIAL_YOUTUBE_URL"),
    },
  };
}

/**
 * Browser configuration is injected into the initial HTML by the server. The
 * Node fallback exists only for unit tests and server-side module evaluation;
 * deployed browser bundles never own environment-specific values.
 */
export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window !== "undefined") {
    const config = window.__SHONGRE_RUNTIME_CONFIG__;
    if (!config) {
      throw new Error(
        "[Runtime Config] window.__SHONGRE_RUNTIME_CONFIG__ was not injected.",
      );
    }
    return config;
  }
  return nodeFallback();
}
